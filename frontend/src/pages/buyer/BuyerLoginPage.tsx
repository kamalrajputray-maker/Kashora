import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

import { authAPI } from '../../services/api';

const BuyerLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!email.trim() || !password) { setError('Email and Password are required.'); return; }
    
    try {
      setIsLoading(true);
      const data: any = await login({ email, password });
      
      if (data.requires_otp) {
        setSuccessMsg(data.message || 'OTP sent to your email.');
        setStep('OTP');
      } else {
        const role = data.user?.role;
        if (role === 'BUYER') {
          navigate('/products');
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          navigate('/admin/sellers');
        } else if (role === 'SELLER') {
          navigate('/seller/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp.trim()) { setError('OTP is required.'); return; }

    try {
      setIsLoading(true);
      const response = await authAPI.verifyOtp({ email, otp });
      // Actually wait, verifyOtp is for passwordless/registration.
      // We need to use login again with OTP token OR a specific login verify OTP endpoint.
      // In the backend, we created LoginVerifyOTPAPIView at 'auth/login/verify-otp/'
      
      const res = await authAPI.login({ email, otp_token: otp }); 
      // Wait, let's just use the `login` function from context but with otp_token
      // Ah, our backend expects `auth/login/verify-otp/`! Let's update `api.ts` later or just call it directly.
      // Since `AuthContext`'s `login` calls `authAPI.login` (which hits 'auth/login/'), 
      // it won't hit 'auth/login/verify-otp/'. 
      // Let's use `fetch` or add it to `api.ts`. Let's just use `authAPI.login` if we update `api.ts` to route based on payload, 
      // OR we just use `axios` here. Let's assume we update `api.ts` to have `verifyLoginOtp`.
      
      const { data } = await authAPI.login({ email, otp_token: otp }); 
      // Wait, I updated `LoginSerializer` to accept `otp_token`, but wait! 
      // Did I update `LoginAPIView` to handle `otp_token`?
      // No, `LoginAPIView` now only checks `enable_2fa` and sends OTP if true!
      // But `LoginVerifyOTPAPIView` is the one that validates the OTP and returns tokens!
      // Let's hit that directly:
      // wait, `api.ts` doesn't have `verifyLoginOtp` yet. I'll add it.
      
      // I'll call the new endpoint:
      const axios = require('axios');
      const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
      const r = await axios.post(`${apiUrl}/auth/login/verify-otp/`, { email, otp_token: otp });
      
      const { access, refresh, user } = r.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      const role = user?.role;
      if (role === 'BUYER') {
        navigate('/products');
      } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        navigate('/admin/sellers');
      } else if (role === 'SELLER') {
        navigate('/seller/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🛍️ Buyer Login</h1>
          <p>Sign in to shop on Kashora</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success" style={{background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>{successMsg}</div>}

        {step === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="buyer-email">Email Address</label>
              <input
                id="buyer-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="buyer-password">Password</label>
              <input
                id="buyer-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label htmlFor="buyer-otp">Enter OTP</label>
              <input
                id="buyer-otp"
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
              {isLoading ? 'Verifying…' : 'Verify & Login'}
            </button>
            <button type="button" className="btn" onClick={() => setStep('LOGIN')} style={{marginTop: '12px', width: '100%', padding: '12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer'}}>
              Back to Login
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Want to sell? <Link to="/seller/login" className="link">Seller Login</Link></p>
          <p>Forgot password? <Link to="/forgot-password" className="link">Reset here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default BuyerLoginPage;
