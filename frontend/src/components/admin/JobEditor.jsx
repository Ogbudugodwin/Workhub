import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createJob, updateJob, fetchCategories, getJobById } from '../../services/job.service';
import { useAuth } from '../../context/AuthContext';

const JobEditor = () => {
    const { id } = useParams();
    const isEditMode = !!id;
    const navigate = useNavigate();
    const { currentUser, userData } = useAuth();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        location: '',
        type: 'Full-time',
        categoryId: '',
        salary: '',
        description: '',
        requirements: '',
        // SEO Fields
        slug: '',
        seoTitle: '',
        focusKeyphrase: '',
        metaDescription: '',
        keyphraseSynonyms: '',
    });

    useEffect(() => {
        const init = async () => {
            if (!currentUser) return;

            setLoading(true);
            try {
                const cats = await fetchCategories();
                setCategories(cats);

                if (isEditMode) {
                    const job = await getJobById(id, currentUser.uid);
                    if (job) {
                        setFormData({
                            ...job,
                            categoryId: job.categoryId || '',
                            requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : job.requirements || '',
                            keyphraseSynonyms: Array.isArray(job.keyphraseSynonyms) ? job.keyphraseSynonyms.join(', ') : job.keyphraseSynonyms || '',
                        });
                    }
                }
            } catch (err) {
                console.error("Editor Init Error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id, isEditMode, currentUser]);

    const generateSlug = (text) => {
        return text
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    };

    const handleChange = (e) => {
        const { id, value, name, type } = e.target;
        const key = type === 'radio' ? name : id;
        setFormData(prev => {
            const newData = { ...prev, [key]: value };

            // Auto-generate slug and SEO title IF changing the title
            if (id === 'title') {
                newData.slug = generateSlug(value);
                newData.seoTitle = `${value} | WorkHub Jobs`;
            }

            return newData;
        });
    };

    // Text Insertion Helper
    const insertTag = (startTag, endTag = '') => {
        const textarea = document.getElementById('description');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selection = text.substring(start, end);

        const replacement = startTag + selection + endTag;

        const newText = text.substring(0, start) + replacement + text.substring(end);

        setFormData(prev => ({ ...prev, description: newText }));

        // Restore selection/focus (async needed for React state update)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + startTag.length, end + startTag.length);
        }, 0);
    };

    const handleLink = () => {
        const url = prompt("Enter URL:", "http://");
        if (url) {
            insertTag(`<a href="${url}" target="_blank">`, '</a>');
        }
    };

    const handleSave = async (status = null) => {
        // Validation for publish
        if (!status && (!formData.title || !formData.categoryId || !formData.location || !formData.description)) {
            alert("Please fill in all required fields (Title, Category, Location, Description)");
            return;
        }

        setSaving(true);

        const payload = {
            ...formData,
            status: status || (isEditMode ? undefined : 'pending'), // If explicit status (draft), use it. Else default rules.
            requirements: typeof formData.requirements === 'string'
                ? formData.requirements.split('\n').filter(r => r.trim())
                : formData.requirements,
            keyphraseSynonyms: typeof formData.keyphraseSynonyms === 'string'
                ? formData.keyphraseSynonyms.split(',').map(s => s.trim()).filter(s => s)
                : formData.keyphraseSynonyms,
            companyName: userData?.role === 'company_admin' ? userData.name : 'Individual'
        };

        try {
            if (isEditMode) {
                await updateJob(id, payload, currentUser.uid);
            } else {
                await createJob(payload, currentUser.uid);
            }
            if (status === 'draft') {
                alert("Draft Saved Successfully!");
            } else {
                navigate('/dashboard/posts');
            }
        } catch (err) {
            console.error("Submit Error:", err);
            alert("Error: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        handleSave(); // Default save (publish/pending)
    };

    const handleSaveDraft = (e) => {
        e.preventDefault();
        // save with 'draft' status
        handleSave('draft');
    };

    // Simple Preview: We just show a modal with the content
    const [showPreview, setShowPreview] = useState(false);

    const handlePreview = (e) => {
        e.preventDefault();
        setShowPreview(true);
    };

    if (loading) return <div className="wp-loading">Loading editor...</div>;

    return (
        <div className="wp-editor-wrapper">
            <div className="wp-editor-header">
                <h1>{isEditMode ? 'Edit Job' : 'Add New Job'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="wp-editor-container">
                <div className="wp-editor-main">
                    {/* Title Input */}
                    <div className="wp-title-section">
                        <input
                            type="text"
                            id="title"
                            className="wp-title-input"
                            placeholder="Enter title here"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                        <div className="wp-permalink">
                            <strong>Permalink:</strong> http://workhub.com/job/
                            <input
                                type="text"
                                id="slug"
                                className="wp-slug-input"
                                value={formData.slug}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Description Area (Classic Editor Look) */}
                    <div className="wp-postbox">
                        <div className="wp-postbox-header">Job Description</div>
                        <div className="wp-editor-toolbar">
                            <span>Add Media</span>
                            <div className="toolbar-buttons" style={{ display: 'flex', gap: '5px' }}>
                                <button type="button" onClick={() => insertTag('<b>', '</b>')} style={{ fontWeight: 'bold' }}>B</button>
                                <button type="button" onClick={() => insertTag('<i>', '</i>')} style={{ fontStyle: 'italic' }}>I</button>
                                <button type="button" onClick={() => insertTag('<u>', '</u>')} style={{ textDecoration: 'underline' }}>U</button>
                                <button type="button" onClick={handleLink}>🔗</button>
                            </div>
                        </div>
                        <textarea
                            id="description"
                            className="wp-editor-textarea"
                            value={formData.description}
                            onChange={handleChange}
                            required
                        ></textarea>
                        <div className="wp-word-count">Word count: {formData.description ? formData.description.split(/\s+/).filter(x => x).length : 0}</div>
                    </div>

                    {/* Requirements Meta Box */}
                    <div className="wp-postbox">
                        <div className="wp-postbox-header">Job Requirements</div>
                        <div className="wp-postbox-content">
                            <p className="description" style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Enter each requirement on a new line.</p>
                            <textarea
                                id="requirements"
                                className="wp-meta-textarea"
                                value={formData.requirements}
                                onChange={handleChange}
                                placeholder="e.g. 5+ years React experience"
                                style={{ width: '100%', height: '100px', border: '1px solid #ddd', padding: '10px' }}
                            ></textarea>
                        </div>
                    </div>

                    {/* SEO Meta Box (Yoast Style) */}
                    <div className="wp-postbox yoast-seo">
                        <div className="wp-postbox-header">Yoast SEO</div>
                        <div className="wp-postbox-content">
                            <div className="yoast-tabs" style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
                                <div className="yoast-tab active" style={{ padding: '10px 15px', borderBottom: '3px solid #667eea', fontWeight: '600' }}>SEO</div>
                                <div className="yoast-tab" style={{ padding: '10px 15px' }}>Readability</div>
                                <div className="yoast-tab" style={{ padding: '10px 15px' }}>Social</div>
                            </div>

                            <div className="yoast-panel">
                                <h5>Google Preview</h5>
                                <div className="seo-preview-box" style={{ background: '#f0f0f1', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
                                    <div className="preview-url" style={{ color: '#202124', fontSize: '12px' }}>workhub.com › job › {formData.slug}</div>
                                    <div className="preview-title" style={{ color: '#1a0dab', fontSize: '18px' }}>{formData.seoTitle || formData.title}</div>
                                    <div className="preview-desc" style={{ color: '#4d5156', fontSize: '14px' }}>
                                        {formData.metaDescription || 'Please provide a meta description by editing the snippet below...'}
                                    </div>
                                </div>

                                <div className="yoast-field-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>SEO Title</label>
                                    <input type="text" id="seoTitle" value={formData.seoTitle} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} />
                                </div>

                                <div className="yoast-field-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Meta Description</label>
                                    <textarea
                                        id="metaDescription"
                                        value={formData.metaDescription}
                                        onChange={handleChange}
                                        maxLength="160"
                                        style={{ width: '100%', height: '80px', padding: '8px', border: '1px solid #ddd' }}
                                    ></textarea>
                                    <div className="char-count" style={{ textAlign: 'right', fontSize: '11px' }}>{formData.metaDescription.length}/160</div>
                                </div>

                                <div className="yoast-field-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Focus keyphrase</label>
                                    <input
                                        type="text"
                                        id="focusKeyphrase"
                                        value={formData.focusKeyphrase}
                                        onChange={handleChange}
                                        placeholder="e.g. Remote React Jobs"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                <div className="yoast-field-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Keyphrase synonyms</label>
                                    <input
                                        type="text"
                                        id="keyphraseSynonyms"
                                        value={formData.keyphraseSynonyms}
                                        onChange={handleChange}
                                        placeholder="Separate with commas"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="wp-editor-sidebar">
                    {/* Publish Box */}
                    <div className="wp-postbox publish-box">
                        <div className="wp-postbox-header">Publish</div>
                        <div className="wp-postbox-content">
                            <div className="publish-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <button type="button" className="btn-save-draft" onClick={handleSaveDraft}>Save Draft</button>
                                <button type="button" className="btn-preview" onClick={handlePreview}>Preview</button>
                            </div>
                            <ul className="publish-info" style={{ listStyle: 'none', padding: 0, fontSize: '13px' }}>
                                <li style={{ marginBottom: '5px' }}><span>Status:</span> <strong>{formData.status || 'Draft'}</strong> <a href="#" style={{ color: '#0073aa' }}>Edit</a></li>
                                <li style={{ marginBottom: '5px' }}><span>Visibility:</span> <strong>Public</strong> <a href="#" style={{ color: '#0073aa' }}>Edit</a></li>
                                <li style={{ marginBottom: '5px' }}><span>Publish:</span> <strong>immediately</strong> <a href="#" style={{ color: '#0073aa' }}>Edit</a></li>
                            </ul>
                        </div>
                        <div className="wp-postbox-footer" style={{ padding: '10px', background: '#f6f7f7', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <a href="#" className="delete-link" style={{ color: '#a00', fontSize: '13px' }}>Move to Trash</a>
                            <button type="submit" className="btn-publish" disabled={saving} style={{ background: '#0073aa', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '3px', cursor: 'pointer' }}>
                                {saving ? 'Working...' : (isEditMode ? 'Update' : 'Publish')}
                            </button>
                        </div>
                    </div>

                    {/* Categories Box */}
                    <div className="wp-postbox">
                        <div className="wp-postbox-header">Categories</div>
                        <div className="wp-postbox-content">
                            <div className="wp-category-checker" style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '5px' }}>
                                {categories.map(cat => (
                                    <label key={cat.id} htmlFor={`category-${cat.id}`} className="cat-check" style={{ display: 'block', fontSize: '13px' }}>
                                        <input
                                            type="radio"
                                            id={`category-${cat.id}`}
                                            name="categoryId"
                                            value={cat.id}
                                            checked={formData.categoryId === cat.id}
                                            onChange={handleChange}
                                        /> {cat.name}
                                    </label>
                                ))}
                            </div>
                            <a href="#" className="add-new-cat" style={{ fontSize: '13px', color: '#0073aa' }}>+ Add New Category</a>
                        </div>
                    </div>

                    {/* Job Details Box */}
                    <div className="wp-postbox">
                        <div className="wp-postbox-header">Job Metadata</div>
                        <div className="wp-postbox-content">
                            <div className="side-field" style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600' }}>Location</label>
                                <input type="text" id="location" value={formData.location} onChange={handleChange} required style={{ width: '100%', border: '1px solid #ddd' }} />
                            </div>
                            <div className="side-field" style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600' }}>Salary</label>
                                <input type="text" id="salary" value={formData.salary} onChange={handleChange} style={{ width: '100%', border: '1px solid #ddd' }} />
                            </div>
                            <div className="side-field">
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600' }}>Job Type</label>
                                <select id="type" value={formData.type} onChange={handleChange} style={{ width: '100%', border: '1px solid #ddd' }}>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Remote">Remote</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* PREVIEW MODAL */}
            {showPreview && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        width: '90%', height: '90%', background: 'white',
                        overflow: 'auto', padding: '20px', borderRadius: '8px',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setShowPreview(false)}
                            style={{
                                position: 'absolute', top: '10px', right: '10px',
                                background: '#d00', color: 'white', border: 'none',
                                padding: '5px 10px', cursor: 'pointer', borderRadius: '4px'
                            }}
                        >
                            Close Preview
                        </button>

                        {/* Mock Job Detail Display */}
                        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '20px' }}>
                            <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                                <span style={{ background: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>PREVIEW MODE</span>
                                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{formData.title || 'Untitled Job'}</h1>
                                <div style={{ color: '#666' }}>
                                    <span>{userData?.name || 'Company Name'}</span> • <span>{formData.location}</span> • <span>{formData.type}</span>
                                </div>
                            </div>

                            <div style={{ lineHeight: '1.6', fontSize: '16px' }} dangerouslySetInnerHTML={{ __html: formData.description }}></div>

                            {formData.requirements && (
                                <div style={{ marginTop: '30px' }}>
                                    <h3>Requirements:</h3>
                                    <ul>
                                        {formData.requirements.split('\n').map((req, i) => (
                                            <li key={i}>{req}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobEditor;
