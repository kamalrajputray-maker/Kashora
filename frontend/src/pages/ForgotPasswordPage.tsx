import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/auth.css';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'RESET'>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!email.trim()) { setError('Email is required.'); return; }
    
    try {
      setIsLoading(true);
      await authAPI.sendOtp({ email });
      setSuccessMsg('OTP sent to your email.');
      setStep('RESET');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!otp.trim() || !newPassword.trim()) { 
      setError('OTP and New Password are required.'); 
      return; 
    }

    try {
      setIsLoading(true);
      await authAPI.resetPassword({ email, otp_token: otp, new_password: newPassword });
      navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Forgot Password</h1>
          <p>Reset your password via email OTP</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success" style={{background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>{successMsg}</div>}

        {step === 'EMAIL' ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
              {isLoading ? 'Sending OTP…' : 'Send Reset OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
              {isLoading ? 'Resetting…' : 'Reset Password'}
            </button>
            <button type="button" className="btn" onClick={() => setStep('EMAIL')} style={{marginTop: '12px', width: '100%', padding: '12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer'}}>
              Back to Email
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Remembered your password? <Link to="/login" className="link">Back to Login</Link></p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
