import React, { useEffect, useState } from 'react';
import { settingsAPI, adminCategoryAPI, SiteSettings, Category } from '../../services/api';

const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await adminCategoryAPI.getCategories({ page: 1, limit: 1000 });
      setCategories(res.data.results);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await settingsAPI.get();
      setSettings(res.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleIdentitySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingIdentity(true);
    setMessage(null);
    try {
      const formData = new FormData();
      if (logoFile) formData.append('site_logo', logoFile);
      if (faviconFile) formData.append('site_favicon', faviconFile);
      
      const res = await settingsAPI.update(formData);
      setSettings(res.data);
      setLogoFile(null);
      setFaviconFile(null);
      setMessage({ type: 'success', text: 'Global Identity Settings updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update identity settings.' });
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleBannerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingBanner(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('promo_banner_title', settings.promo_banner_title);
      formData.append('promo_banner_subtitle', settings.promo_banner_subtitle);
      formData.append('promo_banner_button_text', settings.promo_banner_button_text);
      formData.append('promo_banner_link', settings.promo_banner_link);
      if (imageFile) {
        formData.append('promo_banner_image', imageFile);
      }
      
      const res = await settingsAPI.update(formData);
      setSettings(res.data);
      setImageFile(null);
      setMessage({ type: 'success', text: 'Promo Banner Settings updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update banner settings.' });
    } finally {
      setSavingBanner(false);
    }
  };

  if (loading) return <div className="adm-content">Loading...</div>;

  return (
    <div className="adm-content" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--adm-text-1)', marginBottom: '24px' }}>
        Site Settings
      </h2>

      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          borderRadius: '6px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ background: 'var(--adm-card-bg)', borderRadius: '12px', padding: '24px', border: '1px solid var(--adm-card-border)', maxWidth: '600px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '16px', color: 'var(--adm-text-1)' }}>Global Identity Settings</h3>
        <form onSubmit={handleIdentitySave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '6px' }}>
              Site Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setLogoFile(e.target.files[0]);
                }
              }}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--adm-card-border)', borderRadius: '6px', fontSize: '1rem', background: 'var(--adm-bg)', color: 'var(--adm-text-1)' }}
            />
            {settings?.site_logo && !logoFile && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-text-3)' }}>
                Current Logo: <a href={settings.site_logo} target="_blank" rel="noreferrer" style={{ color: 'var(--adm-accent)' }}>View</a>
              </div>
            )}
            {logoFile && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-text-3)' }}>
                New logo selected: {logoFile.name}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '6px' }}>
              Site Favicon
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFaviconFile(e.target.files[0]);
                }
              }}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--adm-card-border)', borderRadius: '6px', fontSize: '1rem', background: 'var(--adm-bg)', color: 'var(--adm-text-1)' }}
            />
            {settings?.site_favicon && !faviconFile && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-text-3)' }}>
                Current Favicon: <a href={settings.site_favicon} target="_blank" rel="noreferrer" style={{ color: 'var(--adm-accent)' }}>View</a>
              </div>
            )}
            {faviconFile && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-text-3)' }}>
                New favicon selected: {faviconFile.name}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={savingIdentity}
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'var(--adm-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: savingIdentity ? 'not-allowed' : 'pointer',
              opacity: savingIdentity ? 0.7 : 1
            }}
          >
            {savingIdentity ? 'Saving...' : 'Save Identity Settings'}
          </button>
        </form>
      </div>

      <div style={{ background: 'var(--adm-card-bg)', borderRadius: '12px', padding: '24px', border: '1px solid var(--adm-card-border)', maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '16px', color: 'var(--adm-text-1)' }}>Buyer Homepage Promo Banner</h3>
        
        <form onSubmit={handleBannerSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '6px' }}>
              Banner Title
            </label>
            <input
              type="text"
              value={settings?.promo_banner_title || ''}
              onChange={(e) => setSettings(s => s ? { ...s, promo_banner_title: e.target.value } : null)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--adm-card-border)', borderRadius: '6px', fontSize: '1rem', background: 'var(--adm-bg)', color: 'var(--adm-text-1)' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '6px' }}>
              Banner Subtitle
            </label>
            <input
              type="text"
              value={settings?.promo_banner_subtitle || ''}
              onChange={(e) => setSettings(s => s ? { ...s, promo_banner_subtitle: e.target.value } : null)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--adm-card-border)', borderRadius: '6px', fontSize: '1rem', background: 'var(--adm-bg)', color: 'var(--adm-text-1)' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '6px' }}>
              Button Text
            </label>
            <input
              type="text"
              value={settings?.promo_banner_button_text || ''}
              onChange={(e) => setSettings(s => s ? { ...s, promo_banner_button_text: e.target.value } : null)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--adm-card-border)', borderRadius: '6px', fontSize: '1rem', background: 'var(--adm-bg)', color: 'var(--adm-text-1)' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '6px' }}>
              Banner Target Link (Destination)
            </label>
            <select
              value={settings?.promo_banner_link || '/products'}
              onChange={(e) => setSettings(s => s ? { ...s, promo_banner_link: e.target.value } : null)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--adm-card-border)', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box', background: 'var(--adm-bg)', color: 'var(--adm-text-1)', outline: 'none' }}
            >
              <option value="/products">All Products</option>
              {categories.map(cat => (
                <option key={cat.id} value={`/products?category=${cat.slug}`}>
                  Category: {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-2)', marginBottom: '6px' }}>
              Banner Background Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setImageFile(e.target.files[0]);
                }
              }}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--adm-card-border)', borderRadius: '6px', fontSize: '1rem', background: 'var(--adm-bg)', color: 'var(--adm-text-1)' }}
            />
            {settings?.promo_banner_image && !imageFile && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-text-3)' }}>
                Current Image: <a href={settings.promo_banner_image} target="_blank" rel="noreferrer" style={{ color: 'var(--adm-accent)' }}>View</a>
              </div>
            )}
            {imageFile && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--adm-text-3)' }}>
                New image selected: {imageFile.name}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={savingBanner}
            style={{
              marginTop: '24px',
              padding: '12px',
              backgroundColor: 'var(--adm-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: savingBanner ? 'not-allowed' : 'pointer',
              opacity: savingBanner ? 0.7 : 1
            }}
          >
            {savingBanner ? 'Saving...' : 'Save Banner Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
