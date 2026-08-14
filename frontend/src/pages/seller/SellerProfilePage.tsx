import React, { useState, useEffect } from 'react';
import { sellerAPI, SellerProfile, SellerProfileUpdate, verificationAPI } from '../../services/api';

interface EditMode {
  [key: string]: boolean;
}

const SellerProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [formData, setFormData] = useState<SellerProfileUpdate>({});
  const [kycDocUrl, setKycDocUrl] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const DB_NAME = 'kycDocsDB';
  const STORE_NAME = 'docs';
  
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const loadKycDocument = async (sellerId: string): Promise<File | null> => {
    const db = await openDB();
    return new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(sellerId);
      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await sellerAPI.getProfile();
      setProfile(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const loadDoc = async () => {
      const storedFile = await loadKycDocument(profile.id);
      if (storedFile) {
        const url = URL.createObjectURL(storedFile);
        setKycDocUrl(url);
      }
    };
    loadDoc();
    return () => {
      if (kycDocUrl) {
        URL.revokeObjectURL(kycDocUrl);
      }
    };
  }, [profile?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const toggleEditMode = (section: string) => {
    setEditMode((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = async () => {
    if (Object.keys(formData).length === 0) {
      setError('No changes to save');
      return;
    }
    try {
      setIsSaving(true);
      const response = await sellerAPI.updateProfile(formData);
      setProfile(response.data);
      setFormData({});
      setEditMode({});
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKycFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile?.id) return;
    try {
      setIsSaving(true);
      await verificationAPI.uploadDocument(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setKycDocUrl(objectUrl);
      
      if (profile?.kyc_status === 'PENDING') {
        const statusResponse = await sellerAPI.updateProfile({ kyc_status: 'APPROVED' });
        setProfile(statusResponse.data);
      }
      setSuccess('KYC document uploaded and status updated');
      setSelectedFile(null);
    } catch (err) {
      setError('Failed to upload KYC document');
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'APPROVED') return 'sp-badge sp-badge--green';
    if (s === 'PENDING') return 'sp-badge sp-badge--yellow';
    if (s === 'REJECTED' || s === 'SUSPENDED' || s === 'BLOCKED') return 'sp-badge sp-badge--red';
    return 'sp-badge';
  };

  if (isLoading) return <div className="sp-loading">Loading profile...</div>;
  if (!profile) return <div className="sp-empty">Failed to load profile</div>;

  return (
    <>
      <div className="sp-header">
        <div>
          <h1 className="sp-header__title">Profile</h1>
          <p className="sp-header__sub">Manage your personal and business details</p>
        </div>
        <div>
          <span className={statusBadge(profile.status)} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            Store Status: {profile.status_display}
          </span>
        </div>
      </div>

      {error && <div className="sp-alert sp-alert--error">{error}</div>}
      {success && <div className="sp-alert" style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-txt)', borderLeft: '4px solid var(--badge-green-txt)' }}>{success}</div>}

      {profile.status === 'REJECTED' && profile.rejection_reason && (
        <div className="sp-alert sp-alert--error">
          <strong style={{ display: 'block', marginBottom: 4 }}>Rejection Reason:</strong>
          {profile.rejection_reason}
        </div>
      )}

      {/* Account Info */}
      <div className="sp-card" style={{ marginBottom: 24 }}>
        <div className="sp-card__head">
          <h2 className="sp-card__title">Account Information</h2>
        </div>
        <div className="sp-card__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <div className="sp-label">Name</div>
              <div style={{ color: 'var(--sel-text-1)' }}>{profile.user_first_name} {profile.user_last_name}</div>
            </div>
            <div>
              <div className="sp-label">Phone</div>
              <div style={{ color: 'var(--sel-text-1)' }}>{profile.user_phone}</div>
            </div>
            <div>
              <div className="sp-label">Email</div>
              <div style={{ color: 'var(--sel-text-1)' }}>{profile.user_email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Info */}
      <div className="sp-card" style={{ marginBottom: 24 }}>
        <div className="sp-card__head">
          <h2 className="sp-card__title">Store Information</h2>
          <button className="sp-btn sp-btn--ghost sp-btn--sm" onClick={() => toggleEditMode('store')}>
            {editMode.store ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <div className="sp-card__body">
          {editMode.store ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="sp-field">
                <label className="sp-label">Store Name</label>
                <input className="sp-input" type="text" name="store_name" value={formData.store_name || profile.store_name || ''} onChange={handleInputChange} />
              </div>
              <div className="sp-field">
                <label className="sp-label">Store Description</label>
                <textarea className="sp-input" name="store_description" rows={4} value={formData.store_description || profile.store_description || ''} onChange={handleInputChange} />
              </div>
              <button className="sp-btn sp-btn--primary" onClick={handleSave} disabled={isSaving || Object.keys(formData).length === 0}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div>
                <div className="sp-label">Store Name</div>
                <div style={{ color: 'var(--sel-text-1)' }}>{profile.store_name || 'Not set'}</div>
              </div>
              <div>
                <div className="sp-label">Description</div>
                <div style={{ color: 'var(--sel-text-1)' }}>{profile.store_description || 'Not set'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business Info */}
      <div className="sp-card" style={{ marginBottom: 24 }}>
        <div className="sp-card__head">
          <h2 className="sp-card__title">Business Details</h2>
          <button className="sp-btn sp-btn--ghost sp-btn--sm" onClick={() => toggleEditMode('business')}>
            {editMode.business ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <div className="sp-card__body">
          {editMode.business ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="sp-field">
                <label className="sp-label">Business Name</label>
                <input className="sp-input" type="text" name="business_name" value={formData.business_name || profile.business_name || ''} onChange={handleInputChange} />
              </div>
              <div className="sp-field">
                <label className="sp-label">Business Email</label>
                <input className="sp-input" type="email" name="business_email" value={formData.business_email || profile.business_email || ''} onChange={handleInputChange} />
              </div>
              <div className="sp-field">
                <label className="sp-label">Business Phone</label>
                <input className="sp-input" type="tel" name="business_phone" value={formData.business_phone || profile.business_phone || ''} onChange={handleInputChange} />
              </div>
              <button className="sp-btn sp-btn--primary" onClick={handleSave} disabled={isSaving || Object.keys(formData).length === 0}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div>
                <div className="sp-label">Business Name</div>
                <div style={{ color: 'var(--sel-text-1)' }}>{profile.business_name || 'Not set'}</div>
              </div>
              <div>
                <div className="sp-label">Business Email</div>
                <div style={{ color: 'var(--sel-text-1)' }}>{profile.business_email || 'Not set'}</div>
              </div>
              <div>
                <div className="sp-label">Business Phone</div>
                <div style={{ color: 'var(--sel-text-1)' }}>{profile.business_phone || 'Not set'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax & KYC */}
      <div className="sp-card" style={{ marginBottom: 24 }}>
        <div className="sp-card__head">
          <h2 className="sp-card__title">Tax & KYC</h2>
        </div>
        <div className="sp-card__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <div className="sp-label">GST Number</div>
              <div style={{ color: 'var(--sel-text-1)' }}>{profile.gst_number || 'Not set'}</div>
            </div>
            <div>
              <div className="sp-label">PAN Number</div>
              <div style={{ color: 'var(--sel-text-1)' }}>{profile.pan_number || 'Not set'}</div>
            </div>
            <div>
              <div className="sp-label">KYC Status</div>
              {profile?.kyc_status === 'APPROVED' ? (
                <span className={statusBadge('APPROVED')}>APPROVED</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                  <span className={statusBadge(profile?.kyc_status || 'PENDING')}>{profile?.kyc_status}</span>
                  <input className="sp-input" type="file" accept="image/*,application/pdf" onChange={handleKycFileChange} style={{ padding: 4 }} />
                  <button className="sp-btn sp-btn--primary sp-btn--sm" onClick={handleUpload} disabled={!selectedFile || isSaving}>
                    {isSaving ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SellerProfilePage;
