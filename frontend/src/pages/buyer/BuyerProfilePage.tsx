import React from 'react';
import { useAuth } from '../../context/AuthContext';
import BuyerLayout from '../../components/BuyerLayout';

const S = {
  container: { padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: "'Outfit', 'Inter', sans-serif" },
  card: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: '2rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column' as const, gap: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: '#1e293b' },
  fieldGroup: { display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' },
  label: { width: '150px', fontSize: '0.9rem', color: '#64748b', fontWeight: '600' },
  value: { fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }
};

export const BuyerProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <BuyerLayout>
      <div style={S.container}>
        <h1 style={S.title}>My Profile</h1>
        <div style={S.card}>
          <div style={S.fieldGroup}>
            <span style={S.label}>First Name</span>
            <span style={S.value}>{user?.first_name || 'N/A'}</span>
          </div>
          <div style={S.fieldGroup}>
            <span style={S.label}>Last Name</span>
            <span style={S.value}>{user?.last_name || 'N/A'}</span>
          </div>
          <div style={S.fieldGroup}>
            <span style={S.label}>Email Address</span>
            <span style={S.value}>{user?.email || 'N/A'}</span>
          </div>
          <div style={S.fieldGroup}>
            <span style={S.label}>Phone Number</span>
            <span style={S.value}>{user?.phone || 'N/A'}</span>
          </div>
          <div style={S.fieldGroup}>
            <span style={S.label}>Account Role</span>
            <span style={S.value}>{user?.role || 'BUYER'}</span>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
};

export default BuyerProfilePage;
