import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminSellerAPI, AdminSellerDetail } from '../services/api';
import '../styles/admin.css';

interface ActionModal {
  type: 'approve' | 'reject' | 'suspend' | 'activate' | 'block' | null;
  reason?: string;
}

const AdminSellerDetailPage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();

  const [seller, setSeller] = useState<AdminSellerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModal>({ type: null });
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    if (sellerId) {
      fetchSellerDetail();
    }
  }, [sellerId]);

  const fetchSellerDetail = async () => {
    try {
      setIsLoading(true);
      if (!sellerId) return;
      const response = await adminSellerAPI.getSellerDetail(sellerId);
      setSeller(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load seller details');
      console.error('Error fetching seller:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!sellerId || !actionModal.type) return;

    try {
      setIsActioning(true);

      switch (actionModal.type) {
        case 'approve':
          await adminSellerAPI.approveSeller(sellerId);
          setSuccess('Seller approved successfully');
          break;
        case 'reject':
          if (!actionModal.reason) {
            setError('Please provide a rejection reason');
            return;
          }
          await adminSellerAPI.rejectSeller(sellerId, {
            rejection_reason: actionModal.reason,
          });
          setSuccess('Seller rejected');
          break;
        case 'suspend':
          await adminSellerAPI.suspendSeller(sellerId);
          setSuccess('Seller suspended');
          break;
        case 'activate':
          await adminSellerAPI.activateSeller(sellerId);
          setSuccess('Seller activated');
          break;
        case 'block':
          await adminSellerAPI.blockSeller(sellerId);
          setSuccess('Seller blocked');
          break;
      }

      setActionModal({ type: null });
      await fetchSellerDetail();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Action failed';
      setError(errorMsg);
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Loading seller details...</div>;
  }

  if (!seller) {
    return <div className="error-container">Seller not found</div>;
  }

  return (
    <div className="admin-seller-detail-container">
      {/* Header */}
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/sellers')}>
          ← Back to Sellers
        </button>
        <div className="header-info">
          <h1>{seller.user_name}</h1>
          <div
            className="status-badge"
            style={{ backgroundColor: getStatusColor(seller.status) }}
          >
            {seller.status_display}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Rejection Reason */}
      {seller.status === 'REJECTED' && seller.rejection_reason && (
        <div className="alert alert-warning">
          <h4>Rejection Reason:</h4>
          <p>{seller.rejection_reason}</p>
          {seller.rejected_by_name && (
            <p className="text-muted">Rejected by: {seller.rejected_by_name}</p>
          )}
          {seller.rejected_at && (
            <p className="text-muted">
              On: {new Date(seller.rejected_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="actions-bar">
        {seller.status === 'PENDING' && (
          <>
            <button
              className="btn btn-success"
              onClick={() => setActionModal({ type: 'approve' })}
            >
              ✓ Approve
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setActionModal({ type: 'reject' })}
            >
              ✗ Reject
            </button>
          </>
        )}

        {seller.status === 'APPROVED' && (
          <>
            <button
              className="btn btn-warning"
              onClick={() => setActionModal({ type: 'suspend' })}
            >
              ⏸ Suspend
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setActionModal({ type: 'block' })}
            >
              🚫 Block
            </button>
          </>
        )}

        {seller.status === 'SUSPENDED' && (
          <>
            <button
              className="btn btn-success"
              onClick={() => setActionModal({ type: 'activate' })}
            >
              ✓ Activate
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setActionModal({ type: 'block' })}
            >
              🚫 Block
            </button>
          </>
        )}
      </div>

      {/* Personal Information */}
      <section className="detail-section">
        <h2>Personal Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Name</label>
            <p>{`${seller.user_first_name} ${seller.user_last_name}`}</p>
          </div>
          <div className="info-item">
            <label>Phone</label>
            <p>{seller.user_phone}</p>
          </div>
          <div className="info-item">
            <label>Email</label>
            <p>{seller.user_email}</p>
          </div>
          <div className="info-item">
            <label>Account Status</label>
            <p>{seller.status_display}</p>
          </div>
        </div>
      </section>

      {/* Business Information */}
      <section className="detail-section">
        <h2>Business Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Business Name</label>
            <p>{seller.business_name || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>Business Email</label>
            <p>{seller.business_email || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>Business Phone</label>
            <p>{seller.business_phone || 'Not provided'}</p>
          </div>
        </div>
      </section>

      {/* Store Information */}
      <section className="detail-section">
        <h2>Store Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Store Name</label>
            <p>{seller.store_name || 'Not set'}</p>
          </div>
          <div className="info-item">
            <label>Store Description</label>
            <p>{seller.store_description || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>Logo</label>
            <p>{seller.store_logo ? 'Uploaded' : 'Not uploaded'}</p>
          </div>
          <div className="info-item">
            <label>Banner</label>
            <p>{seller.store_banner ? 'Uploaded' : 'Not uploaded'}</p>
          </div>
        </div>
      </section>

      {/* Address Information */}
      <section className="detail-section">
        <h2>Address Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Address Line 1</label>
            <p>{seller.address_line_1 || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>Address Line 2</label>
            <p>{seller.address_line_2 || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>City</label>
            <p>{seller.city || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>State</label>
            <p>{seller.state || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>Postal Code</label>
            <p>{seller.postal_code || 'Not provided'}</p>
          </div>
          <div className="info-item">
            <label>Country</label>
            <p>{seller.country || 'Not provided'}</p>
          </div>
        </div>
      </section>

      {/* Tax Information */}
      <section className="detail-section">
        <h2>Tax Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>GST Number</label>
            <p>{seller.gst_number}</p>
          </div>
          <div className="info-item">
            <label>PAN Number</label>
            <p>{seller.pan_number}</p>
          </div>
          <div className="info-item">
            <label>KYC Status</label>
            <p>{seller.kyc_status}</p>
          </div>
        </div>
      </section>

      {/* Metadata */}
      <section className="detail-section">
        <h2>Account Metadata</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Created On</label>
            <p>{new Date(seller.created_at).toLocaleDateString()}</p>
          </div>
          <div className="info-item">
            <label>Last Updated</label>
            <p>{new Date(seller.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </section>

      {/* Modal */}
      {actionModal.type && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {actionModal.type === 'approve' && 'Approve Seller'}
                {actionModal.type === 'reject' && 'Reject Seller'}
                {actionModal.type === 'suspend' && 'Suspend Seller'}
                {actionModal.type === 'activate' && 'Activate Seller'}
                {actionModal.type === 'block' && 'Block Seller'}
              </h2>
            </div>

            <div className="modal-body">
              <p>
                {actionModal.type === 'approve' && `Approve ${seller.user_name}?`}
                {actionModal.type === 'reject' &&
                  'Please provide a reason for rejection:'}
                {actionModal.type === 'suspend' && `Suspend ${seller.user_name}?`}
                {actionModal.type === 'activate' && `Activate ${seller.user_name}?`}
                {actionModal.type === 'block' && `Block ${seller.user_name}?`}
              </p>

              {actionModal.type === 'reject' && (
                <textarea
                  value={actionModal.reason || ''}
                  onChange={(e) =>
                    setActionModal({
                      ...actionModal,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Enter rejection reason (minimum 10 characters)"
                  minLength={10}
                  rows={4}
                  className="form-control"
                />
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setActionModal({ type: null })}
                disabled={isActioning}
              >
                Cancel
              </button>
              <button
                className={`btn btn-${
                  actionModal.type === 'reject' ||
                  actionModal.type === 'block'
                    ? 'danger'
                    : 'success'
                }`}
                onClick={handleAction}
                disabled={
                  isActioning ||
                  (actionModal.type === 'reject' &&
                    (!actionModal.reason ||
                      actionModal.reason.length < 10))
                }
              >
                {isActioning ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
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

export default AdminSellerDetailPage;
