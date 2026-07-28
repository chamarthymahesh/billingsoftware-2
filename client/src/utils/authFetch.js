export const authFetch = async (url, options = {}) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${userInfo?.token}`
  };
  
  // Only set application/json if body is not FormData and Content-Type is not already set
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  // Direct matching to prefix with /api/personal instead of plain /api
  let targetUrl = url;
  if (url.startsWith('/api/')) {
    targetUrl = `${API}/api/personal${url.substring(4)}`;
  } else if (!url.startsWith('http')) {
    targetUrl = `${API}/api/personal/${url.startsWith('/') ? url : '/' + url}`;
  }
  
  return fetch(targetUrl, {
    ...options,
    headers
  });
};
