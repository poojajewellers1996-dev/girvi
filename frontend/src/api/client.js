const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('girvi_token', token);
  } else {
    localStorage.removeItem('girvi_token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('girvi_token');
};

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized
    if (response.status === 401) {
        setAuthToken(null);
        window.location.href = '/login';
    }
    
    let errorMsg = 'An error occurred';
    try {
        const errorData = await response.json();
        if (Array.isArray(errorData.detail)) {
            errorMsg = errorData.detail.map(d => `${d.loc[d.loc.length-1]}: ${d.msg}`).join(', ');
        } else {
            errorMsg = errorData.detail || errorMsg;
        }
    } catch (e) {
        // Not JSON
    }
    throw new Error(errorMsg);
  }

  // Handle empty responses
  if (response.status === 204) return null;
  
  return response.json();
};

export const api = {
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  resetPin: (username, new_pin, password) => request(`/auth/reset-pin?username=${encodeURIComponent(username)}&new_pin=${encodeURIComponent(new_pin)}&password=${encodeURIComponent(password)}`, {
    method: 'POST'
  }),
  requestPasswordReset: (data) => request('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  verifyOtp: (data, new_password) => request(`/auth/verify-otp?new_password=${encodeURIComponent(new_password)}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  sendRegistrationOtp: (phone) => request('/auth/send-registration-otp', {
    method: 'POST',
    body: JSON.stringify({ phone })
  }),
  verifyRegistrationOtp: (phone, code) => request('/auth/verify-registration-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code })
  }),
  registerCompany: (data) => request('/company/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getGirvis: (skip = 0, limit = 100) => request(`/girvi?skip=${skip}&limit=${limit}`),
  getGirviById: (id) => request(`/girvi/${id}`),
  createGirvi: (data) => request('/girvi', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateGirvi: (id, data) => request(`/girvi/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteGirvi: (id) => request(`/girvi/${id}`, {
    method: 'DELETE'
  }),
  releaseGirvi: (id) => request(`/girvi/${id}/release`, {
    method: 'PATCH'
  }),
  partPaymentGirvi: (id, amount) => request(`/girvi/${id}/part-payment`, {
    method: 'PATCH',
    body: JSON.stringify({ amount })
  }),
  getRepledges: () => request('/repledge'),
  getCustomerByMobile: (mobile) => request(`/customer/${encodeURIComponent(mobile)}`),
  getGirviStats: () => request('/girvi/stats'),
  
  // Ledger Transactions
  getTransactions: (girviId) => request(`/girvi/${girviId}/transactions`),
  addTransaction: (girviId, data) => request(`/girvi/${girviId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteTransaction: (transactionId) => request(`/transactions/${transactionId}`, {
    method: 'DELETE'
  }),
  addRepledgeTransaction: (repledgeId, data) => request(`/repledge/${repledgeId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteRepledgeTransaction: (transactionId) => request(`/repledge/transactions/${transactionId}`, {
    method: 'DELETE'
  }),
  releaseRepledge: (id, data) => request(`/repledge/${id}/release`, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined
  }),

  updateRepledge: (id, data) => request(`/repledge/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),



  
  // Settings & Logs
  getLogs: () => request('/logs'),
  getCompany: () => request('/company'),
  updateCompany: (data) => request('/company', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};
