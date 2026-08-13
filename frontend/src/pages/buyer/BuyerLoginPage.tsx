import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

const BuyerLoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) { setError('Phone number is required.'); return; }
    if (!password)     { setError('Password is required.'); return; }

    try {
      setIsLoading(true);
      const data = await login(phone, password);
      const role = data.user?.role;
      if (role === 'BUYER') {
        navigate('/products');
      } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        navigate('/admin/sellers');
      } else if (role === 'SELLER') {
        navigate('/seller/dashboard');
      } else {
        setError(`Access denied. Unrecognized role: ${role}`);
        localStorage.clear();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.message ||
        'Login failed. Please check your credentials.';
      setError(msg);
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="buyer-phone">Phone Number</label>
            <input
              id="buyer-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Enter your phone number"
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

        <div className="auth-footer">
          <p>
            Want to sell?{' '}
            <Link to="/seller/login" className="link">Seller Login</Link>
          </p>
        </div>

        <div className="test-credentials">
          <p className="text-muted">Test Credentials:</p>
          <code>Phone: 9000000004</code>
          <code>Password: Buyer@12345</code>
        </div>
      </div>
    </div>
  );
};

export default BuyerLoginPage;
