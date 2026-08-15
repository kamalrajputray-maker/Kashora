import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminCategoryAPI, Category, CategoryRequest } from '../../../services/api';

// Premium Meesho/Amazon style styling
const S = {
  container: { padding: '2rem', maxWidth: '1000px', margin: '0 auto' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: 600, color: 'var(--adm-text-1)', margin: 0 },
  card: { background: 'var(--adm-card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--adm-card-border)' },
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '0.5rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input: { width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--adm-card-border)', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const, background: 'var(--adm-bg)', color: 'var(--adm-text-1)' },
  textarea: { width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--adm-card-border)', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', resize: 'vertical' as const, minHeight: '120px', boxSizing: 'border-box' as const, background: 'var(--adm-bg)', color: 'var(--adm-text-1)' },
  select: { width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--adm-card-border)', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: 'var(--adm-bg)', color: 'var(--adm-text-1)', boxSizing: 'border-box' as const },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--adm-accent)' },
  submitBtn: { backgroundColor: 'var(--adm-accent)', color: '#fff', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', flex: 1 },
  cancelBtn: { background: 'transparent', color: 'var(--adm-text-2)', border: '1px solid var(--adm-card-border)', padding: '0.85rem 1.5rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  errorAlert: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' },
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
    image: null,
  });
  const [currentImage, setCurrentImage] = useState<string | null>(null);
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
          setCurrentImage(res.data.image);
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
    } else if (type === 'file') {
      const fileInput = e.target as HTMLInputElement;
      if (fileInput.files && fileInput.files.length > 0) {
        finalValue = fileInput.files[0];
      } else {
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const submissionData = new FormData();
      submissionData.append('name', formData.name);
      if (formData.description) submissionData.append('description', formData.description);
      if (formData.parent) submissionData.append('parent', formData.parent);
      submissionData.append('is_active', formData.is_active ? 'true' : 'false');
      submissionData.append('sort_order', String(formData.sort_order));
      if (formData.image) {
        submissionData.append('image', formData.image);
      }

      if (isEditMode && id) {
        await adminCategoryAPI.updateCategory(id, submissionData);
      } else {
        await adminCategoryAPI.createCategory(submissionData);
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
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--adm-text-2)' }}>Loading category details...</div>;
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.title}>{isEditMode ? '✨ Edit Category' : '✨ Create Category'}</h1>
        <p style={{ color: 'var(--adm-text-2)', marginTop: '0.25rem' }}>
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
            <label style={S.label}>Category Image / Icon</label>
            <input 
              type="file" 
              name="image" 
              accept="image/*"
              onChange={handleChange} 
              style={S.input}
            />
            {currentImage && !formData.image && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-text-3)' }}>
                Current Image: <a href={currentImage} target="_blank" rel="noreferrer" style={{ color: 'var(--adm-accent)' }}>View</a>
              </div>
            )}
            {formData.image && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-accent)' }}>
                New image selected: {formData.image.name}
              </div>
            )}
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
            <label htmlFor="is_active" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--adm-text-1)', cursor: 'pointer' }}>
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
