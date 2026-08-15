import React, { useEffect, useState } from 'react';
import { settingsAPI, SiteSettings } from '../../services/api';

const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('promo_banner_title', settings.promo_banner_title);
      formData.append('promo_banner_subtitle', settings.promo_banner_subtitle);
      formData.append('promo_banner_button_text', settings.promo_banner_button_text);
      if (imageFile) {
        formData.append('promo_banner_image', imageFile);
      }
      
      const res = await settingsAPI.update(formData);
      setSettings(res.data);
      setImageFile(null); // Clear the file input state after success
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
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

      <div style={{ background: 'var(--adm-card-bg)', borderRadius: '12px', padding: '24px', border: '1px solid var(--adm-card-border)', maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '16px', color: 'var(--adm-text-1)' }}>Buyer Homepage Promo Banner</h3>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              Banner Image (Optional)
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
            disabled={saving}
            style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: 'var(--adm-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
