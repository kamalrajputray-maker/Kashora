import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sellerProductAPI, catalogAPI, Product } from '../../services/api';
import '../../styles/seller.css';

interface FormState {
  name: string; slug: string; description: string; brand: string;
  category: string; base_price: string; compare_at_price: string;
  tax_percentage: string; shipping_charge: string;
  returnable: boolean; return_window_days: string; status: string;
}

const EMPTY: FormState = {
  name: '', slug: '', description: '', brand: '', category: '',
  base_price: '', compare_at_price: '', tax_percentage: '18',
  shipping_charge: '0', returnable: true, return_window_days: '7', status: 'DRAFT',
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface Props { mode?: 'create' | 'edit'; }

const SellerProductFormPage: React.FC<Props> = ({ mode = 'create' }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(mode === 'edit');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [slugManual, setSlugManual] = useState(false);

  useEffect(() => {
    catalogAPI.listCategories().then(r => setCategories(r.data));
  }, []);

  useEffect(() => {
    if (mode === 'edit' && id) {
      setIsLoadingData(true);
      sellerProductAPI.get(id).then(r => {
        const p: Product = r.data;
        setForm({
          name: p.name, slug: p.slug, description: p.description, brand: p.brand,
          category: p.category, base_price: String(p.base_price),
          compare_at_price: p.compare_at_price ? String(p.compare_at_price) : '',
          tax_percentage: String(p.tax_percentage), shipping_charge: String(p.shipping_charge),
          returnable: p.returnable, return_window_days: String(p.return_window_days),
          status: p.status,
        });
        setSlugManual(true);
      }).catch(() => setApiError('Failed to load product.')).finally(() => setIsLoadingData(false));
    }
  }, [mode, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm(prev => {
      const next: any = { ...prev, [name]: val };
      if (name === 'name' && !slugManual) next.slug = slugify(value);
      return next;
    });
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManual(true);
    setForm(prev => ({ ...prev, slug: e.target.value }));
    setErrors(prev => ({ ...prev, slug: undefined }));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.slug.trim()) e.slug = 'Slug is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    if (!form.brand.trim()) e.brand = 'Brand is required.';
    if (!form.category) e.category = 'Category is required.';
    if (!form.base_price || isNaN(Number(form.base_price))) e.base_price = 'Valid base price required.';
    if (form.compare_at_price && isNaN(Number(form.compare_at_price))) e.compare_at_price = 'Must be a valid number.';
    if (form.compare_at_price && Number(form.compare_at_price) < Number(form.base_price))
      e.compare_at_price = 'Must be ≥ base price.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setIsLoading(true);
    const payload = {
      name: form.name, slug: form.slug, description: form.description,
      brand: form.brand, category: form.category,
      base_price: form.base_price,
      compare_at_price: form.compare_at_price || null,
      tax_percentage: form.tax_percentage, shipping_charge: form.shipping_charge,
      returnable: form.returnable, return_window_days: Number(form.return_window_days),
      status: form.status,
    };
    try {
      if (mode === 'create') {
        await sellerProductAPI.create(payload);
      } else {
        await sellerProductAPI.update(id!, payload);
      }
      navigate('/seller/products');
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const fieldErrors: typeof errors = {};
        Object.entries(data).forEach(([k, v]) => { fieldErrors[k as keyof FormState] = Array.isArray(v) ? (v as string[]).join(' ') : String(v); });
        setErrors(fieldErrors);
        if (data.non_field_errors) setApiError(data.non_field_errors.join(' '));
      } else {
        setApiError('Save failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) return <div className="loading-container">Loading product…</div>;

  return (
    <div className="product-form-container">
      <div className="product-form-header">
        <h1>{mode === 'create' ? '➕ Add New Product' : '✏️ Edit Product'}</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/seller/products')}>← Back</button>
      </div>

      {apiError && <div className="alert alert-error">{apiError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Basic Information */}
        <div className="form-section">
          <h2>📋 Basic Information</h2>
          <div className="form-grid">
            <div className="form-field form-group-full">
              <label htmlFor="name">Product Name *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} className={errors.name ? 'error' : ''} placeholder="e.g. Premium Cotton T-Shirt" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="slug">URL Slug *</label>
              <input id="slug" name="slug" value={form.slug} onChange={handleSlugChange} className={errors.slug ? 'error' : ''} placeholder="premium-cotton-t-shirt" />
              {!errors.slug && <span className="slug-helper">Auto-generated from name. Editable.</span>}
              {errors.slug && <span className="field-error">{errors.slug}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="brand">Brand *</label>
              <input id="brand" name="brand" value={form.brand} onChange={handleChange} className={errors.brand ? 'error' : ''} placeholder="e.g. BrandX" />
              {errors.brand && <span className="field-error">{errors.brand}</span>}
            </div>
            <div className="form-field form-group-full">
              <label htmlFor="description">Description *</label>
              <textarea id="description" name="description" value={form.description} onChange={handleChange} className={errors.description ? 'error' : ''} placeholder="Describe the product…" />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="form-section">
          <h2>🏷️ Category</h2>
          <div className="form-field">
            <label htmlFor="category">Category *</label>
            <select id="category" name="category" value={form.category} onChange={handleChange} className={errors.category ? 'error' : ''}>
              <option value="">-- Select a Category --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.category && <span className="field-error">{errors.category}</span>}
          </div>
        </div>

        {/* Pricing */}
        <div className="form-section">
          <h2>💰 Pricing</h2>
          <div className="form-grid-3">
            <div className="form-field">
              <label htmlFor="base_price">Base Price (₹) *</label>
              <input id="base_price" name="base_price" type="number" step="0.01" min="0" value={form.base_price} onChange={handleChange} className={errors.base_price ? 'error' : ''} placeholder="0.00" />
              {errors.base_price && <span className="field-error">{errors.base_price}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="compare_at_price">Compare-At Price (₹)</label>
              <input id="compare_at_price" name="compare_at_price" type="number" step="0.01" min="0" value={form.compare_at_price} onChange={handleChange} className={errors.compare_at_price ? 'error' : ''} placeholder="Original price" />
              {errors.compare_at_price && <span className="field-error">{errors.compare_at_price}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="tax_percentage">Tax (%)</label>
              <input id="tax_percentage" name="tax_percentage" type="number" step="0.01" min="0" value={form.tax_percentage} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label htmlFor="shipping_charge">Shipping Charge (₹)</label>
              <input id="shipping_charge" name="shipping_charge" type="number" step="0.01" min="0" value={form.shipping_charge} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Return Policy */}
        <div className="form-section">
          <h2>🔄 Return Policy</h2>
          <div className="checkbox-row">
            <input id="returnable" name="returnable" type="checkbox" checked={form.returnable} onChange={handleChange} />
            <span>This product is returnable</span>
          </div>
          {form.returnable && (
            <div className="form-field" style={{ marginTop: 12 }}>
              <label htmlFor="return_window_days">Return Window (days)</label>
              <input id="return_window_days" name="return_window_days" type="number" min="0" value={form.return_window_days} onChange={handleChange} />
            </div>
          )}
        </div>

        {/* Status */}
        <div className="form-section">
          <h2>🚦 Status</h2>
          <div className="form-field">
            <label htmlFor="status">Product Status</label>
            <select id="status" name="status" value={form.status} onChange={handleChange}>
              <option value="DRAFT">Draft — not visible</option>
              <option value="ACTIVE">Active — submit for review to go live</option>
              <option value="INACTIVE">Inactive — temporarily hidden</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/seller/products')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Saving…' : mode === 'create' ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const SellerProductCreatePage: React.FC = () => <SellerProductFormPage mode="create" />;
export const SellerProductEditPage: React.FC = () => <SellerProductFormPage mode="edit" />;
export default SellerProductFormPage;
