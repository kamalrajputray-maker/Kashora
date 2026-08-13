import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerInventoryAPI, Inventory } from '../../services/api';

const S = {
  container: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1e293b' },
  searchBar: { padding: '0.6rem 1rem', width: '300px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' },
  tableCard: { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const },
  th: { background: '#f8fafc', padding: '1rem', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' },
  td: { padding: '1rem', borderBottom: '1px solid #e2e8f0', color: '#334155', fontSize: '0.9rem' },
  badge: (status: string) => {
    let bg = '#d1fae5';
    let text = '#065f46';
    if (status === 'LOW_STOCK') {
      bg = '#fef3c7';
      text = '#92400e';
    } else if (status === 'OUT_OF_STOCK') {
      bg = '#fee2e2';
      text = '#991b1b';
    }
    return {
      background: bg, color: text, padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block'
    };
  },
  btn: { padding: '0.5rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', border: 'none' },
  primaryBtn: { background: '#6c63ff', color: '#fff' },
  secondaryBtn: { background: '#e2e8f0', color: '#334155' },
  modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '2rem', width: '450px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
  modalTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' },
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#475569', fontSize: '0.85rem' },
  input: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' },
};

export const InventoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'add' | 'adjust' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [modalQty, setModalQty] = useState('0');
  const [modalThreshold, setModalThreshold] = useState('5');
  const [modalNotes, setModalNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await sellerInventoryAPI.list();
      setInventory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const openAddStock = (item: Inventory) => {
    setSelectedItem(item);
    setModalQty('5');
    setModalNotes('');
    setModalError(null);
    setActiveModal('add');
  };

  const openAdjust = (item: Inventory) => {
    setSelectedItem(item);
    setModalQty('0');
    setModalThreshold(String(item.low_stock_threshold));
    setModalNotes('');
    setModalError(null);
    setActiveModal('adjust');
  };

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalError(null);
    try {
      await sellerInventoryAPI.addStock(selectedItem.id, {
        quantity: Number(modalQty),
        notes: modalNotes
      });
      setActiveModal(null);
      fetchInventory();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to update stock.');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalError(null);
    try {
      await sellerInventoryAPI.adjust(selectedItem.id, {
        quantity: Number(modalQty),
        low_stock_threshold: Number(modalThreshold),
        notes: modalNotes
      });
      setActiveModal(null);
      fetchInventory();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to adjust inventory.');
    }
  };

  const filtered = inventory.filter(item =>
    item.product_name.toLowerCase().includes(search.toLowerCase()) ||
    item.variant_sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📦 Inventory Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Track and manage your variant stock levels</p>
        </div>
        <input
          style={S.searchBar}
          placeholder="Search products or SKUs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <div style={S.tableCard}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Product</th>
                <th style={S.th}>SKU</th>
                <th style={S.th}>Available</th>
                <th style={S.th}>Reserved</th>
                <th style={S.th}>Sold</th>
                <th style={S.th}>Low Threshold</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td style={{ ...S.td, fontWeight: '600' }}>
                    {item.product_name}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                      {item.attribute_summary}
                    </div>
                  </td>
                  <td style={S.td}>{item.variant_sku}</td>
                  <td style={{ ...S.td, fontWeight: '600' }}>{item.available_quantity}</td>
                  <td style={S.td}>{item.reserved_quantity}</td>
                  <td style={S.td}>{item.sold_quantity}</td>
                  <td style={S.td}>{item.low_stock_threshold}</td>
                  <td style={S.td}>
                    <span style={S.badge(item.status)}>{item.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        style={{ ...S.btn, ...S.primaryBtn }}
                        onClick={() => openAddStock(item)}
                      >
                        Add Stock
                      </button>
                      <button
                        type="button"
                        style={{ ...S.btn, ...S.secondaryBtn }}
                        onClick={() => openAdjust(item)}
                      >
                        Adjust
                      </button>
                      <button
                        type="button"
                        style={{ ...S.btn, ...S.secondaryBtn, background: '#f1f5f9' }}
                        onClick={() => navigate(`/seller/inventory/${item.id}`)}
                      >
                        History 📜
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                    No inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Stock Modal */}
      {activeModal === 'add' && selectedItem && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>📤 Quick Add Stock</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Adding stock to <strong>{selectedItem.variant_sku}</strong>
            </p>
            {modalError && <div style={{ color: '#991b1b', background: '#fee2e2', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>{modalError}</div>}
            
            <form onSubmit={handleAddStockSubmit}>
              <div style={S.field}>
                <label style={S.label}>Quantity to Add *</label>
                <input style={S.input} type="number" min="1" value={modalQty} onChange={e => setModalQty(e.target.value)} required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Notes</label>
                <input style={S.input} type="text" placeholder="e.g. Restock shipment #104" value={modalNotes} onChange={e => setModalNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" style={{ ...S.btn, ...S.secondaryBtn }} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" style={{ ...S.btn, ...S.primaryBtn }}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Inventory Modal */}
      {activeModal === 'adjust' && selectedItem && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>⚙️ Adjust Stock & Threshold</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Adjusting variant <strong>{selectedItem.variant_sku}</strong>
            </p>
            {modalError && <div style={{ color: '#991b1b', background: '#fee2e2', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>{modalError}</div>}
            
            <form onSubmit={handleAdjustSubmit}>
              <div style={S.field}>
                <label style={S.label}>Quantity Adjustment (Can be negative)</label>
                <input style={S.input} type="number" value={modalQty} onChange={e => setModalQty(e.target.value)} required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Low Stock Threshold</label>
                <input style={S.input} type="number" min="0" value={modalThreshold} onChange={e => setModalThreshold(e.target.value)} required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Notes</label>
                <input style={S.input} type="text" placeholder="e.g. Audit correction" value={modalNotes} onChange={e => setModalNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" style={{ ...S.btn, ...S.secondaryBtn }} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" style={{ ...S.btn, ...S.primaryBtn }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryListPage;
