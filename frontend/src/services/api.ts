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

  list: (params?: any) =>
    apiClient.get<PaginatedResponse<AdminProduct>>('admin/products/', { params }),

  get: (id: string) =>
    apiClient.get<AdminProduct>(`admin/products/${id}/`),

  approve: (id: string) =>
    apiClient.post(`admin/products/${id}/approve/`),

  reject: (id: string, data: { rejection_reason: string }) =>
    apiClient.post(`admin/products/${id}/reject/`, data),
};

// ========== CATEGORY APIS ==========

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: string | null;
  is_active: boolean;
  sort_order: number;
  children: Category[];
  created_at: string;
  updated_at: string;
}

export interface CategoryRequest {
  name: string;
  description?: string;
  parent?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export const categoryAPI = {
  getCategories: () => 
    apiClient.get<Category[]>('categories/'),
  getCategoryBySlug: (slug: string) =>
    apiClient.get<Category>(`categories/${slug}/`),
};

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  base_price: string;
  compare_at_price: string | null;
  category: string;
  category_name: string;
  primary_image: string | null;
  in_stock: boolean;
  created_at: string;
}

export interface PublicProductDetail {
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
  images: ProductImage[];
  variants: {
    id: string;
    sku: string;
    price: string;
    compare_at_price: string | null;
    weight: string | null;
    attribute_summary: string;
    in_stock: boolean;
    available_quantity: number;
  }[];
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export const publicProductAPI = {
  list: (params?: any) =>
    apiClient.get<PaginatedResponse<PublicProduct>>('products/', { params }),
  get: (slug: string) =>
    apiClient.get<PublicProductDetail>(`products/${slug}/`),
};


export const adminCategoryAPI = {
  getCategories: (params?: any) =>
    apiClient.get<PaginatedResponse<Category>>('admin/categories/', { params }),
  getCategoryById: (id: string) =>
    apiClient.get<Category>(`admin/categories/${id}/`),
  createCategory: (data: CategoryRequest | FormData) => {
    const isFormData = data instanceof FormData;
    return apiClient.post<Category>('admin/categories/', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
  },
  updateCategory: (id: string, data: Partial<CategoryRequest> | FormData) => {
    const isFormData = data instanceof FormData;
    return apiClient.patch<Category>(`admin/categories/${id}/`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
  },
  deleteCategory: (id: string) =>
    apiClient.delete(`admin/categories/${id}/`),
};

// ========== PRODUCT ATTRIBUTE & VARIANT APIS ==========

export interface ProductAttributeValue {
  id: string;
  value: string;
  created_at: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  values: ProductAttributeValue[];
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product: string;
  sku: string;
  barcode?: string;
  price: string;
  compare_at_price?: string;
  weight?: string;
  is_active: boolean;
  attribute_values: string[]; // array of attribute value UUIDs
  attribute_summary: string;
  created_at: string;
  updated_at: string;
}

export interface VariantGenerateRequest {
  base_price: string;
  sku_prefix?: string;
  attribute_value_groups: string[][];
}

export const sellerAttributeAPI = {
  list: (productId: string) =>
    apiClient.get<ProductAttribute[]>(`seller/products/${productId}/attributes/`),
  create: (productId: string, data: { name: string }) =>
    apiClient.post<ProductAttribute>(`seller/products/${productId}/attributes/`, data),
  delete: (productId: string, attrId: string) =>
    apiClient.delete(`seller/products/${productId}/attributes/${attrId}/`),
  addValue: (productId: string, attrId: string, data: { value: string }) =>
    apiClient.post<ProductAttributeValue>(`seller/products/${productId}/attributes/${attrId}/values/`, data),
  removeValue: (productId: string, attrId: string, valueId: string) =>
    apiClient.delete(`seller/products/${productId}/attributes/${attrId}/values/${valueId}/`),
};

export const sellerVariantAPI = {
  list: (productId: string) =>
    apiClient.get<ProductVariant[]>(`seller/products/${productId}/variants/`),
  create: (productId: string, data: Partial<ProductVariant>) =>
    apiClient.post<ProductVariant>(`seller/products/${productId}/variants/`, data),
  update: (productId: string, variantId: string, data: Partial<ProductVariant>) =>
    apiClient.patch<ProductVariant>(`seller/products/${productId}/variants/${variantId}/`, data),
  delete: (productId: string, variantId: string) =>
    apiClient.delete(`seller/products/${productId}/variants/${variantId}/`),
  generate: (productId: string, data: VariantGenerateRequest) =>
    apiClient.post(`seller/products/${productId}/variants/generate/`, data),
};

export interface ProductImage {
  id: string;
  product: string;
  image: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export const sellerImageAPI = {
  list: (productId: string) =>
    apiClient.get<ProductImage[]>(`seller/products/${productId}/images/`),
  upload: (productId: string, formData: FormData) =>
    apiClient.post<ProductImage>(`seller/products/${productId}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (productId: string, imageId: string, data: Partial<ProductImage>) =>
    apiClient.patch<ProductImage>(`seller/products/${productId}/images/${imageId}/`, data),
  delete: (productId: string, imageId: string) =>
    apiClient.delete(`seller/products/${productId}/images/${imageId}/`),
};

export interface Inventory {
  id: string;
  variant: string;
  variant_sku: string;
  product_name: string;
  attribute_summary: string;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  low_stock_threshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory: string;
  transaction_type: 'STOCK_IN' | 'STOCK_OUT' | 'RESERVE' | 'RELEASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string;
  created_by_email: string | null;
  created_at: string;
}

export const sellerInventoryAPI = {
  list: () =>
    apiClient.get<Inventory[]>('seller/inventory/'),
  get: (id: string) =>
    apiClient.get<Inventory>(`seller/inventory/${id}/`),
  addStock: (id: string, data: { quantity: number; notes?: string }) =>
    apiClient.post<Inventory>(`seller/inventory/${id}/add-stock/`, data),
  adjust: (id: string, data: { quantity: number; low_stock_threshold?: number; notes?: string }) =>
    apiClient.post<Inventory>(`seller/inventory/${id}/adjust/`, data),
  transactions: (id: string) =>
    apiClient.get<InventoryTransaction[]>(`seller/inventory/${id}/transactions/`),
};

export interface CartItem {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  product_slug: string;
  price: string;
  quantity: number;
  subtotal: number;
  in_stock: boolean;
  available_quantity: number;
  primary_image: string | null;
  created_at: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  product_slug: string;
  price: string;
  in_stock: boolean;
  primary_image: string | null;
  created_at: string;
}

export const cartAPI = {
  get: () =>
    apiClient.get<Cart>('cart/'),
  add: (variantId: string, quantity: number = 1) =>
    apiClient.post<Cart>('cart/add/', { variant_id: variantId, quantity }),
  updateItem: (itemId: string, quantity: number) =>
    apiClient.patch<Cart>(`cart/item/${itemId}/`, { quantity }),
  deleteItem: (itemId: string) =>
    apiClient.delete<Cart>(`cart/item/${itemId}/`),
  clear: () =>
    apiClient.post('cart/clear/'),
};

export const wishlistAPI = {
  list: () =>
    apiClient.get<WishlistItem[]>('wishlist/'),
  add: (variantId: string) =>
    apiClient.post<WishlistItem>('wishlist/add/', { variant_id: variantId }),
  delete: (id: string) =>
    apiClient.delete(`wishlist/${id}/`),
};

export interface ShippingAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItem {
  id: string;
  variant: string;
  product_name: string;
  product_slug: string;
  sku: string;
  price: string;
  quantity: number;
  subtotal: string;
  item_status: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: string;
  shipping_charge: string;
  discount_amount: string;
  final_amount: string;
  shipping_address: ShippingAddress;
  notes: string;
  items: OrderItem[];
  placed_at: string;
  updated_at: string;
}

export interface OrderListItem {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  final_amount: string;
  item_count: number;
  first_item_name: string;
  placed_at: string;
}

export interface CheckoutPayload {
  payment_method: 'COD' | 'PREPAID';
  shipping_address: ShippingAddress;
  notes?: string;
}

export interface SellerOrderItem {
  id: string;
  order_id: string;
  buyer_phone: string;
  order_status: string;
  payment_method: string;
  product_name: string;
  sku: string;
  price: string;
  quantity: number;
  subtotal: string;
  item_status: string;
  shipping_address: ShippingAddress;
  placed_at: string;
  updated_at: string;
}

export const orderAPI = {
  list: () =>
    apiClient.get<OrderListItem[]>('orders/'),
  get: (id: string) =>
    apiClient.get<Order>(`orders/${id}/`),
  checkout: (data: CheckoutPayload) =>
    apiClient.post<Order>('orders/checkout/', data),
  cancel: (id: string) =>
    apiClient.post<Order>(`orders/${id}/cancel/`),
};

export const sellerOrderAPI = {
  list: () =>
    apiClient.get<SellerOrderItem[]>('seller/orders/'),
  get: (id: string) =>
    apiClient.get<SellerOrderItem>(`seller/orders/${id}/`),
  updateStatus: (id: string, item_status: string) =>
    apiClient.patch<SellerOrderItem>(`seller/orders/${id}/update-status/`, { item_status }),
};

export default apiClient;

