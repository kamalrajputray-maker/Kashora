import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

const SellerLoginPage: React.FC = () => {
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
        if (role === 'SELLER') {
          navigate('/seller/dashboard');
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          navigate('/admin/sellers');
        } else {
          setError('Login successful, but no seller account found for this user.');
          localStorage.clear();
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Login failed. Please try again.';
      setError(msg);
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
      
      const axios = require('axios');
      const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
      const r = await axios.post(`${apiUrl}/auth/login/verify-otp/`, { email, otp_token: otp });
      
      const { access, refresh, user } = r.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      const role = user?.role;
      if (role === 'SELLER') {
        navigate('/seller/dashboard');
      } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        navigate('/admin/sellers');
      } else {
        setError('Login successful, but no seller account found for this user.');
        localStorage.clear();
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
          <h1>Seller Login</h1>
          <p>Sign in to your seller account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success" style={{background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>{successMsg}</div>}

        {step === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
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
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
              {isLoading ? 'Verifying…' : 'Verify & Login'}
            </button>
            <button type="button" className="btn" onClick={() => setStep('LOGIN')} style={{marginTop: '12px', width: '100%', padding: '12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer'}}>
              Back to Login
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/seller/register" className="link">Register here</Link></p>
          <p>Forgot password? <Link to="/forgot-password" className="link">Reset here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SellerLoginPage;
