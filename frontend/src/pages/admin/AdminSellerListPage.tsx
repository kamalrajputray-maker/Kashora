import React, { useState, useEffect } from 'react';
import { adminSellerAPI, AdminSellerListItem, AdminSellerListParams } from '../../services/api';

interface Filters {
  status: string;
  city: string;
  state: string;
  kyc_status: string;
  search: string;
  page: number;
}

const badgeClass = (status: string) => {
  const s = status.toUpperCase();
  if (s === 'APPROVED' || s === 'VERIFIED') return 'adm-badge adm-badge--green';
  if (s === 'PENDING') return 'adm-badge adm-badge--yellow';
  if (s === 'REJECTED' || s === 'SUSPENDED' || s === 'BLOCKED') return 'adm-badge adm-badge--red';
  return 'adm-badge';
};

const AdminSellerListPage: React.FC = () => {
  const [sellers, setSellers] = useState<AdminSellerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: '', city: '', state: '', kyc_status: '', search: '', page: 1,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchSellers();
    // eslint-disable-next-line
  }, [filters]);

  const fetchSellers = async () => {
    try {
      setIsLoading(true);
      const params: AdminSellerListParams = {};
      if (filters.status) params.status = filters.status;
      if (filters.city) params.city = filters.city;
      if (filters.state) params.state = filters.state;
      if (filters.kyc_status) params.kyc_status = filters.kyc_status;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;

      const response = await adminSellerAPI.listSellers(params);
      setSellers(response.data.results);
      setTotalCount(response.data.count);
      setError(null);
    } catch (err: any) {
      setError('Failed to load sellers');
      console.error('Error fetching sellers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleReset = () => {
    setFilters({ status: '', city: '', state: '', kyc_status: '', search: '', page: 1 });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <div className="adm-page-header">
        <h1>Seller Management</h1>
        <p>{totalCount} total sellers registered.</p>
      </div>

      <div className="adm-card">
        <div className="adm-card__head">
          <h2 className="adm-card__title">Sellers Directory</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="adm-search">
              <span className="adm-search__icon">⌕</span>
              <input
                className="adm-search__input"
                type="text"
                placeholder="Search phone, email..."
                value={filters.search}
                onChange={handleSearch}
              />
            </div>
            <select className="adm-input" style={{ width: 'auto' }} name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BLOCKED">Blocked</option>
            </select>
            <select className="adm-input" style={{ width: 'auto' }} name="kyc_status" value={filters.kyc_status} onChange={handleFilterChange}>
              <option value="">All KYC Status</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
            </select>
            <input
              className="adm-input" style={{ width: '120px' }}
              type="text" name="city" value={filters.city} onChange={handleFilterChange} placeholder="City"
            />
            <input
              className="adm-input" style={{ width: '120px' }}
              type="text" name="state" value={filters.state} onChange={handleFilterChange} placeholder="State"
            />
            <button className="adm-btn adm-btn--ghost" onClick={handleReset}>Reset</button>
          </div>
        </div>

        {error && <div className="adm-alert adm-alert--error" style={{ margin: '16px 20px 0' }}>{error}</div>}

        {isLoading ? (
          <div className="adm-loading">Loading sellers...</div>
        ) : sellers.length === 0 ? (
          <div className="adm-empty">
            <span className="adm-empty__icon">🏪</span>
            <span className="adm-empty__text">No sellers found.</span>
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Business</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>KYC</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((seller) => (
                    <tr key={seller.id}>
                      <td className="td-bold">{seller.user_name}</td>
                      <td>
                        <div>{seller.user_phone}</div>
                        <div className="td-sub">{seller.user_email}</div>
                      </td>
                      <td>{seller.business_name}</td>
                      <td>{seller.city || '-'} {seller.state ? `, ${seller.state}` : ''}</td>
                      <td><span className={badgeClass(seller.status)}>{seller.status_display}</span></td>
                      <td><span className={badgeClass(seller.kyc_status)}>{seller.kyc_status}</span></td>
                      <td>{new Date(seller.created_at).toLocaleDateString()}</td>
                      <td>
                        <a href={`/admin/sellers/${seller.id}`} className="adm-btn adm-btn--primary adm-btn--sm" style={{ textDecoration: 'none' }}>
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--adm-card-border)' }}>
                <button
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </button>
                <div style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>
                  Page {filters.page} of {totalPages}
                </div>
                <button
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default AdminSellerListPage;
