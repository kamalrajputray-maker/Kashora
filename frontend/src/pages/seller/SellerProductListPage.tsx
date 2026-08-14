import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sellerProductAPI, catalogAPI, Product, PaginatedResponse } from '../../services/api';

const badgeClass = (val: string) => {
  const status = val.toUpperCase();
  if (status === 'ACTIVE' || status === 'APPROVED') return 'sp-badge sp-badge--green';
  if (status === 'PENDING') return 'sp-badge sp-badge--yellow';
  if (status === 'REJECTED' || status === 'ARCHIVED') return 'sp-badge sp-badge--red';
  if (status === 'DRAFT') return 'sp-badge sp-badge--blue';
  return 'sp-badge';
};

export const SellerProductListPage: React.FC = () => {
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
    <>
      <div className="sp-header">
        <div>
          <h1 className="sp-header__title">Products</h1>
          <p className="sp-header__sub">Manage your product catalog</p>
        </div>
        <div className="sp-header__actions">
          <Link to="/seller/products/create" className="sp-btn sp-btn--primary">
            + New Product
          </Link>
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card__head">
          <h2 className="sp-card__title">All Products</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="sp-search">
              <span className="sp-search__icon">⌕</span>
              <input
                className="sp-search__input"
                type="text" placeholder="Search name, brand…"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="sp-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select className="sp-input" style={{ width: 'auto' }} value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}>
              <option value="">All Approvals</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select className="sp-input" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="sp-alert sp-alert--error" style={{ margin: '16px 20px 0' }}>{error}</div>}

        {isLoading ? (
          <div className="sp-loading">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="sp-empty">
            <span className="sp-empty__icon">📦</span>
            <span className="sp-empty__text">No products found.</span>
            {!search && !statusFilter && !approvalFilter && !categoryFilter && (
              <Link to="/seller/products/create" className="sp-btn sp-btn--primary" style={{ marginTop: 12 }}>Add First Product</Link>
            )}
          </div>
        ) : (
          <>
            <div className="sp-table-wrap">
              <table className="sp-table">
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
                        <div className="td-bold">{p.name}</div>
                        <div className="td-sub">{p.brand} · {p.slug}</div>
                      </td>
                      <td>{p.category_name}</td>
                      <td className="td-bold">₹{Number(p.base_price).toFixed(2)}</td>
                      <td><span className={badgeClass(p.status)}>{p.status}</span></td>
                      <td><span className={badgeClass(p.approval_status)}>{p.approval_status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link to={`/seller/products/${p.id}`} className="sp-btn sp-btn--ghost sp-btn--sm">View</Link>
                          <Link to={`/seller/products/${p.id}/edit`} className="sp-btn sp-btn--ghost sp-btn--sm">Edit</Link>
                          {p.approval_status !== 'PENDING' && p.approval_status !== 'APPROVED' && (
                            <button className="sp-btn sp-btn--primary sp-btn--sm" onClick={() => handleSubmit(p.id)}>Submit</button>
                          )}
                          <button className="sp-btn sp-btn--ghost sp-btn--sm" style={{ color: 'var(--badge-red-txt)', borderColor: 'var(--badge-red-bg)' }} onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--sel-card-border)' }}>
              <button 
                className="sp-btn sp-btn--ghost sp-btn--sm" 
                disabled={!pagination.previous}
                onClick={() => fetchProducts(pagination.page - 1)}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--sel-text-muted)' }}>Page {pagination.page} · {pagination.count} total items</span>
              <button 
                className="sp-btn sp-btn--ghost sp-btn--sm" 
                disabled={!pagination.next}
                onClick={() => fetchProducts(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SellerProductListPage;
