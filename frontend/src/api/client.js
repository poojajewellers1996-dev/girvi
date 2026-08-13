const API_URL = 'http://localhost:8000'; // Default FastAPI port

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
        errorMsg = errorData.detail || errorMsg;
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
  registerCompany: (data) => request('/company/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getGirvis: (skip = 0, limit = 100) => request(`/girvi?skip=${skip}&limit=${limit}`),
  createGirvi: (data) => request('/girvi', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
