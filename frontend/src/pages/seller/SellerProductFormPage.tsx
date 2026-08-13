import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  sellerProductAPI, catalogAPI, Product,
  sellerAttributeAPI, sellerVariantAPI,
  ProductAttribute, ProductVariant,
} from '../../services/api';
import '../../styles/seller.css';

// ─────────────────────────────────────────────────────────────────────────────
// Inline styles — premium Meesho / Amazon–style
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Inter', 'Segoe UI', sans-serif" },
  header: {
    background: 'linear-gradient(135deg, #6c63ff 0%, #e040fb 100%)',
    color: '#fff', padding: '1.5rem 2rem',
    display: 'flex', alignItems: 'center', gap: '1rem',
    boxShadow: '0 4px 20px rgba(108,99,255,0.3)',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
    padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
  },
  body: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', padding: '2rem', maxWidth: '1400px', margin: '0 auto' },
  card: { background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '1rem', fontWeight: '700', color: '#1a1a2e', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#555', marginBottom: '0.4rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input: { width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const },
  inputFocus: { borderColor: '#6c63ff' },
  textarea: { width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', resize: 'vertical' as const, minHeight: '100px', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#fff', boxSizing: 'border-box' as const },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  field: { marginBottom: '1rem' },
  error: { color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem' },
  apiError: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' },
  primaryBtn: { background: 'linear-gradient(135deg, #6c63ff, #e040fb)', color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', width: '100%', transition: 'opacity 0.2s' },
  secondaryBtn: { background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' },
  dangerBtn: { background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' },
  successBtn: { background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ede9fe', color: '#7c3aed', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '500', margin: '0.2rem' },
  chipRemove: { background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 0.1rem' },
  badge: (active: boolean) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
    background: active ? '#d1fae5' : '#fee2e2', color: active ? '#065f46' : '#dc2626',
  }),
  variantTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.85rem' },
  th: { padding: '0.6rem 0.75rem', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' as const, fontWeight: '700', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase' as const },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' as const },
  smallInput: { padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' as const },
  divider: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.25rem 0' },
  statusPill: (s: string) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
    background: s === 'ACTIVE' ? '#d1fae5' : s === 'DRAFT' ? '#fef9c3' : s === 'PENDING' ? '#dbeafe' : '#fee2e2',
    color: s === 'ACTIVE' ? '#065f46' : s === 'DRAFT' ? '#854d0e' : s === 'PENDING' ? '#1e40af' : '#dc2626',
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
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

  // Load categories
  useEffect(() => { catalogAPI.listCategories().then(r => setCategories(r.data)); }, []);

  // Load product if editing
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

  // Load attributes & variants when we have a product id
  const loadAttributesAndVariants = useCallback(async (pid: string) => {
    setAttrLoading(true);
    setVariantLoading(true);
    try {
      const [attrRes, varRes] = await Promise.all([sellerAttributeAPI.list(pid), sellerVariantAPI.list(pid)]);
      setAttributes(attrRes.data);
      setVariants(varRes.data);
    } catch { /* silently ignore */ } finally {
      setAttrLoading(false);
      setVariantLoading(false);
    }
  }, []);

  useEffect(() => { if (savedProductId) loadAttributesAndVariants(savedProductId); }, [savedProductId, loadAttributesAndVariants]);

  // ─── Product form handlers ───────────────────────────────────────────────
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

  // ─── Attribute handlers ──────────────────────────────────────────────────
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

  // ─── Variant generate handler ────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!savedProductId) return;
    const groups = attributes.map(a => (selectedGroups[a.id] || a.values.map(v => v.id)));
    if (groups.some(g => g.length === 0)) { setVariantApiError('All attributes must have at least one value selected.'); return; }
    setVariantLoading(true);
    setVariantApiError(null);
    try {
      const res = await sellerVariantAPI.generate(savedProductId, { base_price: generatePrice, sku_prefix: generatePrefix, attribute_value_groups: groups });
      setVariantSuccess(`Generated ${res.data.created} variants. ${res.data.skipped} skipped (duplicates).`);
      await loadAttributesAndVariants(savedProductId);
    } catch (err: any) {
      setVariantApiError(err.response?.data?.detail || 'Failed to generate variants.');
    } finally { setVariantLoading(false); }
  };

  // ─── Variant inline edit handlers ────────────────────────────────────────
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

  if (isLoadingProduct) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div><p>Loading product...</p></div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/seller/products')}>← Back</button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
            {isEdit ? '✏️ Edit Product' : '✨ Create New Product'}
          </h1>
          {isEdit && savedProductId && <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>ID: {savedProductId}</p>}
        </div>
        {isEdit && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={S.statusPill(form.status)}>{form.status}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={S.body}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Basic Info */}
            <div style={S.card}>
              <p style={S.sectionTitle}>📦 Basic Information</p>
              {apiError && <div style={S.apiError}>{apiError}</div>}

              <div style={S.field}>
                <label style={S.label}>Product Name *</label>
                <input style={S.input} name="name" value={form.name} onChange={handleChange} placeholder="e.g. Women's Floral Kurti" />
                {errors.name && <p style={S.error}>{errors.name}</p>}
              </div>

              <div style={S.row}>
                <div>
                  <label style={S.label}>Brand *</label>
                  <input style={S.input} name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. BIBA" />
                  {errors.brand && <p style={S.error}>{errors.brand}</p>}
                </div>
                <div>
                  <label style={S.label}>Category *</label>
                  <select style={S.select} name="category" value={form.category} onChange={handleChange}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.category && <p style={S.error}>{errors.category}</p>}
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>Description *</label>
                <textarea style={S.textarea} name="description" value={form.description} onChange={handleChange} placeholder="Describe the product, materials, care instructions..." />
                {errors.description && <p style={S.error}>{errors.description}</p>}
              </div>

              <div style={S.field}>
                <label style={S.label}>URL Slug</label>
                <input style={S.input} name="slug" value={form.slug} onChange={e => { setSlugManual(true); setForm(p => ({ ...p, slug: e.target.value })); }} placeholder="auto-generated-from-name" />
              </div>
            </div>

            {/* Pricing */}
            <div style={S.card}>
              <p style={S.sectionTitle}>💰 Pricing & Tax</p>
              <div style={S.row}>
                <div>
                  <label style={S.label}>Base Price (₹) *</label>
                  <input style={S.input} name="base_price" value={form.base_price} onChange={handleChange} type="number" min="0" step="0.01" placeholder="499.00" />
                  {errors.base_price && <p style={S.error}>{errors.base_price}</p>}
                </div>
                <div>
                  <label style={S.label}>Compare-at Price (₹)</label>
                  <input style={S.input} name="compare_at_price" value={form.compare_at_price} onChange={handleChange} type="number" min="0" step="0.01" placeholder="799.00" />
                  {errors.compare_at_price && <p style={S.error}>{errors.compare_at_price}</p>}
                </div>
              </div>
              <div style={S.row}>
                <div>
                  <label style={S.label}>Tax %</label>
                  <input style={S.input} name="tax_percentage" value={form.tax_percentage} onChange={handleChange} type="number" min="0" max="100" />
                </div>
                <div>
                  <label style={S.label}>Shipping Charge (₹)</label>
                  <input style={S.input} name="shipping_charge" value={form.shipping_charge} onChange={handleChange} type="number" min="0" />
                </div>
              </div>
            </div>

            {/* Returns */}
            <div style={S.card}>
              <p style={S.sectionTitle}>↩️ Return Policy</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <input type="checkbox" id="returnable" name="returnable" checked={form.returnable} onChange={handleChange} style={{ width: '1.1rem', height: '1.1rem' }} />
                <label htmlFor="returnable" style={{ fontWeight: '600', color: '#1a1a2e' }}>Product is Returnable</label>
              </div>
              {form.returnable && (
                <div>
                  <label style={S.label}>Return Window (days)</label>
                  <input style={{ ...S.input, maxWidth: '150px' }} name="return_window_days" value={form.return_window_days} onChange={handleChange} type="number" min="1" max="30" />
                </div>
              )}
            </div>

            {/* Variants & Attributes Section — only available after product is saved */}
            {savedProductId ? (
              <div style={S.card}>
                <p style={S.sectionTitle}>🎨 Product Attributes & Variants</p>
                {variantApiError && <div style={S.apiError}>{variantApiError}</div>}
                {variantSuccess && <div style={{ ...S.apiError, background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46' }}>{variantSuccess}</div>}

                {/* Add Attribute */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <input
                    style={{ ...S.input, flex: 1 }}
                    placeholder="Attribute name (e.g. Color, Size, Material)"
                    value={newAttrName}
                    onChange={e => setNewAttrName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttribute())}
                  />
                  <button type="button" style={S.secondaryBtn} onClick={addAttribute} disabled={!newAttrName.trim()}>+ Add</button>
                </div>

                {attrLoading ? <p>Loading attributes...</p> : attributes.map(attr => (
                  <div key={attr.id} style={{ marginBottom: '1rem', background: '#fafbff', padding: '1rem', borderRadius: '10px', border: '1.5px solid #e0e7ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <strong style={{ color: '#3730a3', fontSize: '0.9rem' }}>🏷 {attr.name}</strong>
                      <button type="button" style={S.dangerBtn} onClick={() => deleteAttribute(attr.id)}>Remove Attribute</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
                      {attr.values.map(v => (
                        <span key={v.id} style={S.chip}>
                          {v.value}
                          <button type="button" style={S.chipRemove} onClick={() => removeValue(attr.id, v.id)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        style={{ ...S.input, flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        placeholder={`Add ${attr.name} value...`}
                        value={newValueInputs[attr.id] || ''}
                        onChange={e => setNewValueInputs(prev => ({ ...prev, [attr.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addValue(attr.id))}
                      />
                      <button type="button" style={{ ...S.secondaryBtn, padding: '0.4rem 0.75rem', fontSize: '0.82rem' }} onClick={() => addValue(attr.id)}>Add Value</button>
                    </div>
                  </div>
                ))}

                {attributes.length > 0 && attributes.every(a => a.values.length > 0) && (
                  <>
                    <hr style={S.divider} />
                    <p style={{ ...S.sectionTitle, fontSize: '0.9rem' }}>⚡ Generate Variants (Cartesian Product)</p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={S.label}>Base Price (₹)</label>
                        <input style={S.input} type="number" min="0" value={generatePrice} onChange={e => setGeneratePrice(e.target.value)} placeholder="499" />
                      </div>
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={S.label}>SKU Prefix</label>
                        <input style={S.input} maxLength={10} value={generatePrefix} onChange={e => setGeneratePrefix(e.target.value.toUpperCase())} placeholder="SKU" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button type="button" style={{ ...S.primaryBtn, width: 'auto', padding: '0.6rem 1.25rem' }} onClick={handleGenerate} disabled={variantLoading || !generatePrice}>
                          {variantLoading ? '⏳ Generating...' : '✨ Generate Variants'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Variants Table */}
                {variants.length > 0 && (
                  <>
                    <hr style={S.divider} />
                    <p style={{ ...S.sectionTitle, fontSize: '0.9rem' }}>📋 Variants ({variants.length})</p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={S.variantTable}>
                        <thead>
                          <tr>
                            <th style={S.th}>Combination</th>
                            <th style={S.th}>SKU</th>
                            <th style={S.th}>Price (₹)</th>
                            <th style={S.th}>Compare-at (₹)</th>
                            <th style={S.th}>Weight (g)</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map(v => {
                            const editing = editingVariant[v.id] || {};
                            const isChanged = Object.keys(editing).length > 0;
                            return (
                              <tr key={v.id}>
                                <td style={S.td}>
                                  <span style={{ fontWeight: '600', color: '#3730a3', fontSize: '0.82rem' }}>
                                    {v.attribute_summary || '—'}
                                  </span>
                                </td>
                                <td style={S.td}>
                                  <input style={S.smallInput} value={editing.sku ?? v.sku} onChange={e => handleVariantEdit(v.id, 'sku', e.target.value)} />
                                </td>
                                <td style={S.td}>
                                  <input style={{ ...S.smallInput, width: '80px' }} type="number" value={editing.price ?? v.price} onChange={e => handleVariantEdit(v.id, 'price', e.target.value)} />
                                </td>
                                <td style={S.td}>
                                  <input style={{ ...S.smallInput, width: '80px' }} type="number" value={editing.compare_at_price ?? v.compare_at_price ?? ''} onChange={e => handleVariantEdit(v.id, 'compare_at_price', e.target.value || null)} />
                                </td>
                                <td style={S.td}>
                                  <input style={{ ...S.smallInput, width: '70px' }} type="number" value={editing.weight ?? v.weight ?? ''} onChange={e => handleVariantEdit(v.id, 'weight', e.target.value || null)} />
                                </td>
                                <td style={S.td}>
                                  <span style={S.badge(v.is_active)}>{v.is_active ? 'Active' : 'Inactive'}</span>
                                </td>
                                <td style={S.td}>
                                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                    {isChanged && <button type="button" style={S.successBtn} onClick={() => saveVariant(v.id)}>Save</button>}
                                    <button type="button" style={v.is_active ? S.dangerBtn : S.successBtn} onClick={() => toggleVariantActive(v)}>
                                      {v.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button type="button" style={S.dangerBtn} onClick={() => deleteVariant(v.id)}>Delete</button>
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
            ) : (
              <div style={{ ...S.card, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💡</p>
                <p style={{ fontWeight: '600' }}>Save the product first to manage variants & attributes.</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Status & Submit */}
            <div style={S.card}>
              <p style={S.sectionTitle}>🚀 Product Status</p>
              <div style={S.field}>
                <label style={S.label}>Status</label>
                <select style={S.select} name="status" value={form.status} onChange={handleChange}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <button type="submit" style={S.primaryBtn} disabled={isSaving}>
                {isSaving ? '⏳ Saving...' : isEdit ? '💾 Save Changes' : '✅ Create Product'}
              </button>
              {isEdit && (
                <button
                  type="button"
                  style={{ ...S.secondaryBtn, width: '100%', marginTop: '0.75rem' }}
                  onClick={() => navigate('/seller/products')}
                >
                  ← Back to Products
                </button>
              )}
            </div>

            {/* Tips */}
            <div style={{ ...S.card, background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)' }}>
              <p style={{ ...S.sectionTitle, color: '#3730a3' }}>💡 Tips</p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#4c1d95', fontSize: '0.85rem', lineHeight: '1.8' }}>
                <li>Save the product first, then add attributes like <strong>Color</strong>, <strong>Size</strong>, or <strong>Material</strong>.</li>
                <li>Add values for each attribute (e.g. Red, Blue, S, M, L).</li>
                <li>Use <strong>Generate Variants</strong> to auto-create all combinations.</li>
                <li>Edit SKU, price, and weight directly in the variants table.</li>
                <li>Submit for admin review when ready.</li>
              </ul>
            </div>

            {/* Product Summary (edit mode) */}
            {isEdit && variants.length > 0 && (
              <div style={S.card}>
                <p style={S.sectionTitle}>📊 Variant Summary</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Total Variants</span>
                    <strong>{variants.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Active</span>
                    <strong style={{ color: '#065f46' }}>{variants.filter(v => v.is_active).length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Inactive</span>
                    <strong style={{ color: '#dc2626' }}>{variants.filter(v => !v.is_active).length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Attributes</span>
                    <strong>{attributes.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Price Range</span>
                    <strong>₹{Math.min(...variants.map(v => Number(v.price)))} – ₹{Math.max(...variants.map(v => Number(v.price)))}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
export const SellerProductCreatePage: React.FC = () => <SellerProductFormPage mode="create" />;
export const SellerProductEditPage: React.FC = () => <SellerProductFormPage mode="edit" />;

export default SellerProductFormPage;
