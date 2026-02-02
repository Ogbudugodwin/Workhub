import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const CustomerManager = ({ searchQuery }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [csvData, setCsvData] = useState([]);
    const [mapping, setMapping] = useState({
        email: '',
        firstName: '',
        lastName: '',
        signUpDate: '',
        tags: ''
    });
    const [newCustomer, setNewCustomer] = useState({ email: '', name: '', tags: '' });
    const [editingCustomer, setEditingCustomer] = useState(null);
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const API_URL = "http://localhost:5000/api";

    const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
    const [segmentName, setSegmentName] = useState('');

    const handleCreateSegment = async (e) => {
        e.preventDefault();
        try {
            const selectedCustomers = customers.filter(c => selectedIds.includes(c.id));
            const response = await fetch(`${API_URL}/email-marketing/lists`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
                body: JSON.stringify({
                    name: segmentName,
                    emails: selectedCustomers.map(c => ({
                        email: c.email,
                        name: c.name,
                        tags: c.tags,
                        source: 'Marketing'
                    }))
                })
            });
            if (response.ok) {
                alert('Segment created successfully!');
                setIsSegmentModalOpen(false);
                setSegmentName('');
                setSelectedIds([]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        if (!currentUser?.uid) return;
        try {
            const response = await fetch(`${API_URL}/email-marketing/customers`, {
                headers: { 'x-user-uid': currentUser.uid }
            });
            if (response.ok) {
                const data = await response.json();
                setCustomers(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Fetch customers error:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.email.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
        (customer.name && customer.name.toLowerCase().includes(searchQuery?.toLowerCase() || '')) ||
        (customer.tags && customer.tags.some(tag => tag.toLowerCase().includes(searchQuery?.toLowerCase() || '')))
    );

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCustomers.map(c => c.id));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const data = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    return headers.reduce((obj, header, index) => {
                        obj[header] = values[index];
                        return obj;
                    }, {});
                });
                setCsvHeaders(headers);
                setCsvData(data);

                // Auto-map if headers match
                const newMapping = { ...mapping };
                headers.forEach(h => {
                    const low = h.toLowerCase();
                    if (low.includes('email')) newMapping.email = h;
                    if (low.includes('first') || low.includes('fname')) newMapping.firstName = h;
                    if (low.includes('last') || low.includes('lname')) newMapping.lastName = h;
                    if (low.includes('date') || low.includes('sign')) newMapping.signUpDate = h;
                    if (low.includes('tag') || low.includes('category')) newMapping.tags = h;
                });
                setMapping(newMapping);
                setImportStep(2);
            }
        };
        reader.readAsText(file);
    };

    const handleImportSubmit = async () => {
        setLoading(true);
        let successCount = 0;
        for (const row of csvData) {
            const email = row[mapping.email];
            if (!email) continue;

            const firstName = mapping.firstName ? row[mapping.firstName] : '';
            const lastName = mapping.lastName ? row[mapping.lastName] : '';
            const fullName = `${firstName} ${lastName}`.trim();
            const tags = mapping.tags ? row[mapping.tags] : '';

            try {
                const response = await fetch(`${API_URL}/email-marketing/customers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-uid': currentUser?.uid
                    },
                    body: JSON.stringify({
                        email,
                        name: fullName || email.split('@')[0],
                        tags: tags ? tags.split(',').map(t => t.trim()) : ['CSV Import']
                    })
                });
                if (response.ok) successCount++;
            } catch (err) {
                console.error(err);
            }
        }
        setIsImportModalOpen(false);
        setImportStep(1);
        fetchCustomers();
        alert(`Successfully imported ${successCount} contacts.`);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        const isEditing = !!editingCustomer;
        const url = isEditing
            ? `${API_URL}/email-marketing/customers/${editingCustomer.id}`
            : `${API_URL}/email-marketing/customers`;

        try {
            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
                body: JSON.stringify({
                    ...newCustomer,
                    tags: typeof newCustomer.tags === 'string' ? newCustomer.tags.split(',').map(t => t.trim()).filter(t => t) : newCustomer.tags
                })
            });
            if (response.ok) {
                fetchCustomers();
                setIsManualModalOpen(false);
                setNewCustomer({ email: '', name: '', tags: '' });
                setEditingCustomer(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = () => {
        if (customers.length === 0) return;
        const headers = ['Email', 'Name', 'Status', 'Tags'];
        const csvContent = [
            headers.join(','),
            ...customers.map(c => [
                c.email,
                `"${c.name || ''}"`,
                'Subscribed',
                `"${(c.tags || []).join(', ')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "audience_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this contact?")) return;
        try {
            await fetch(`${API_URL}/email-marketing/customers/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-uid': currentUser?.uid }
            });
            fetchCustomers();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="emd-content">
            <div className="emd-audience-header">
                <h2 className="emd-audience-title">Audience Management</h2>
                <div className="emd-btn-group">
                    <button className="emd-btn-primary" onClick={() => setIsImportModalOpen(true)}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Import Contacts
                    </button>
                    <button className="emd-btn-secondary" onClick={() => { setEditingCustomer(null); setNewCustomer({ email: '', name: '', tags: '' }); setIsManualModalOpen(true); }}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        Add Contact
                    </button>
                    <button
                        className="emd-btn-secondary"
                        onClick={() => setIsSegmentModalOpen(true)}
                        disabled={selectedIds.length === 0}
                        style={{ opacity: selectedIds.length === 0 ? 0.5 : 1, cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Create Segment
                    </button>
                    <button className="emd-btn-secondary" onClick={handleExport}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export
                    </button>
                    <button className="emd-btn-secondary" title="More Options">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                        Options
                    </button>
                </div>
            </div>

            <div className="emd-full-card">
                <table className="emd-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Tags</th>
                            <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id} className={selectedIds.includes(customer.id) ? 'bg-blue-50/30' : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(customer.id)}
                                        onChange={() => toggleSelectOne(customer.id)}
                                    />
                                </td>
                                <td className="emd-campaign-name">{customer.email}</td>
                                <td>{customer.name || '-'}</td>
                                <td>
                                    <div className="emd-status-pill">
                                        <div className="emd-status-dot-green">✓</div>
                                        Subscribed
                                    </div>
                                </td>
                                <td>
                                    <div className="flex gap-2">
                                        {(customer.tags || []).slice(0, 2).map((tag, i) => (
                                            <span key={i} className="emd-tag-pill">{tag}</span>
                                        ))}
                                        {customer.tags?.length > 2 && <span className="emd-tag-pill">+{customer.tags.length - 2}</span>}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="emd-btn-icon"
                                            style={{ width: 'auto', height: '32px', border: '1px solid #dbeafe', background: '#eff6ff', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '11px', fontWeight: 'bold' }}
                                            onClick={() => {
                                                setEditingCustomer(customer);
                                                setNewCustomer({
                                                    email: customer.email,
                                                    name: customer.name || '',
                                                    tags: (customer.tags || []).join(', ')
                                                });
                                                setIsManualModalOpen(true);
                                            }}
                                            title="Edit Contact"
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            Edit
                                        </button>
                                        <button
                                            className="emd-btn-icon"
                                            style={{ width: 'auto', height: '32px', border: '1px solid #fee2e2', background: '#fef2f2', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#e11d48', fontSize: '11px', fontWeight: 'bold' }}
                                            onClick={() => handleDelete(customer.id)}
                                            title="Delete Contact"
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center py-20 text-gray-400">
                                    No contacts found. Click "Import Contacts" or <button className="text-blue-600 font-bold" onClick={() => setIsManualModalOpen(true)}>Add One Manually</button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="emd-modal-overlay">
                    <div className="emd-modal-container">
                        <div className="emd-modal-header">
                            <h3 className="emd-card-title">Import Contacts</h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="emd-modal-body">
                            <div className="emd-step-indicator">
                                <div className={`emd-step ${importStep === 1 ? 'active' : ''}`}>
                                    <span className="emd-step-num">1</span> Upload File
                                </div>
                                <div className={`emd-step ${importStep === 2 ? 'active' : ''}`}>
                                    <span className="emd-step-num">2</span> Field Mapping
                                </div>
                                <div className={`emd-step ${importStep === 3 ? 'active' : ''}`}>
                                    <span className="emd-step-num">3</span> Review & Import
                                </div>
                            </div>

                            {importStep === 1 && (
                                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all" onClick={() => fileInputRef.current.click()}>
                                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className="text-gray-600 font-semibold">Click to upload or drag and drop</p>
                                    <p className="text-gray-400 text-xs mt-1">CSV files only</p>
                                    <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileUpload} />
                                </div>
                            )}

                            {importStep === 2 && (
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2">Field Mapping</h4>
                                    <p className="text-sm text-gray-500 mb-6">Match the columns from your CSV file to the contact fields.</p>
                                    <table className="emd-mapping-table">
                                        <thead>
                                            <tr>
                                                <th>CSV Column</th>
                                                <th>Contact Field</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.keys(mapping).map(field => (
                                                <tr key={field}>
                                                    <td className="text-sm font-medium text-gray-700">{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}</td>
                                                    <td>
                                                        <select
                                                            className="emd-mapping-select"
                                                            value={mapping[field]}
                                                            onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                                        >
                                                            <option value="">Select Field</option>
                                                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {importStep === 3 && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">Ready to Import</h4>
                                    <p className="text-gray-500">We found <span className="font-bold text-gray-900">{csvData.length}</span> contacts to import.</p>
                                </div>
                            )}
                        </div>
                        <div className="emd-modal-footer">
                            <button className="emd-btn-secondary" onClick={() => importStep > 1 ? setImportStep(importStep - 1) : setIsImportModalOpen(false)}>
                                {importStep === 1 ? 'Cancel' : 'Back'}
                            </button>
                            <button className="emd-btn-primary" onClick={() => importStep < 3 ? setImportStep(importStep + 1) : handleImportSubmit()}>
                                {importStep === 3 ? 'Import Now' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Segment Modal */}
            {isSegmentModalOpen && (
                <div className="emd-modal-overlay">
                    <div className="emd-modal-container" style={{ maxWidth: '500px' }}>
                        <div className="emd-modal-header">
                            <h3 className="emd-card-title">Create New Segment</h3>
                            <button onClick={() => setIsSegmentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateSegment}>
                            <div className="emd-modal-body bg-slate-50 p-6 rounded-xl mb-4">
                                <p className="text-sm text-gray-500 mb-4">Create a new segment containing the <span className="font-bold text-indigo-600">{selectedIds.length}</span> selected contacts.</p>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Segment Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="emd-mapping-select"
                                        value={segmentName}
                                        onChange={e => setSegmentName(e.target.value)}
                                        placeholder="e.g. VIP Customers 2024"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="emd-modal-footer">
                                <button type="button" className="emd-btn-secondary" onClick={() => setIsSegmentModalOpen(false)}>Cancel</button>
                                <button type="submit" className="emd-btn-primary">Create Segment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manual Add Modal */}
            {isManualModalOpen && (
                <div className="emd-modal-overlay">
                    <div className="emd-modal-container" style={{ maxWidth: '500px' }}>
                        <div className="emd-modal-header">
                            <h3 className="emd-card-title">{editingCustomer ? 'Edit Contact' : 'Add Contact Manually'}</h3>
                            <button onClick={() => { setIsManualModalOpen(false); setEditingCustomer(null); setNewCustomer({ email: '', name: '', tags: '' }); }} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleManualSubmit}>
                            <div className="emd-modal-body space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                                    <input required type="email" outline="none" className="emd-mapping-select" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="jane.doe@example.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                                    <input type="text" className="emd-mapping-select" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Jane Doe" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tags (Comma separated)</label>
                                    <input type="text" className="emd-mapping-select" value={newCustomer.tags} onChange={e => setNewCustomer({ ...newCustomer, tags: e.target.value })} placeholder="VIP, Customer" />
                                </div>
                            </div>
                            <div className="emd-modal-footer">
                                <button type="button" className="emd-btn-secondary" onClick={() => { setIsManualModalOpen(false); setEditingCustomer(null); setNewCustomer({ email: '', name: '', tags: '' }); }}>Cancel</button>
                                <button type="submit" className="emd-btn-primary">{editingCustomer ? 'Update Contact' : 'Add Contact'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManager;
