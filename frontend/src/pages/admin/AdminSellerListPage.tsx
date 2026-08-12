import React, { useState, useEffect } from 'react';
import { adminSellerAPI, AdminSellerListItem, AdminSellerListParams } from '../../services/api';
import '../../styles/admin.css';

interface Filters {
  status: string;
  city: string;
  state: string;
  kyc_status: string;
  search: string;
  page: number;
}

const AdminSellerListPage: React.FC = () => {
  const [sellers, setSellers] = useState<AdminSellerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    city: '',
    state: '',
    kyc_status: '',
    search: '',
    page: 1,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchSellers();
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

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFilters((prev) => ({
      ...prev,
      search: value,
      page: 1,
    }));
  };

  const handleReset = () => {
    setFilters({
      status: '',
      city: '',
      state: '',
      kyc_status: '',
      search: '',
      page: 1,
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="admin-seller-list-container">
      <div className="page-header">
        <h1>Seller Management</h1>
        <p className="text-muted">{totalCount} total sellers</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters & Search</h3>

        <div className="search-box">
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleSearch}
            placeholder="Search by phone, email, or business name..."
            className="search-input"
          />
        </div>

        <div className="filters-grid">
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={filters.city}
              onChange={handleFilterChange}
              placeholder="Filter by city"
            />
          </div>

          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={filters.state}
              onChange={handleFilterChange}
              placeholder="Filter by state"
            />
          </div>

          <div className="form-group">
            <label>KYC Status</label>
            <select
              name="kyc_status"
              value={filters.kyc_status}
              onChange={handleFilterChange}
            >
              <option value="">All KYC Status</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
        </div>

        <div className="filters-actions">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Sellers Table */}
      {isLoading ? (
        <div className="loading-container">Loading sellers...</div>
      ) : sellers.length === 0 ? (
        <div className="empty-state">
          <p>No sellers found matching your filters.</p>
          <button className="btn btn-secondary" onClick={handleReset}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Business</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>KYC</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller.id} className={`status-${seller.status.toLowerCase()}`}>
                    <td>{seller.user_name}</td>
                    <td className="phone-cell">{seller.user_phone}</td>
                    <td className="email-cell">{seller.user_email}</td>
                    <td>{seller.business_name}</td>
                    <td>{seller.city || '-'}</td>
                    <td>
                      <span className={`status-badge status-${seller.status.toLowerCase()}`}>
                        {seller.status_display}
                      </span>
                    </td>
                    <td>
                      <span className="kyc-status">{seller.kyc_status}</span>
                    </td>
                    <td>{new Date(seller.created_at).toLocaleDateString()}</td>
                    <td>
                      <a href={`/admin/sellers/${seller.id}`} className="btn btn-sm btn-primary">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={filters.page === 1}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: prev.page - 1,
                  }))
                }
              >
                Previous
              </button>

              <div className="pagination-info">
                Page {filters.page} of {totalPages}
              </div>

              <button
                className="btn btn-secondary"
                disabled={filters.page === totalPages}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: prev.page + 1,
                  }))
                }
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSellerListPage;
