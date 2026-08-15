import React, { useEffect, useState } from 'react';
import { adminProductAPI, AdminProduct } from '../../services/api';

const AdminProductListPage: React.FC = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch both pending and all or just all products? 
      // adminProductAPI.list() returns PaginatedResponse<AdminProduct>
      const response = await adminProductAPI.list();
      setProducts(response.data.results);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminProductAPI.approve(id);
      fetchProducts(); // Refresh list to see updated status
    } catch (error) {
      console.error("Approval failed", error);
    }
  };

  if (loading) return <div className="adm-content">Loading...</div>;

  return (
    <div className="adm-content">
      <div className="adm-page-header">
        <h1>Product Management</h1>
      </div>
      <div className="adm-table-container">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Seller</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.seller_store}</td>
                <td>₹{p.base_price}</td>
                <td><span className={`adm-badge adm-badge-${p.approval_status.toLowerCase()}`}>{p.approval_status}</span></td>
                <td>
                  {p.approval_status === 'PENDING' && (
                    <button className="adm-btn adm-btn-primary" onClick={() => handleApprove(p.id)}>Approve</button>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} style={{textAlign: 'center'}}>No products found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProductListPage;
