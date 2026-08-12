import React, { useState, useEffect } from 'react';
import { sellerAPI, SellerProfile, SellerProfileUpdate } from '../../services/api';
import '../../styles/seller.css';

interface EditMode {
  [key: string]: boolean;
}

const SellerProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [formData, setFormData] = useState<SellerProfileUpdate>({});
  const [editMode, setEditMode] = useState<EditMode>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  const toggleEditMode = (section: string) => {
    setEditMode((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
      const errorMsg = err.response?.data?.detail || 'Failed to update profile';
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="error-container">Failed to load profile</div>;
  }

  return (
    <div className="seller-profile-container">
      <div className="profile-header">
        <h1>Seller Profile</h1>
        <div className="status-badge" style={{ backgroundColor: getStatusColor(profile.status) }}>
          {profile.status_display}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Rejection Reason Display */}
      {profile.status === 'REJECTED' && profile.rejection_reason && (
        <div className="alert alert-warning">
          <h4>Rejection Reason:</h4>
          <p>{profile.rejection_reason}</p>
        </div>
      )}

      {/* Account Information */}
      <section className="profile-section">
        <h2>Account Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Name</label>
            <p>{`${profile.user_first_name} ${profile.user_last_name}`}</p>
          </div>
          <div className="info-item">
            <label>Phone</label>
            <p>{profile.user_phone}</p>
          </div>
          <div className="info-item">
            <label>Email</label>
            <p>{profile.user_email}</p>
          </div>
          <div className="info-item">
            <label>Status</label>
            <p>{profile.status_display}</p>
          </div>
        </div>
      </section>

      {/* Store Information */}
      <section className="profile-section editable-section">
        <div className="section-header">
          <h2>Store Information</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => toggleEditMode('store')}
          >
            {editMode.store ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editMode.store ? (
          <div className="edit-form">
            <div className="form-group">
              <label>Store Name</label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name || profile.store_name || ''}
                onChange={handleInputChange}
                placeholder="Enter store name"
              />
            </div>

            <div className="form-group">
              <label>Store Description</label>
              <textarea
                name="store_description"
                value={formData.store_description || profile.store_description || ''}
                onChange={handleInputChange}
                placeholder="Enter store description"
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Store Logo</label>
                <input
                  type="file"
                  name="store_logo"
                  onChange={handleFileChange}
                  accept="image/*"
                />
                {profile.store_logo && (
                  <small>Current: {profile.store_logo.split('/').pop()}</small>
                )}
              </div>

              <div className="form-group">
                <label>Store Banner</label>
                <input
                  type="file"
                  name="store_banner"
                  onChange={handleFileChange}
                  accept="image/*"
                />
                {profile.store_banner && (
                  <small>Current: {profile.store_banner.split('/').pop()}</small>
                )}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || Object.keys(formData).length === 0}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <label>Store Name</label>
              <p>{profile.store_name || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>Description</label>
              <p>{profile.store_description || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>Logo</label>
              <p>{profile.store_logo ? 'Uploaded' : 'Not uploaded'}</p>
            </div>
            <div className="info-item">
              <label>Banner</label>
              <p>{profile.store_banner ? 'Uploaded' : 'Not uploaded'}</p>
            </div>
          </div>
        )}
      </section>

      {/* Business Information */}
      <section className="profile-section editable-section">
        <div className="section-header">
          <h2>Business Information</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => toggleEditMode('business')}
          >
            {editMode.business ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editMode.business ? (
          <div className="edit-form">
            <div className="form-group">
              <label>Business Name</label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name || profile.business_name || ''}
                onChange={handleInputChange}
                placeholder="Enter business name"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Business Email</label>
                <input
                  type="email"
                  name="business_email"
                  value={formData.business_email || profile.business_email || ''}
                  onChange={handleInputChange}
                  placeholder="business@example.com"
                />
              </div>

              <div className="form-group">
                <label>Business Phone</label>
                <input
                  type="tel"
                  name="business_phone"
                  value={formData.business_phone || profile.business_phone || ''}
                  onChange={handleInputChange}
                  placeholder="Business phone number"
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || Object.keys(formData).length === 0}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <label>Business Name</label>
              <p>{profile.business_name || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>Business Email</label>
              <p>{profile.business_email || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>Business Phone</label>
              <p>{profile.business_phone || 'Not set'}</p>
            </div>
          </div>
        )}
      </section>

      {/* Address Information */}
      <section className="profile-section editable-section">
        <div className="section-header">
          <h2>Address Information</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => toggleEditMode('address')}
          >
            {editMode.address ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editMode.address ? (
          <div className="edit-form">
            <div className="form-group">
              <label>Address Line 1</label>
              <input
                type="text"
                name="address_line_1"
                value={formData.address_line_1 || profile.address_line_1 || ''}
                onChange={handleInputChange}
                placeholder="Street address"
              />
            </div>

            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                name="address_line_2"
                value={formData.address_line_2 || profile.address_line_2 || ''}
                onChange={handleInputChange}
                placeholder="Apt, suite, etc. (optional)"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || profile.city || ''}
                  onChange={handleInputChange}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state || profile.state || ''}
                  onChange={handleInputChange}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Postal Code</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code || profile.postal_code || ''}
                  onChange={handleInputChange}
                  placeholder="Postal code"
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country || profile.country || ''}
                  onChange={handleInputChange}
                  placeholder="Country"
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || Object.keys(formData).length === 0}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="info-grid">
            <div className="info-item">
              <label>Address</label>
              <p>{profile.address_line_1 || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>City</label>
              <p>{profile.city || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>State</label>
              <p>{profile.state || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>Postal Code</label>
              <p>{profile.postal_code || 'Not set'}</p>
            </div>
            <div className="info-item">
              <label>Country</label>
              <p>{profile.country || 'Not set'}</p>
            </div>
          </div>
        )}
      </section>

      {/* Tax Information (Read-only) */}
      <section className="profile-section">
        <h2>Tax Information</h2>
        <div className="alert alert-info">
          <p>Tax information cannot be changed once set. Contact support if you need to update.</p>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <label>GST Number</label>
            <p>{profile.gst_number}</p>
          </div>
          <div className="info-item">
            <label>PAN Number</label>
            <p>{profile.pan_number}</p>
          </div>
          <div className="info-item">
            <label>KYC Status</label>
            <p>{profile.kyc_status}</p>
          </div>
        </div>
      </section>

      {/* Timestamps */}
      <section className="profile-section">
        <h2>Profile Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Created On</label>
            <p>{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
          <div className="info-item">
            <label>Last Updated</label>
            <p>{new Date(profile.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    PENDING: '#FFC107',
    APPROVED: '#28A745',
    REJECTED: '#DC3545',
    SUSPENDED: '#FF9800',
    BLOCKED: '#6F42C1',
  };
  return colors[status] || '#6C757D';
}

export default SellerProfilePage;
