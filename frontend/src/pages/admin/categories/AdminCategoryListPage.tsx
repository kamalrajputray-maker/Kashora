import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminCategoryAPI, Category } from '../../../services/api';

const badgeClass = (active: boolean) => {
  return active ? 'adm-badge adm-badge--green' : 'adm-badge adm-badge--red';
};

const AdminCategoryListPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategoriesForLookup, setAllCategoriesForLookup] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await adminCategoryAPI.getCategories({ search, page });
      setCategories(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results || res.data).length);
      setTotalPages(Math.ceil((res.data.count || 1) / 20));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminCategoryAPI.getCategories({ page: 1, limit: 1000 })
      .then(res => {
        setAllCategoriesForLookup(res.data.results || res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line
  }, [search, page]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await adminCategoryAPI.deleteCategory(id);
      fetchCategories();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete category.';
      alert(`Error: ${msg}`);
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = allCategoriesForLookup.find(c => c.id === parentId);
    return parent ? parent.name : 'Unknown';
  };

  const activeCount = allCategoriesForLookup.filter(c => c.is_active).length;
  const inactiveCount = allCategoriesForLookup.filter(c => !c.is_active).length;

  return (
    <>
      <div className="adm-page-header">
        <div>
          <h1>Category Management</h1>
          <p>Organize, view, and manage marketplace categories.</p>
        </div>
        <button onClick={() => navigate('/admin/categories/create')} className="adm-btn adm-btn--primary">
          + Add Category
        </button>
      </div>

      <div className="adm-stats" style={{ marginBottom: 24 }}>
        <div className="adm-stat-card" style={{ '--card-accent': '#6366f1', '--card-icon-bg': 'rgba(99,102,241,0.1)', '--card-icon-color': '#4f46e5' } as React.CSSProperties}>
          <div className="adm-stat-icon">🗂️</div>
          <div className="adm-stat-label">Total Categories</div>
          <div className="adm-stat-value">{totalCount}</div>
        </div>
        <div className="adm-stat-card" style={{ '--card-accent': '#10b981', '--card-icon-bg': 'rgba(16,185,129,0.1)', '--card-icon-color': '#059669' } as React.CSSProperties}>
          <div className="adm-stat-icon">✓</div>
          <div className="adm-stat-label">Active</div>
          <div className="adm-stat-value">{activeCount}</div>
        </div>
        <div className="adm-stat-card" style={{ '--card-accent': '#ef4444', '--card-icon-bg': 'rgba(239,68,68,0.1)', '--card-icon-color': '#dc2626' } as React.CSSProperties}>
          <div className="adm-stat-icon">✕</div>
          <div className="adm-stat-label">Inactive</div>
          <div className="adm-stat-value">{inactiveCount}</div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card__head">
          <div className="adm-search">
            <span className="adm-search__icon">⌕</span>
            <input
              className="adm-search__input"
              type="text"
              placeholder="Search categories by name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {error && <div className="adm-alert adm-alert--error" style={{ margin: '16px 20px 0' }}>{error}</div>}

        {loading ? (
          <div className="adm-loading">Loading categories...</div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Parent Category</th>
                    <th>Sort Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    categories.map(cat => {
                      const parentName = getParentName(cat.parent);
                      return (
                        <tr key={cat.id}>
                          <td>
                            <div className="td-bold" style={{ paddingLeft: cat.parent ? '1.5rem' : '0' }}>
                              {cat.parent && <span style={{ color: 'var(--adm-text-muted)', marginRight: 6 }}>↳</span>}
                              {cat.name}
                            </div>
                            {cat.description && (
                              <div className="td-sub" style={{ paddingLeft: cat.parent ? '1.5rem' : '0' }}>
                                {cat.description}
                              </div>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--adm-text-muted)' }}>{cat.slug}</td>
                          <td>
                            {parentName ? (
                              <span className="adm-badge" style={{ background: 'var(--adm-bg)', color: 'var(--adm-text-2)', border: '1px solid var(--adm-card-border)' }}>
                                {parentName}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>None (Top Level)</span>
                            )}
                          </td>
                          <td className="td-bold">{cat.sort_order}</td>
                          <td>
                            <span className={badgeClass(cat.is_active)}>
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => navigate(`/admin/categories/${cat.id}/edit`)} className="adm-btn adm-btn--ghost adm-btn--sm">Edit</button>
                              <button onClick={() => handleDelete(cat.id)} className="adm-btn adm-btn--ghost adm-btn--sm" style={{ color: 'var(--badge-red-txt)', borderColor: 'var(--badge-red-bg)' }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--adm-card-border)' }}>
                <button
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                >
                  ◀ Previous
                </button>
                <div style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </div>
                <button
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default AdminCategoryListPage;
