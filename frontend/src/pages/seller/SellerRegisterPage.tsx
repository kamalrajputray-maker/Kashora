import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

interface RegisterFormData {
  phone: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  first_name: string;
  last_name: string;
  business_name: string;
  gst_number: string;
  pan_number: string;
  otp?: string;
}

const SellerRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    business_name: '',
    gst_number: '',
    pan_number: '',
  });

  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (!formData.business_name) newErrors.business_name = 'Business name is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterOrSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMsg(null);
    
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      // Attempt to register first without OTP to see if backend complains
      const { confirmPassword, otp, ...rest } = formData;
      await authAPI.registerSeller({ ...rest, otp_token: '' });
      
      // If it passes without OTP, 2FA is disabled! 
      navigate('/seller/login', {
        state: { message: 'Registration successful! Please login with your credentials.' },
      });
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.otp_token) {
        // OTP required! Let's send OTP.
        await authAPI.sendOtp({ email: formData.email });
        setSuccessMsg('OTP sent to your email.');
        setStep('OTP');
      } else {
        setApiError(responseData?.detail || responseData?.email?.[0] || responseData?.phone?.[0] || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    
    if (!formData.otp?.trim()) {
      setApiError('OTP is required.');
      return;
    }
    
    try {
      setIsLoading(true);
      const { confirmPassword, otp, ...rest } = formData;
      await authAPI.registerSeller({ ...rest, otp_token: otp });
      
      navigate('/seller/login', {
        state: { message: 'Registration successful! Please login with your credentials.' },
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.otp_token?.[0] || 'Verification failed.';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof RegisterFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = handleRegisterOrSendOtp;

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '800px', margin: '40px auto' }}>
        <div className="auth-header">
          <h1>Become a Seller on Kashora</h1>
          <p>Join thousands of businesses selling to millions of customers</p>
        </div>

        {apiError && <div className="alert alert-error">{apiError}</div>}
        {successMsg && <div className="alert alert-success" style={{background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>{successMsg}</div>}

        {step === 'DETAILS' ? (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Personal Information */}
          <div className="form-section">
            <h3>Personal Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  disabled={isLoading}
                  className={errors.first_name ? 'input-error' : ''}
                />
                {errors.first_name && (
                  <span className="error-text">{errors.first_name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  disabled={isLoading}
                  className={errors.last_name ? 'input-error' : ''}
                />
                {errors.last_name && (
                  <span className="error-text">{errors.last_name}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
                disabled={isLoading}
                className={errors.phone ? 'input-error' : ''}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                disabled={isLoading}
                className={errors.email ? 'input-error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
          </div>

          {/* Business Information */}
          <div className="form-section">
            <h3>Business Information</h3>

            <div className="form-group">
              <label htmlFor="business_name">Business Name</label>
              <input
                type="text"
                id="business_name"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                placeholder="Your Store Name"
                disabled={isLoading}
                className={errors.business_name ? 'input-error' : ''}
              />
              {errors.business_name && (
                <span className="error-text">{errors.business_name}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gst_number">GST Number</label>
                <input
                  type="text"
                  id="gst_number"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  placeholder="22AABCT1234H1Z0"
                  disabled={isLoading}
                  className={errors.gst_number ? 'input-error' : ''}
                />
                {errors.gst_number && (
                  <span className="error-text">{errors.gst_number}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="pan_number">PAN Number</label>
                <input
                  type="text"
                  id="pan_number"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleChange}
                  placeholder="AAAPA1234A"
                  disabled={isLoading}
                  maxLength={10}
                  className={errors.pan_number ? 'input-error' : ''}
                />
                {errors.pan_number && (
                  <span className="error-text">{errors.pan_number}</span>
                )}
              </div>
            </div>
          </div>

          {/* Account Credentials */}
          <div className="form-section">
            <h3>Account Credentials</h3>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                disabled={isLoading}
                className={errors.password ? 'input-error' : ''}
              />
              {errors.password && (
                <span className="error-text">{errors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                disabled={isLoading}
                className={errors.confirmPassword ? 'input-error' : ''}
              />
              {errors.confirmPassword && (
                <span className="error-text">{errors.confirmPassword}</span>
              )}
            </div>
          </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={isLoading} style={{ marginTop: '30px' }}>
            {isLoading ? 'Processing...' : 'Proceed & Send OTP'}
          </button>
        </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="auth-form" style={{maxWidth: '400px', margin: '0 auto'}}>
            <div className="form-group">
              <label htmlFor="otp">Enter OTP sent to {formData.email}</label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={formData.otp || ''}
                onChange={handleChange}
                placeholder="6-digit OTP"
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify & Register'}
            </button>
            <button type="button" className="btn" onClick={() => setStep('DETAILS')} style={{marginTop: '12px', width: '100%', padding: '12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer'}}>
              Back to Edit Details
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Already have a seller account?{' '}
            <Link to="/seller/login" className="link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerRegisterPage;
