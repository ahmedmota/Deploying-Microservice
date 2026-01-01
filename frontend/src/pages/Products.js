import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI, categoriesAPI } from '../services/api';
import './Products.css';

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesAPI.getAll();
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedCategory) params.categoryId = selectedCategory;
        if (search) params.search = search;

        const response = await productsAPI.getAll(params);
        setProducts(response.data.products || response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    fetchProducts();
  }, [selectedCategory, search]);

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="products-page">
      <h1>Products</h1>

      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <p>No products found</p>
      ) : (
        <div className="grid grid-3">
          {products.map((product) => (
            <div key={product.id} className="card product-card">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="product-image" />
              )}
              <h3>{product.name}</h3>
              <p className="product-price">${parseFloat(product.price).toFixed(2)}</p>
              <p className="product-stock">Stock: {product.stock}</p>
              <Link to={`/products/${product.id}`} className="btn btn-primary">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Products;
