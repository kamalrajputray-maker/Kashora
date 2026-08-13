import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminCategoryAPI, Category } from '../../../services/api';

// Premium Meesho/Amazon style styling
const S = {
  container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#f8fafc' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0 },
  addBtn: { background: 'linear-gradient(135deg, #9333ea, #db2777)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(147, 51, 234, 0.3)', transition: 'all 0.2s' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
  statCard: { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  statLabel: { fontSize: '0.85rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  statValue: { fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' },
  filterCard: { background: '#fff', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' as const },
  searchInput: { flex: 1, minWidth: '250px', padding: '0.65rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' },
  tableCard: { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const, fontSize: '0.9rem' },
  th: { padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontWeight: '700', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  td: { padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' as const },
  badge: (active: boolean) => ({
    display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700',
    background: active ? '#d1fae5' : '#fee2e2', color: active ? '#065f46' : '#dc2626',
  }),
  parentBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
  editBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', marginRight: '0.5rem' },
  deleteBtn: { background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: '#fff', borderTop: '1px solid #f1f5f9' },
  pageBtn: (disabled: boolean) => ({
    padding: '0.5rem 1rem', background: disabled ? '#f1f5f9' : '#fff', color: disabled ? '#94a3b8' : '#334155',
    border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: disabled ? 'default' : 'pointer',
  }),
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

  // Fetch all categories once for parenting lookups
  useEffect(() => {
    adminCategoryAPI.getCategories({ page: 1, limit: 1000 })
      .then(res => {
        setAllCategoriesForLookup(res.data.results || res.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [search, page]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await adminCategoryAPI.deleteCategory(id);
      fetchCategories();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete category. Safe deletion rule in effect: block deletion when child categories or products exist.';
      alert(`Error: ${msg}`);
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = allCategoriesForLookup.find(c => c.id === parentId);
    return parent ? parent.name : 'Unknown';
  };

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Category Management</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Organize, view, and manage marketplace categories.</p>
        </div>
        <button onClick={() => navigate('/admin/categories/create')} style={S.addBtn}>
          ✨ Add Category
        </button>
      </div>

      {/* Stats */}
      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <span style={S.statLabel}>Total Categories</span>
          <span style={S.statValue}>{totalCount}</span>
        </div>
        <div style={S.statCard}>
          <span style={S.statLabel}>Active</span>
          <span style={{ ...S.statValue, color: '#059669' }}>
            {allCategoriesForLookup.filter(c => c.is_active).length}
          </span>
        </div>
        <div style={S.statCard}>
          <span style={S.statLabel}>Inactive</span>
          <span style={{ ...S.statValue, color: '#dc2626' }}>
            {allCategoriesForLookup.filter(c => !c.is_active).length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={S.filterCard}>
        <input
          type="text"
          placeholder="🔍 Search categories by name or description..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={S.searchInput}
        />
      </div>

      {/* Error / Table */}
      {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fee2e2' }}>{error}</div>}

      <div style={S.tableCard}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading categories...</div>
        ) : (
          <>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Slug</th>
                  <th style={S.th}>Parent Category</th>
                  <th style={S.th}>Sort Order</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      No categories found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  categories.map(cat => {
                    const parentName = getParentName(cat.parent);
                    return (
                      <tr key={cat.id}>
                        <td style={S.td}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a', paddingLeft: cat.parent ? '1.5rem' : '0' }}>
                              {cat.parent && <span style={{ color: '#94a3b8', marginRight: '0.4rem' }}>↳</span>}
                              {cat.name}
                            </span>
                            {cat.description && (
                              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem', paddingLeft: cat.parent ? '1.5rem' : '0' }}>
                                {cat.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...S.td, color: '#64748b', fontFamily: 'monospace' }}>{cat.slug}</td>
                        <td style={S.td}>
                          {parentName ? (
                            <span style={S.parentBadge}>{parentName}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None (Top Level)</span>
                          )}
                        </td>
                        <td style={{ ...S.td, fontWeight: '600', color: '#334155' }}>{cat.sort_order}</td>
                        <td style={S.td}>
                          <span style={S.badge(cat.is_active)}>
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <button onClick={() => navigate(`/admin/categories/${cat.id}/edit`)} style={S.editBtn}>Edit</button>
                          <button onClick={() => handleDelete(cat.id)} style={S.deleteBtn}>Delete</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={S.pagination}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    style={S.pageBtn(page === 1)}
                  >
                    ◀ Previous
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    style={S.pageBtn(page === totalPages)}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminCategoryListPage;
