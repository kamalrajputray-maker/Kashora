import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sellerInventoryAPI, Inventory, InventoryTransaction } from '../../services/api';

const S = {
  container: { padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  backBtn: { padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569', fontSize: '0.85rem' },
  title: { fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' },
  card: { background: '#fff', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' as const },
  cardLabel: { fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' as const, marginBottom: '0.4rem' },
  cardVal: { fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' },
  tableCard: { background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const },
  th: { background: '#f8fafc', padding: '0.85rem 1rem', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem' },
  td: { padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0', color: '#334155', fontSize: '0.88rem' },
  changeCell: (qty: number) => {
    const isPos = qty > 0;
    return {
      color: isPos ? '#16a34a' : '#dc2626', fontWeight: '600'
    };
  },
  txBadge: (type: string) => {
    let bg = '#e2e8f0';
    let text = '#334155';
    if (type === 'STOCK_IN') { bg = '#d1fae5'; text = '#065f46'; }
    else if (type === 'STOCK_OUT') { bg = '#fee2e2'; text = '#991b1b'; }
    else if (type === 'RESERVE') { bg = '#dbeafe'; text = '#1e40af'; }
    else if (type === 'RELEASE') { bg = '#fef3c7'; text = '#92400e'; }
    else if (type === 'SALE') { bg = '#f3e8ff'; text = '#6b21a8'; }
    return {
      background: bg, color: text, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', display: 'inline-block'
    };
  }
};

export const InventoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      try {
        const [invRes, txRes] = await Promise.all([
          sellerInventoryAPI.get(id),
          sellerInventoryAPI.transactions(id)
        ]);
        setInventory(invRes.data);
        setTransactions(txRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return <div style={S.container}>Loading item history...</div>;
  }

  if (!inventory) {
    return (
      <div style={S.container}>
        <button style={S.backBtn} onClick={() => navigate('/seller/inventory')}>← Back</button>
        <p style={{ marginTop: '2rem' }}>Inventory record not found.</p>
      </div>
    );
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/seller/inventory')}>← Back</button>
        <div>
          <h1 style={S.title}>Variant History: {inventory.variant_sku}</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{inventory.product_name} ({inventory.attribute_summary})</p>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardLabel}>Available</div>
          <div style={S.cardVal}>{inventory.available_quantity}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Reserved</div>
          <div style={S.cardVal}>{inventory.reserved_quantity}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Sold</div>
          <div style={S.cardVal}>{inventory.sold_quantity}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardLabel}>Low Threshold</div>
          <div style={S.cardVal}>{inventory.low_stock_threshold}</div>
        </div>
      </div>

      <h2 style={S.sectionTitle}>📜 Transaction History Log</h2>
      <div style={S.tableCard}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date & Time</th>
              <th style={S.th}>Type</th>
              <th style={S.th}>Change</th>
              <th style={S.th}>Reference</th>
              <th style={S.th}>Notes</th>
              <th style={S.th}>Performed By</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td style={S.td}>{new Date(tx.created_at).toLocaleString()}</td>
                <td style={S.td}>
                  <span style={S.txBadge(tx.transaction_type)}>{tx.transaction_type}</span>
                </td>
                <td style={{ ...S.td, ...S.changeCell(tx.quantity) }}>
                  {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                </td>
                <td style={S.td}>
                  {tx.reference_type ? `${tx.reference_type} #${tx.reference_id}` : '—'}
                </td>
                <td style={S.td}>{tx.notes || '—'}</td>
                <td style={S.td}>{tx.created_by_email || 'System'}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                  No transaction logs recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryDetailPage;
