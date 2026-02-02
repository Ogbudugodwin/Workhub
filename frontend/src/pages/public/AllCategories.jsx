import React from 'react';
import { useCategoryStats } from '../../useCategoryStats';
import CategoryCard from '../../components/CategoryCard';

export default function AllCategories() {
    const { stats: categories, loading, error } = useCategoryStats();

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading categories...</div>;
    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>;

    return (
        <div style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 className="section-title">All Job Categories</h1>
            <div className="categories-grid">
                {categories.map((cat) => (
                    <CategoryCard key={cat.id} category={cat} />
                ))}
            </div>
        </div>
    );
}
