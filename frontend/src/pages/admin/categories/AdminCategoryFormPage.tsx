import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminCategoryAPI, Category, CategoryRequest } from '../../../services/api';

// Premium Meesho/Amazon style styling
const S = {
  container: { padding: '2rem', maxWidth: '650px', margin: '0 auto', fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#f8fafc' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0 },
  card: { background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0' },
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input: { width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', resize: 'vertical' as const, minHeight: '120px', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#fff', boxSizing: 'border-box' as const },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  submitBtn: { background: 'linear-gradient(135deg, #9333ea, #db2777)', color: '#fff', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', flex: 1, boxShadow: '0 4px 14px rgba(147, 51, 234, 0.3)', transition: 'opacity 0.2s' },
  cancelBtn: { background: '#f1f5f9', color: '#475569', border: '1.5px solid #cbd5e1', padding: '0.85rem 1.5rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
  errorAlert: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' },
};

const AdminCategoryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CategoryRequest>({
    name: '',
    description: '',
    parent: null,
    is_active: true,
    sort_order: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load all categories for the parent dropdown
    adminCategoryAPI.getCategories({ page: 1, limit: 1000 }).then(res => {
      const allCats = res.data.results || res.data;
      // Exclude self from parent options to prevent direct self-parenting in UI
      setCategories(allCats.filter((c: Category) => c.id !== id));
    }).catch(console.error);

    if (isEditMode && id) {
      setLoading(true);
      adminCategoryAPI.getCategoryById(id)
        .then(res => {
          setFormData({
            name: res.data.name,
            description: res.data.description || '',
            parent: res.data.parent,
            is_active: res.data.is_active,
            sort_order: res.data.sort_order,
          });
        })
        .catch(err => setError(err.response?.data?.detail || 'Failed to load category'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'parent') {
      finalValue = value === '' ? null : value;
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEditMode && id) {
        await adminCategoryAPI.updateCategory(id, formData);
      } else {
        await adminCategoryAPI.createCategory(formData);
      }
      navigate('/admin/categories');
    } catch (err: any) {
      const msgs = err.response?.data;
      if (typeof msgs === 'object' && msgs !== null) {
        // Render validation dictionary nicely
        const cleanMsg = Object.entries(msgs)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(cleanMsg);
      } else {
        setError(err.response?.data?.detail || 'Failed to save category. Please ensure parent does not cause circular reference.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading category details...</div>;
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.title}>{isEditMode ? '✨ Edit Category' : '✨ Create Category'}</h1>
        <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
          {isEditMode ? 'Modify category properties and hierarchy.' : 'Add a new category to organize catalog listings.'}
        </p>
      </div>

      {error && <div style={S.errorAlert}>⚠️ {error}</div>}

      <div style={S.card}>
        <form onSubmit={handleSubmit}>
          <div style={S.field}>
            <label style={S.label}>Category Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              style={S.input}
              placeholder="e.g. Mens Clothing"
            />
          </div>
          
          <div style={S.field}>
            <label style={S.label}>Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              style={S.textarea}
              placeholder="Describe the category and types of products included..."
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>Parent Category (Hierarchy)</label>
            <select 
              name="parent" 
              value={formData.parent || ''} 
              onChange={handleChange}
              style={S.select}
            >
              <option value="">None (Top Level)</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Sort Order</label>
            <input 
              type="number" 
              name="sort_order" 
              value={formData.sort_order} 
              onChange={handleChange} 
              style={S.input}
            />
          </div>

          <div style={S.checkboxRow}>
            <input 
              type="checkbox" 
              name="is_active" 
              id="is_active" 
              checked={formData.is_active} 
              onChange={handleChange} 
              style={S.checkbox}
            />
            <label htmlFor="is_active" style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
              Mark this category as Active (Publicly visible)
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" disabled={loading} style={S.submitBtn}>
              {loading ? 'Saving...' : 'Save Category'}
            </button>
            <button type="button" onClick={() => navigate('/admin/categories')} style={S.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCategoryFormPage;
