import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerInventoryAPI, Inventory } from '../../services/api';

const statusBadge = (status: string) => {
  if (status === 'LOW_STOCK')    return 'sp-badge sp-badge--yellow';
  if (status === 'OUT_OF_STOCK') return 'sp-badge sp-badge--red';
  return 'sp-badge sp-badge--green';
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

  useEffect(() => { fetchInventory(); }, []);

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
        notes: modalNotes,
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
        notes: modalNotes,
      });
      setActiveModal(null);
      fetchInventory();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to adjust inventory.');
    }
  };

  const filtered = inventory.filter(
    (item) =>
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.variant_sku.toLowerCase().includes(search.toLowerCase())
  );

  const low = inventory.filter((i) => i.status === 'LOW_STOCK').length;
  const out = inventory.filter((i) => i.status === 'OUT_OF_STOCK').length;

  return (
    <>
      {/* Page header */}
      <div className="sp-header">
        <div>
          <h1 className="sp-header__title">Inventory</h1>
          <p className="sp-header__sub">Track and manage your variant stock levels</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="sp-stats" style={{ marginBottom: 20 }}>
        <div className="sp-stat-card" style={{ '--card-accent': '#6366f1', '--card-icon-bg': 'rgba(99,102,241,0.1)', '--card-icon-color': '#4f46e5' } as React.CSSProperties}>
          <div className="sp-stat-icon">≡</div>
          <div className="sp-stat-label">Total Variants</div>
          <div className="sp-stat-value">{inventory.length}</div>
        </div>
        <div className="sp-stat-card" style={{ '--card-accent': '#f59e0b', '--card-icon-bg': 'rgba(245,158,11,0.1)', '--card-icon-color': '#d97706' } as React.CSSProperties}>
          <div className="sp-stat-icon">⚠</div>
          <div className="sp-stat-label">Low Stock</div>
          <div className="sp-stat-value">{low}</div>
        </div>
        <div className="sp-stat-card" style={{ '--card-accent': '#ef4444', '--card-icon-bg': 'rgba(239,68,68,0.1)', '--card-icon-color': '#dc2626' } as React.CSSProperties}>
          <div className="sp-stat-icon">✕</div>
          <div className="sp-stat-label">Out of Stock</div>
          <div className="sp-stat-value">{out}</div>
        </div>
        <div className="sp-stat-card" style={{ '--card-accent': '#10b981', '--card-icon-bg': 'rgba(16,185,129,0.1)', '--card-icon-color': '#059669' } as React.CSSProperties}>
          <div className="sp-stat-icon">✓</div>
          <div className="sp-stat-label">In Stock</div>
          <div className="sp-stat-value">{inventory.length - low - out}</div>
        </div>
      </div>

      {/* Table card */}
      <div className="sp-card">
        <div className="sp-card__head">
          <h2 className="sp-card__title">All Variants</h2>
          <div className="sp-search">
            <span className="sp-search__icon">⌕</span>
            <input
              className="sp-search__input"
              placeholder="Search product or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="sp-loading">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="sp-empty">
            <span className="sp-empty__icon">📦</span>
            <span className="sp-empty__text">No inventory records found.</span>
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Product / Variant</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Sold</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="td-bold">{item.product_name}</div>
                      {item.attribute_summary && (
                        <div className="td-sub">{item.attribute_summary}</div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.variant_sku}</td>
                    <td className="td-bold">{item.available_quantity}</td>
                    <td>{item.reserved_quantity}</td>
                    <td>{item.sold_quantity}</td>
                    <td>{item.low_stock_threshold}</td>
                    <td>
                      <span className={statusBadge(item.status)}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="sp-btn sp-btn--primary sp-btn--sm"
                          onClick={() => openAddStock(item)}
                        >
                          + Add
                        </button>
                        <button
                          className="sp-btn sp-btn--ghost sp-btn--sm"
                          onClick={() => openAdjust(item)}
                        >
                          Adjust
                        </button>
                        <button
                          className="sp-btn sp-btn--ghost sp-btn--sm"
                          onClick={() => navigate(`/seller/inventory/${item.id}`)}
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {activeModal === 'add' && selectedItem && (
        <div className="sp-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sp-modal__title">Add Stock</h2>
            <p className="sp-modal__sub">
              Adding stock to <strong>{selectedItem.variant_sku}</strong> — {selectedItem.product_name}
            </p>
            {modalError && <div className="sp-alert sp-alert--error">{modalError}</div>}
            <form onSubmit={handleAddStockSubmit}>
              <div className="sp-field">
                <label className="sp-label">Quantity to Add *</label>
                <input
                  className="sp-input"
                  type="number"
                  min="1"
                  value={modalQty}
                  onChange={(e) => setModalQty(e.target.value)}
                  required
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">Notes</label>
                <input
                  className="sp-input"
                  type="text"
                  placeholder="e.g. Restock shipment #104"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                />
              </div>
              <div className="sp-modal__footer">
                <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="sp-btn sp-btn--primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Inventory Modal */}
      {activeModal === 'adjust' && selectedItem && (
        <div className="sp-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sp-modal__title">Adjust Stock & Threshold</h2>
            <p className="sp-modal__sub">
              Adjusting variant <strong>{selectedItem.variant_sku}</strong>
            </p>
            {modalError && <div className="sp-alert sp-alert--error">{modalError}</div>}
            <form onSubmit={handleAdjustSubmit}>
              <div className="sp-field">
                <label className="sp-label">Quantity Adjustment (can be negative)</label>
                <input
                  className="sp-input"
                  type="number"
                  value={modalQty}
                  onChange={(e) => setModalQty(e.target.value)}
                  required
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">Low Stock Threshold</label>
                <input
                  className="sp-input"
                  type="number"
                  min="0"
                  value={modalThreshold}
                  onChange={(e) => setModalThreshold(e.target.value)}
                  required
                />
              </div>
              <div className="sp-field">
                <label className="sp-label">Notes</label>
                <input
                  className="sp-input"
                  type="text"
                  placeholder="e.g. Audit correction"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                />
              </div>
              <div className="sp-modal__footer">
                <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="sp-btn sp-btn--primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryListPage;
