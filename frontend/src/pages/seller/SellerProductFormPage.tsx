import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  sellerProductAPI, catalogAPI, Product,
  sellerAttributeAPI, sellerVariantAPI, sellerImageAPI,
  ProductAttribute, ProductVariant, ProductImage,
} from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component (Refactored to use sp- CSS classes for Dark Mode support)
// ─────────────────────────────────────────────────────────────────────────────
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
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

const badgeClass = (status: string) => {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'APPROVED') return 'sp-badge sp-badge--green';
  if (s === 'PENDING') return 'sp-badge sp-badge--yellow';
  if (s === 'REJECTED' || s === 'ARCHIVED') return 'sp-badge sp-badge--red';
  if (s === 'DRAFT') return 'sp-badge sp-badge--blue';
  return 'sp-badge';
};

const SellerProductFormPage: React.FC<{ mode?: 'create' | 'edit' }> = ({ mode = 'create' }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = mode === 'edit' || !!id;

  // Product form state
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEdit);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [slugManual, setSlugManual] = useState(false);
  const [savedProductId, setSavedProductId] = useState<string | null>(id || null);

  // Variants / Attributes state
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [attrLoading, setAttrLoading] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});
  const [generatePrice, setGeneratePrice] = useState('');
  const [generatePrefix, setGeneratePrefix] = useState('SKU');
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string[]>>({});
  const [editingVariant, setEditingVariant] = useState<Record<string, Partial<ProductVariant>>>({});
  const [variantApiError, setVariantApiError] = useState<string | null>(null);
  const [variantSuccess, setVariantSuccess] = useState<string | null>(null);

  // Product Image states
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => { catalogAPI.listCategories().then(r => setCategories(r.data)); }, []);

  useEffect(() => {
    if (isEdit && id) {
      setIsLoadingProduct(true);
      sellerProductAPI.get(id).then(r => {
        const p: Product = r.data;
        setForm({ name: p.name, slug: p.slug, description: p.description, brand: p.brand, category: p.category, base_price: String(p.base_price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : '', tax_percentage: String(p.tax_percentage), shipping_charge: String(p.shipping_charge), returnable: p.returnable, return_window_days: String(p.return_window_days), status: p.status });
        setSlugManual(true);
        setSavedProductId(id);
        setGeneratePrice(String(p.base_price));
        setGeneratePrefix(p.name.slice(0, 5).toUpperCase().replace(/\s/g, ''));
      }).catch(() => setApiError('Failed to load product.')).finally(() => setIsLoadingProduct(false));
    }
  }, [isEdit, id]);

  const loadImages = useCallback(async (pid: string) => {
    try {
      const res = await sellerImageAPI.list(pid);
      setImages(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadAttributesAndVariants = useCallback(async (pid: string) => {
    setAttrLoading(true);
    setVariantLoading(true);
    try {
      const [attrRes, varRes, imgRes] = await Promise.all([
        sellerAttributeAPI.list(pid),
        sellerVariantAPI.list(pid),
        sellerImageAPI.list(pid)
      ]);
      setAttributes(attrRes.data);
      setVariants(varRes.data);
      setImages(imgRes.data);
    } catch { /* silently ignore */ } finally {
      setAttrLoading(false);
      setVariantLoading(false);
    }
  }, []);

  useEffect(() => { if (savedProductId) loadAttributesAndVariants(savedProductId); }, [savedProductId, loadAttributesAndVariants]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!savedProductId || !files || files.length === 0) return;
    setImageLoading(true);
    setImageError(null);
    try {
      const formData = new FormData();
      formData.append('image', files[0]);
      formData.append('alt_text', form.name);
      formData.append('sort_order', String(images.length));
      await sellerImageAPI.upload(savedProductId, formData);
      await loadImages(savedProductId);
    } catch (err: any) {
      setImageError(err.response?.data?.image?.[0] || err.response?.data?.detail || 'Failed to upload image.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleMakePrimary = async (imageId: string) => {
    if (!savedProductId) return;
    try {
      await sellerImageAPI.update(savedProductId, imageId, { is_primary: true });
      await loadImages(savedProductId);
    } catch (err) { setImageError('Failed to change primary image.'); }
  };

  const handleUpdateSortOrder = async (imageId: string, newOrder: number) => {
    if (!savedProductId) return;
    try {
      await sellerImageAPI.update(savedProductId, imageId, { sort_order: newOrder });
      await loadImages(savedProductId);
    } catch (err) { setImageError('Failed to update sort order.'); }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!savedProductId || !window.confirm('Delete this image?')) return;
    try {
      await sellerImageAPI.delete(savedProductId, imageId);
      await loadImages(savedProductId);
    } catch (err) { setImageError('Failed to delete image.'); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm(prev => { const n: any = { ...prev, [name]: val }; if (name === 'name' && !slugManual) n.slug = slugify(value); return n; });
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    if (!form.brand.trim()) e.brand = 'Brand is required.';
    if (!form.category) e.category = 'Category is required.';
    if (!form.base_price || isNaN(Number(form.base_price))) e.base_price = 'Valid base price required.';
    if (form.compare_at_price && Number(form.compare_at_price) < Number(form.base_price)) e.compare_at_price = 'Must be ≥ base price.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setIsSaving(true);
    const payload = { name: form.name, slug: form.slug || slugify(form.name), description: form.description, brand: form.brand, category: form.category, base_price: form.base_price, compare_at_price: form.compare_at_price || null, tax_percentage: form.tax_percentage, shipping_charge: form.shipping_charge, returnable: form.returnable, return_window_days: Number(form.return_window_days), status: form.status };
    try {
      if (isEdit && savedProductId) {
        await sellerProductAPI.update(savedProductId, payload);
        setApiError(null);
      } else {
        const res = await sellerProductAPI.create(payload);
        const pid = res.data.id;
        setSavedProductId(pid);
        navigate(`/seller/products/${pid}/edit`, { replace: true });
      }
    } catch (err: any) {
      const d = err.response?.data;
      setApiError(d ? (typeof d === 'string' ? d : JSON.stringify(d)) : 'Failed to save product.');
    } finally { setIsSaving(false); }
  };

  const addAttribute = async () => {
    if (!savedProductId || !newAttrName.trim()) return;
    try {
      const res = await sellerAttributeAPI.create(savedProductId, { name: newAttrName.trim() });
      setAttributes(prev => [...prev, res.data]);
      setNewAttrName('');
    } catch (err: any) {
      setVariantApiError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create attribute.');
    }
  };

  const deleteAttribute = async (attrId: string) => {
    if (!savedProductId || !window.confirm('Delete this attribute and all its values?')) return;
    await sellerAttributeAPI.delete(savedProductId, attrId);
    setAttributes(prev => prev.filter(a => a.id !== attrId));
  };

  const addValue = async (attrId: string) => {
    const val = (newValueInputs[attrId] || '').trim();
    if (!savedProductId || !val) return;
    try {
      const res = await sellerAttributeAPI.addValue(savedProductId, attrId, { value: val });
      setAttributes(prev => prev.map(a => a.id === attrId ? { ...a, values: [...a.values, res.data] } : a));
      setNewValueInputs(prev => ({ ...prev, [attrId]: '' }));
    } catch (err: any) {
      setVariantApiError(err.response?.data?.detail || 'Failed to add value.');
    }
  };

  const removeValue = async (attrId: string, valueId: string) => {
    if (!savedProductId) return;
    await sellerAttributeAPI.removeValue(savedProductId, attrId, valueId);
    setAttributes(prev => prev.map(a => a.id === attrId ? { ...a, values: a.values.filter(v => v.id !== valueId) } : a));
  };

  const handleGenerate = async () => {
    if (!savedProductId) return;
    const groups = attributes.map(a => (selectedGroups[a.id] || a.values.map(v => v.id)));
    if (groups.some(g => g.length === 0)) { setVariantApiError('All attributes must have at least one value selected.'); return; }
    setVariantLoading(true);
    setVariantApiError(null);
    try {
      const res = await sellerVariantAPI.generate(savedProductId, { base_price: generatePrice, sku_prefix: generatePrefix, attribute_value_groups: groups });
      setVariantSuccess(`Generated ${res.data.created} variants. ${res.data.skipped} skipped (duplicates).`);
      setTimeout(() => setVariantSuccess(null), 4000);
      await loadAttributesAndVariants(savedProductId);
    } catch (err: any) {
      setVariantApiError(err.response?.data?.detail || 'Failed to generate variants.');
    } finally { setVariantLoading(false); }
  };

  const handleVariantEdit = (variantId: string, field: string, value: any) => {
    setEditingVariant(prev => ({ ...prev, [variantId]: { ...prev[variantId], [field]: value } }));
  };

  const saveVariant = async (variantId: string) => {
    if (!savedProductId) return;
    const updates = editingVariant[variantId];
    if (!updates) return;
    try {
      await sellerVariantAPI.update(savedProductId, variantId, updates);
      setEditingVariant(prev => { const n = { ...prev }; delete n[variantId]; return n; });
      await loadAttributesAndVariants(savedProductId);
      setVariantSuccess('Variant updated.');
      setTimeout(() => setVariantSuccess(null), 3000);
    } catch (err: any) {
      setVariantApiError(err.response?.data?.sku?.[0] || err.response?.data?.detail || 'Failed to update variant.');
    }
  };

  const toggleVariantActive = async (v: ProductVariant) => {
    if (!savedProductId) return;
    await sellerVariantAPI.update(savedProductId, v.id, { is_active: !v.is_active });
    await loadAttributesAndVariants(savedProductId);
  };

  const deleteVariant = async (variantId: string) => {
    if (!savedProductId || !window.confirm('Delete this variant?')) return;
    await sellerVariantAPI.delete(savedProductId, variantId);
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  if (isLoadingProduct) return <div className="sp-loading">Loading product...</div>;

  return (
    <>
      <div className="sp-header">
        <div>
          <button className="sp-btn sp-btn--ghost sp-btn--sm" onClick={() => navigate('/seller/products')} style={{ marginBottom: 12 }}>
            ← Back
          </button>
          <h1 className="sp-header__title">
            {isEdit ? 'Edit Product' : 'Create New Product'}
          </h1>
          {isEdit && savedProductId && <p className="sp-header__sub">Product ID: {savedProductId}</p>}
        </div>
        {isEdit && (
          <div className="sp-header__actions">
            <span className={badgeClass(form.status)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>{form.status}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }} className="responsive-grid">
          {/* Main Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="sp-card">
              <div className="sp-card__head">
                <h2 className="sp-card__title">📦 Basic Information</h2>
              </div>
              <div className="sp-card__body">
                {apiError && <div className="sp-alert sp-alert--error">{apiError}</div>}
                
                <div className="sp-field">
                  <label className="sp-label">Product Name *</label>
                  <input className="sp-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Men's Cotton T-Shirt" />
                  {errors.name && <p style={{ color: 'var(--badge-red-txt)', fontSize: '0.75rem', marginTop: 4 }}>{errors.name}</p>}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="sp-field">
                    <label className="sp-label">Brand *</label>
                    <input className="sp-input" name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Nike" />
                    {errors.brand && <p style={{ color: 'var(--badge-red-txt)', fontSize: '0.75rem', marginTop: 4 }}>{errors.brand}</p>}
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Category *</label>
                    <select className="sp-input" name="category" value={form.category} onChange={handleChange}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.category && <p style={{ color: 'var(--badge-red-txt)', fontSize: '0.75rem', marginTop: 4 }}>{errors.category}</p>}
                  </div>
                </div>

                <div className="sp-field">
                  <label className="sp-label">Description *</label>
                  <textarea className="sp-input" style={{ minHeight: 100, resize: 'vertical' }} name="description" value={form.description} onChange={handleChange} placeholder="Describe the product..." />
                  {errors.description && <p style={{ color: 'var(--badge-red-txt)', fontSize: '0.75rem', marginTop: 4 }}>{errors.description}</p>}
                </div>

                <div className="sp-field">
                  <label className="sp-label">URL Slug</label>
                  <input className="sp-input" name="slug" value={form.slug} onChange={e => { setSlugManual(true); setForm(p => ({ ...p, slug: e.target.value })); }} placeholder="auto-generated-from-name" />
                </div>
              </div>
            </div>

            <div className="sp-card">
              <div className="sp-card__head">
                <h2 className="sp-card__title">💰 Pricing & Tax</h2>
              </div>
              <div className="sp-card__body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="sp-field">
                    <label className="sp-label">Base Price (₹) *</label>
                    <input className="sp-input" type="number" min="0" step="0.01" name="base_price" value={form.base_price} onChange={handleChange} placeholder="499.00" />
                    {errors.base_price && <p style={{ color: 'var(--badge-red-txt)', fontSize: '0.75rem', marginTop: 4 }}>{errors.base_price}</p>}
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Compare-at Price (₹)</label>
                    <input className="sp-input" type="number" min="0" step="0.01" name="compare_at_price" value={form.compare_at_price} onChange={handleChange} placeholder="799.00" />
                    {errors.compare_at_price && <p style={{ color: 'var(--badge-red-txt)', fontSize: '0.75rem', marginTop: 4 }}>{errors.compare_at_price}</p>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="sp-field">
                    <label className="sp-label">Tax %</label>
                    <input className="sp-input" type="number" min="0" max="100" name="tax_percentage" value={form.tax_percentage} onChange={handleChange} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Shipping Charge (₹)</label>
                    <input className="sp-input" type="number" min="0" name="shipping_charge" value={form.shipping_charge} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>

            <div className="sp-card">
              <div className="sp-card__head">
                <h2 className="sp-card__title">↩️ Return Policy</h2>
              </div>
              <div className="sp-card__body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <input type="checkbox" id="returnable" name="returnable" checked={form.returnable} onChange={handleChange} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <label htmlFor="returnable" style={{ fontWeight: 600, color: 'var(--sel-text-1)', cursor: 'pointer' }}>Product is Returnable</label>
                </div>
                {form.returnable && (
                  <div className="sp-field" style={{ maxWidth: 200 }}>
                    <label className="sp-label">Return Window (days)</label>
                    <input className="sp-input" type="number" min="1" max="30" name="return_window_days" value={form.return_window_days} onChange={handleChange} />
                  </div>
                )}
              </div>
            </div>

            {savedProductId ? (
              <div className="sp-card">
                <div className="sp-card__head">
                  <h2 className="sp-card__title">🎨 Attributes & Variants</h2>
                </div>
                <div className="sp-card__body">
                  {variantApiError && <div className="sp-alert sp-alert--error">{variantApiError}</div>}
                  {variantSuccess && <div className="sp-alert" style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-txt)', borderLeft: '3px solid var(--badge-green-txt)' }}>{variantSuccess}</div>}

                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <input
                      className="sp-input"
                      placeholder="Attribute name (e.g. Size, Color)"
                      value={newAttrName}
                      onChange={e => setNewAttrName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttribute())}
                    />
                    <button type="button" className="sp-btn sp-btn--ghost" onClick={addAttribute} disabled={!newAttrName.trim()}>Add</button>
                  </div>

                  {attrLoading ? <div className="sp-loading">Loading attributes...</div> : attributes.map(attr => (
                    <div key={attr.id} style={{ padding: 16, background: 'var(--sel-bg)', border: '1px solid var(--sel-card-border)', borderRadius: 'var(--sel-radius-sm)', marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <strong style={{ color: 'var(--sel-text-1)', fontSize: '0.95rem' }}>🏷 {attr.name}</strong>
                        <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" style={{ color: 'var(--badge-red-txt)' }} onClick={() => deleteAttribute(attr.id)}>Remove</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {attr.values.map(v => (
                          <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--sel-accent-light)', color: 'var(--sel-accent-text)', padding: '4px 10px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 500 }}>
                            {v.value}
                            <button type="button" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontWeight: 700 }} onClick={() => removeValue(attr.id, v.id)}>×</button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="sp-input"
                          style={{ padding: '6px 10px' }}
                          placeholder={`Add ${attr.name} value...`}
                          value={newValueInputs[attr.id] || ''}
                          onChange={e => setNewValueInputs(prev => ({ ...prev, [attr.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addValue(attr.id))}
                        />
                        <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" onClick={() => addValue(attr.id)}>Add Value</button>
                      </div>
                    </div>
                  ))}

                  {attributes.length > 0 && attributes.every(a => a.values.length > 0) && (
                    <>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--sel-card-border)', margin: '24px 0' }} />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--sel-text-1)', marginBottom: 16 }}>⚡ Generate Variants</h3>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24 }}>
                        <div className="sp-field" style={{ margin: 0, flex: 1, minWidth: 120 }}>
                          <label className="sp-label">Base Price (₹)</label>
                          <input className="sp-input" type="number" min="0" value={generatePrice} onChange={e => setGeneratePrice(e.target.value)} placeholder="499" />
                        </div>
                        <div className="sp-field" style={{ margin: 0, flex: 1, minWidth: 120 }}>
                          <label className="sp-label">SKU Prefix</label>
                          <input className="sp-input" maxLength={10} value={generatePrefix} onChange={e => setGeneratePrefix(e.target.value.toUpperCase())} placeholder="SKU" />
                        </div>
                        <button type="button" className="sp-btn sp-btn--primary" onClick={handleGenerate} disabled={variantLoading || !generatePrice}>
                          {variantLoading ? '⏳ Generating...' : '✨ Generate Variants'}
                        </button>
                      </div>
                    </>
                  )}

                  {variants.length > 0 && (
                    <>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--sel-text-1)', marginBottom: 12 }}>📋 Variant List ({variants.length})</h3>
                      <div className="sp-table-wrap">
                        <table className="sp-table">
                          <thead>
                            <tr>
                              <th>Variant</th>
                              <th>SKU</th>
                              <th>Price (₹)</th>
                              <th>Compare (₹)</th>
                              <th>Weight (g)</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map(v => {
                              const editing = editingVariant[v.id] || {};
                              const isChanged = Object.keys(editing).length > 0;
                              return (
                                <tr key={v.id}>
                                  <td className="td-bold">{v.attribute_summary || '—'}</td>
                                  <td><input className="sp-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={editing.sku ?? v.sku} onChange={e => handleVariantEdit(v.id, 'sku', e.target.value)} /></td>
                                  <td><input className="sp-input" style={{ width: 80, padding: '4px 8px', fontSize: '0.8rem' }} type="number" value={editing.price ?? v.price} onChange={e => handleVariantEdit(v.id, 'price', e.target.value)} /></td>
                                  <td><input className="sp-input" style={{ width: 80, padding: '4px 8px', fontSize: '0.8rem' }} type="number" value={editing.compare_at_price ?? v.compare_at_price ?? ''} onChange={e => handleVariantEdit(v.id, 'compare_at_price', e.target.value || null)} /></td>
                                  <td><input className="sp-input" style={{ width: 80, padding: '4px 8px', fontSize: '0.8rem' }} type="number" value={editing.weight ?? v.weight ?? ''} onChange={e => handleVariantEdit(v.id, 'weight', e.target.value || null)} /></td>
                                  <td><span className={badgeClass(v.is_active ? 'ACTIVE' : 'INACTIVE')}>{v.is_active ? 'Active' : 'Inactive'}</span></td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      {isChanged && <button type="button" className="sp-btn sp-btn--primary sp-btn--sm" onClick={() => saveVariant(v.id)}>Save</button>}
                                      <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" onClick={() => toggleVariantActive(v)}>
                                        {v.is_active ? 'Disable' : 'Enable'}
                                      </button>
                                      <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" style={{ color: 'var(--badge-red-txt)' }} onClick={() => deleteVariant(v.id)}>Del</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="sp-card" style={{ padding: 32, textAlign: 'center', color: 'var(--sel-text-muted)' }}>
                <p style={{ fontSize: '2rem', margin: '0 0 12px' }}>💡</p>
                <p>Save the product basic details first to manage variants & attributes.</p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="sp-card">
              <div className="sp-card__head">
                <h2 className="sp-card__title">🚀 Publish</h2>
              </div>
              <div className="sp-card__body">
                <div className="sp-field">
                  <label className="sp-label">Status</label>
                  <select className="sp-input" name="status" value={form.status} onChange={handleChange}>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <button type="submit" className="sp-btn sp-btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSaving}>
                  {isSaving ? '⏳ Saving...' : isEdit ? '💾 Save Changes' : '✅ Create Product'}
                </button>
              </div>
            </div>

            {savedProductId ? (
              <div className="sp-card">
                <div className="sp-card__head">
                  <h2 className="sp-card__title">🖼️ Images</h2>
                </div>
                <div className="sp-card__body">
                  {imageError && <div className="sp-alert sp-alert--error" style={{ fontSize: '0.8rem' }}>{imageError}</div>}
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {images.map(img => (
                      <div key={img.id} style={{ border: img.is_primary ? '2px solid var(--sel-accent)' : '1px solid var(--sel-card-border)', borderRadius: 'var(--sel-radius-sm)', overflow: 'hidden', background: 'var(--sel-bg)', position: 'relative' }}>
                        <img src={img.image} alt={img.alt_text} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                        {img.is_primary && (
                          <span style={{ position: 'absolute', top: 4, left: 4, background: 'var(--sel-accent)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                            Primary
                          </span>
                        )}
                        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" style={{ flex: 1, padding: '4px' }} onClick={() => handleMakePrimary(img.id)} disabled={img.is_primary}>Primary</button>
                            <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" style={{ padding: '4px', color: 'var(--badge-red-txt)' }} onClick={() => handleDeleteImage(img.id)}>Del</button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--sel-text-muted)' }}>Order:</span>
                            <input className="sp-input" type="number" style={{ padding: '2px 6px', height: 24 }} value={img.sort_order} onChange={e => handleUpdateSortOrder(img.id, Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ border: '2px dashed var(--sel-card-border)', borderRadius: 'var(--sel-radius-sm)', padding: 20, textAlign: 'center', background: 'var(--sel-bg)' }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8 }}>📤</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sel-text-2)' }}>Upload Image</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={imageLoading} />
                    </label>
                    {imageLoading && <p style={{ fontSize: '0.75rem', color: 'var(--sel-text-muted)', marginTop: 4 }}>Uploading...</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="sp-card" style={{ padding: 24, textAlign: 'center', color: 'var(--sel-text-muted)' }}>
                <p>Save product first to upload images.</p>
              </div>
            )}
            
            {/* Fix for right column side-by-side grid responsiveness */}
            <style>
              {`
                @media(min-width: 1024px) {
                  .responsive-grid { grid-template-columns: 1fr 340px !important; }
                }
              `}
            </style>
          </div>
        </div>
      </form>
    </>
  );
};
export const SellerProductCreatePage: React.FC = () => <SellerProductFormPage mode="create" />;
export const SellerProductEditPage: React.FC = () => <SellerProductFormPage mode="edit" />;

export default SellerProductFormPage;
