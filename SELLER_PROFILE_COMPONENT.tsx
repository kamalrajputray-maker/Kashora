import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SellerProfile {
  id: string;
  user_phone: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  store_name: string;
  store_description: string;
  store_logo: string;
  store_banner: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  gst_number: string;
  pan_number: string;
  status: string;
  status_display: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

interface SellerProfilePageProps {
  token: string;
}

const SellerProfilePage: React.FC<SellerProfilePageProps> = ({ token }) => {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<SellerProfile>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/seller/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProfile(response.data);
      setFormData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await axios.patch('/api/v1/seller/profile/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProfile(response.data);
      setEditing(false);
      setError(null);
      // Show success message
      console.log('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div className="seller-profile-page">
      <div className="profile-header">
        <h1>Seller Profile</h1>
        {profile.status_display && (
          <div className={`status-badge status-${profile.status.toLowerCase()}`}>
            {profile.status_display}
          </div>
        )}
      </div>

      {profile.rejection_reason && (
        <div className="rejection-notice">
          <strong>Rejection Reason:</strong>
          <p>{profile.rejection_reason}</p>
        </div>
      )}

      {!editing ? (
        <div className="profile-view">
          <section className="section">
            <h2>User Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Phone</label>
                <p>{profile.user_phone}</p>
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{profile.user_email}</p>
              </div>
              <div className="info-item">
                <label>Name</label>
                <p>{profile.user_first_name} {profile.user_last_name}</p>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Store Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Store Name</label>
                <p>{profile.store_name || 'Not set'}</p>
              </div>
              <div className="info-item full-width">
                <label>Store Description</label>
                <p>{profile.store_description || 'Not set'}</p>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Business Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Business Name</label>
                <p>{profile.business_name}</p>
              </div>
              <div className="info-item">
                <label>Business Email</label>
                <p>{profile.business_email || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Business Phone</label>
                <p>{profile.business_phone || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>GST Number</label>
                <p>{profile.gst_number}</p>
              </div>
              <div className="info-item">
                <label>PAN Number</label>
                <p>{profile.pan_number}</p>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Address Information</h2>
            <div className="info-grid">
              <div className="info-item full-width">
                <label>Address Line 1</label>
                <p>{profile.address_line_1 || 'Not set'}</p>
              </div>
              <div className="info-item full-width">
                <label>Address Line 2</label>
                <p>{profile.address_line_2 || 'Not set'}</p>
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
          </section>

          <button onClick={() => setEditing(true)} className="btn btn-primary">
            Edit Profile
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="profile-edit-form">
          <section className="section">
            <h2>Store Information</h2>
            <div className="form-group">
              <label>Store Name</label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Store Description</label>
              <textarea
                name="store_description"
                value={formData.store_description || ''}
                onChange={handleInputChange}
              />
            </div>
          </section>

          <section className="section">
            <h2>Business Information</h2>
            <div className="form-group">
              <label>Business Email</label>
              <input
                type="email"
                name="business_email"
                value={formData.business_email || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Business Phone</label>
              <input
                type="tel"
                name="business_phone"
                value={formData.business_phone || ''}
                onChange={handleInputChange}
              />
            </div>
          </section>

          <section className="section">
            <h2>Address Information</h2>
            <div className="form-group full-width">
              <label>Address Line 1</label>
              <input
                type="text"
                name="address_line_1"
                value={formData.address_line_1 || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group full-width">
              <label>Address Line 2</label>
              <input
                type="text"
                name="address_line_2"
                value={formData.address_line_2 || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="state"
                value={formData.state || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Postal Code</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                name="country"
                value={formData.country || ''}
                onChange={handleInputChange}
              />
            </div>
          </section>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFormData(profile);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SellerProfilePage;
