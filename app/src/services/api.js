import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this to your API Gateway URL
// For local testing: use your computer's IP address (not localhost)
// For production: use your deployed API URL
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8080'  // Replace with your computer's IP
  : 'https://your-production-api.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear stored credentials and redirect to login
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      // You can emit an event here to redirect to login
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  getCurrentUser: () => api.get('/api/auth/me'),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/api/products', { params }),
  getById: (id) => api.get(`/api/products/${id}`),
  search: (query) => api.get('/api/products', { params: { search: query } }),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/api/categories'),
  getById: (id) => api.get(`/api/categories/${id}`),
};

// Orders API
export const ordersAPI = {
  getAll: (params) => api.get('/api/orders', { params }),
  getById: (id) => api.get(`/api/orders/${id}`),
  create: (data) => api.post('/api/orders', data),
  cancel: (id) => api.post(`/api/orders/${id}/cancel`),
};

// Payments API
export const paymentsAPI = {
  process: (data) => api.post('/api/payments', data),
  getById: (id) => api.get(`/api/payments/${id}`),
};

export default api;
