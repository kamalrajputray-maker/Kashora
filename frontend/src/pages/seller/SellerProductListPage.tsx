import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sellerProductAPI, catalogAPI, Product, PaginatedResponse } from '../../services/api';
import '../../styles/seller.css';

const badgeClass = (val: string) => `badge badge-${val.toLowerCase()}`;

const SellerProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ count: 0, next: null as string | null, previous: null as string | null, page: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const fetchProducts = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await sellerProductAPI.list({
        search, status: statusFilter, approval_status: approvalFilter,
        category: categoryFilter, page,
      });
      const data = resp.data as PaginatedResponse<Product>;
      setProducts(data.results);
      setPagination({ count: data.count, next: data.next, previous: data.previous, page });
    } catch {
      setError('Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, approvalFilter, categoryFilter]);

  useEffect(() => {
    catalogAPI.listCategories().then(r => setCategories(r.data));
  }, []);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await sellerProductAPI.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Delete failed. Please try again.');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await sellerProductAPI.submit(id);
      fetchProducts(pagination.page);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Submit failed.');
    }
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>📦 My Products</h1>
        <Link to="/seller/products/create" className="btn btn-primary">+ New Product</Link>
      </div>

      {/* Filters */}
      <div className="products-filters">
        <input
          type="text" placeholder="🔍 Search name, brand…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}>
          <option value="">All Approvals</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {isLoading ? (
        <div className="loading-container">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No products yet</h3>
          <p>Start by adding your first product to your store.</p>
          <Link to="/seller/products/create" className="btn btn-primary">Add First Product</Link>
        </div>
      ) : (
        <>
          <table className="product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="product-name-cell">
                      {p.name}
                      <small>{p.brand} · {p.slug}</small>
                    </div>
                  </td>
                  <td>{p.category_name}</td>
                  <td>₹{Number(p.base_price).toFixed(2)}</td>
                  <td><span className={badgeClass(p.status)}>{p.status}</span></td>
                  <td><span className={badgeClass(p.approval_status)}>{p.approval_status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to={`/seller/products/${p.id}`} className="btn btn-sm btn-secondary">View</Link>
                      <Link to={`/seller/products/${p.id}/edit`} className="btn btn-sm btn-primary">Edit</Link>
                      {p.approval_status !== 'PENDING' && p.approval_status !== 'APPROVED' && (
                        <button className="btn btn-sm btn-success" onClick={() => handleSubmit(p.id)}>Submit</button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination-bar">
            <button className="btn btn-secondary btn-sm" disabled={!pagination.previous}
              onClick={() => fetchProducts(pagination.page - 1)}>← Prev</button>
            <span>Page {pagination.page} · {pagination.count} total</span>
            <button className="btn btn-secondary btn-sm" disabled={!pagination.next}
              onClick={() => fetchProducts(pagination.page + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
};

export default SellerProductListPage;
