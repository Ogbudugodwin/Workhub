import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { addCategory, deleteCategory, updateCategory } from '../../services/job.service';
import { useAuth } from '../../context/AuthContext';
import { useCategoryStats } from '../../useCategoryStats';


// Utility to check if user has a specific privilege
const hasPrivilege = (user, privilege) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true; // Super admin has all privileges
    return (user.privileges || []).includes(privilege);
};

const CategoryManager = () => {
    const { currentUser, userData } = useAuth(); // Get auth user
    const { stats: categories, loading, error, refreshStats } = useCategoryStats(); // Use the hook
    const [newCategory, setNewCategory] = useState({ name: '', icon: null });
    const [editingCategory, setEditingCategory] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', icon: null });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // No need for useEffect to loadCategories initially, useCategoryStats handles it.
    // Error handling from useCategoryStats can be used here if needed.

    const canManage = hasPrivilege(userData, 'manage_categories');

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCategory.name || !newCategory.icon) return;

        setIsSubmitting(true);
        try {
            await addCategory(newCategory);
            setNewCategory({ name: '', icon: null });
            // Reset file input
            e.target.reset();
            refreshStats(); // Refresh list after adding
        } catch (error) {
            console.error("Failed to add category", error);
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;

        try {
            await deleteCategory(id);
            refreshStats(); // Refresh list after deleting
        } catch (error) {
            console.error("Failed to delete category", error);
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category.id);
        setEditForm({ name: category.name, icon: null }); // Don't pre-set file
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editForm.name) return;

        setIsSubmitting(true);
        try {
            const updates = { name: editForm.name };
            if (editForm.icon) updates.icon = editForm.icon;

            await updateCategory(editingCategory, updates);
            setEditingCategory(null);
            refreshStats(); // Refresh list after updating
        } catch (error) {
            console.error("Failed to update category", error);
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const cancelEdit = () => {
        setEditingCategory(null);
        setEditForm({ name: '', icon: null });
    };

    if (loading) return <div className="loading-spinner">Loading...</div>;
    // Optionally display error from useCategoryStats
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="category-manager">
            <div className="manager-header">
                <h3>Manage Categories</h3>
                <p>Add, edit, or remove job categories visible on the home page.</p>
            </div>

            {/* Editing Category Form */}
            {editingCategory && (
                <div className="edit-category-overlay">
                    <div className="edit-category-modal">
                        <h4>Edit Category</h4>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label>Category Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Update Icon (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.files[0] })}
                                    className="file-input"
                                />
                                <small>Leave empty to keep existing icon</small>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={cancelEdit} className="btn-cancel">Cancel</button>
                                <button type="submit" className="btn-save" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Category Form - Only show if has manage permission */}
            {canManage && !editingCategory && (
                <form className="add-category-form" onSubmit={handleAdd}>
                    <div className="form-row">
                        <input
                            type="text"
                            placeholder="Category Name (e.g., AI & ML)"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            required
                        />
                        <div className="file-input-wrapper">
                            <label className="file-label">
                                {newCategory.icon ? newCategory.icon.name : 'Upload Icon'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.files[0] })}
                                    required
                                />
                            </label>
                        </div>
                        <button type="submit" className="btn-add" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Category'}
                        </button>
                    </div>
                </form>
            )}

            {/* Category List */}
            <div className="category-grid-admin">
                {categories.map((cat) => (
                    <div key={cat.id} className="category-item-admin">
                        <div className="cat-info">
                            <Link
                                to={`/dashboard/posts?category=${encodeURIComponent(cat.id)}`}
                                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                title="View jobs in this category"
                            >
                                <span className="cat-icon-container">
                                    <img
                                        src={cat.icon.startsWith('http') ? cat.icon : `http://localhost:5000${cat.icon}`}
                                        alt={cat.name}
                                        className="cat-img"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/40?text=?';
                                        }}
                                    />
                                </span>
                                <span className="cat-name">{cat.name}</span>
                                <span className="cat-count">({cat.count} {cat.count === 1 ? 'job' : 'jobs'})</span>
                            </Link>
                        </div>
                        {canManage && (
                            <div className="cat-actions">
                                <button
                                    className="btn-edit-inline"
                                    onClick={() => handleEdit(cat)}
                                    title="Edit Category"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="btn-delete-inline"
                                    onClick={() => handleDelete(cat.id)}
                                    title="Delete Category"
                                >
                                    🗑️
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryManager;
