import React from 'react';
import { Link } from 'react-router-dom';

export default function CategoryCard({ category }) {
    const isImagePath = typeof category.icon === 'string' && (category.icon.startsWith('/') || category.icon.startsWith('http'));

    return (
        <Link to={`/categories/${category.name}`} className="category-card-link">
            <div className="category-card">
                <div className="category-icon">
                    {isImagePath ? (
                        <img
                            src={category.icon.startsWith('http') ? category.icon : `http://localhost:5000${category.icon}`}
                            alt={category.name}
                            className="category-card-img"
                        />
                    ) : (
                        category.icon
                    )}
                </div>
                <div className="category-info">
                    <h3>{category.name}</h3>
                    <p className="category-count">{category.count} {category.count === 1 ? 'job' : 'jobs'}</p>
                </div>
            </div>
        </Link>
    );
}
