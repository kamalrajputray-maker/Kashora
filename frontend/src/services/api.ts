import axios, { AxiosInstance, AxiosError } from 'axios';

// API Configuration
// Ensure trailing slash and /api/v1 path so relative paths resolve correctly
let API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

// If the URL is just http://localhost:8000 from a stale env var, append /api/v1
if (!API_BASE_URL.includes('/api/v1')) {
  API_BASE_URL = API_BASE_URL.replace(/\/$/, '') + '/api/v1';
}
if (!API_BASE_URL.endsWith('/')) {
  API_BASE_URL += '/';
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}auth/token/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem('accessToken', response.data.access);
        apiClient.defaults.headers.common.Authorization = `Bearer ${response.data.access}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/seller/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ========== AUTHENTICATION APIS ==========

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    phone: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_verified: boolean;
  };
}

export interface RegisterRequest {
  phone: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  gst_number?: string;
  pan_number?: string;
}

export interface RegisterResponse {
  message: string;
  user: LoginResponse['user'];
}

export const authAPI = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('auth/login/', data),

  logout: (data: { refresh: string }) =>
    apiClient.post('auth/logout/', data),

  refreshToken: (refresh: string) =>
    apiClient.post('auth/token/refresh/', { refresh }),

  getCurrentUser: () =>
    apiClient.get('auth/me/'),

  registerSeller: (data: RegisterRequest) =>
    apiClient.post<RegisterResponse>('auth/register/seller/', data),

  registerBuyer: (data: Omit<RegisterRequest, 'business_name' | 'gst_number' | 'pan_number'>) =>
    apiClient.post<RegisterResponse>('auth/register/buyer/', data),
};

// ========== SELLER PROFILE APIS ==========

export interface SellerProfile {
  id: string;
  user_phone: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  store_name: string;
  store_description: string;
  store_logo: string;
  store_banner: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  gst_number: string;
  pan_number: string;
  kyc_status: string;
  status: string;
  status_display: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerProfileUpdate {
  store_name?: string;
  store_description?: string;
  store_logo?: File;
  store_banner?: File;
  business_name?: string;
  business_email?: string;
  business_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface SellerDashboard extends SellerProfile {
  dashboard: {
    status: string;
    total_products: number;
    approved_products: number;
    pending_products: number;
    rejected_products: number;
    total_inventory: number;
    low_stock_products: number;
  };
}

export const sellerAPI = {
  getProfile: () =>
    apiClient.get<SellerProfile>('seller/profile/'),

  updateProfile: (data: SellerProfileUpdate) => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    return apiClient.patch<SellerProfile>('seller/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getDashboard: () =>
    apiClient.get<SellerDashboard>('seller/dashboard/'),
};

// ========== ADMIN SELLER APIS ==========

export interface AdminSellerListItem {
  id: string;
  user_phone: string;
  user_email: string;
  user_name: string;
  business_name: string;
  status: string;
  status_display: string;
  city: string;
  state: string;
  kyc_status: string;
  created_at: string;
  updated_at: string;
  rejection_reason: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
}

export interface AdminSellerDetail extends SellerProfile {
  rejected_by_name: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AdminSellerListParams {
  status?: string;
  city?: string;
  state?: string;
  kyc_status?: string;
  search?: string;
  ordering?: string;
  page?: number;
}

export const adminSellerAPI = {
  listSellers: (params?: AdminSellerListParams) =>
    apiClient.get<PaginatedResponse<AdminSellerListItem>>('admin/sellers/', { params }),

  getSellerDetail: (sellerId: string) =>
    apiClient.get<AdminSellerDetail>(`admin/sellers/${sellerId}/`),

  approveSeller: (sellerId: string) =>
    apiClient.post(`admin/sellers/${sellerId}/approve/`),

  rejectSeller: (sellerId: string, data: { rejection_reason: string }) =>
    apiClient.post(`admin/sellers/${sellerId}/reject/`, data),

  suspendSeller: (sellerId: string) =>
    apiClient.post(`admin/sellers/${sellerId}/suspend/`),

  activateSeller: (sellerId: string) =>
    apiClient.post(`admin/sellers/${sellerId}/activate/`),

  blockSeller: (sellerId: string) =>
    apiClient.post(`admin/sellers/${sellerId}/block/`),
};

// ========== CATEGORY APIs ==========

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const catalogAPI = {
  listCategories: () => apiClient.get<Category[]>('categories/'),
};

// ========== PRODUCT APIs ==========

export interface Product {
  id: string;
  seller: string;
  seller_store: string;
  category: string;
  category_name: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  base_price: string;
  compare_at_price: string | null;
  tax_percentage: string;
  shipping_charge: string;
  returnable: boolean;
  return_window_days: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCreatePayload {
  name: string;
  slug: string;
  description: string;
  brand: string;
  category: string;
  base_price: string;
  compare_at_price?: string | null;
  tax_percentage: string;
  shipping_charge: string;
  returnable: boolean;
  return_window_days: number;
  status: string;
}

export interface ProductListParams {
  search?: string;
  status?: string;
  approval_status?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  ordering?: string;
  page?: number;
}

export const sellerProductAPI = {
  list: (params?: ProductListParams) =>
    apiClient.get<PaginatedResponse<Product>>('seller/products/', { params }),

  get: (id: string) =>
    apiClient.get<Product>(`seller/products/${id}/`),

  create: (data: ProductCreatePayload) =>
    apiClient.post<Product>('seller/products/', data),

  update: (id: string, data: Partial<ProductCreatePayload>) =>
    apiClient.patch<Product>(`seller/products/${id}/`, data),

  delete: (id: string) =>
    apiClient.delete(`seller/products/${id}/`),

  submit: (id: string) =>
    apiClient.post(`seller/products/${id}/submit/`),
};

// ========== ADMIN PRODUCT APIs ==========

export interface AdminProduct extends Product {
  seller_phone: string;
}

export const adminProductAPI = {
  listPending: (params?: { page?: number }) =>
    apiClient.get<PaginatedResponse<AdminProduct>>('admin/products/pending/', { params }),

  list: (params?: ProductListParams) =>
    apiClient.get<PaginatedResponse<AdminProduct>>('admin/products/', { params }),

  get: (id: string) =>
    apiClient.get<AdminProduct>(`admin/products/${id}/`),

  approve: (id: string) =>
    apiClient.post(`admin/products/${id}/approve/`),

  reject: (id: string, data: { rejection_reason: string }) =>
    apiClient.post(`admin/products/${id}/reject/`, data),
};

export default apiClient;
