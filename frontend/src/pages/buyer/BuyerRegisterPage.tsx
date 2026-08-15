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
  otp?: string;
}

const BuyerRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
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
      const { confirmPassword, otp, ...rest } = formData;
      await authAPI.registerBuyer({ ...rest, otp_token: '' });
      
      navigate('/login', {
        state: { message: 'Registration successful! Please login with your credentials.' },
      });
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.otp_token) {
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
      await authAPI.registerBuyer({ ...rest, otp_token: otp });
      
      navigate('/login', {
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
    if (errors[name as keyof RegisterFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = handleRegisterOrSendOtp;

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '400px', margin: '40px auto' }}>
        <div className="auth-header">
          <h1>Buyer Registration</h1>
          <p>Create an account to start shopping</p>
        </div>

        {apiError && <div className="alert alert-error">{apiError}</div>}
        {successMsg && <div className="alert alert-success" style={{background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>{successMsg}</div>}

        {step === 'DETAILS' ? (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>First Name</label>
            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} />
            {errors.first_name && <span className="error-text">{errors.first_name}</span>}
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} />
            {errors.last_name && <span className="error-text">{errors.last_name}</span>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={isLoading} style={{ marginTop: '20px' }}>
            {isLoading ? 'Processing...' : 'Register'}
          </button>
        </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="auth-form">
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
          <p>Already have an account? <Link to="/login" className="link">Login here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default BuyerRegisterPage;
