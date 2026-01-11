
// API configuration - use relative paths for same-origin deployment
// For development with separate servers, use full URLs like 'http://localhost:8000/api/v1'
export const API_BASE_URL = '/api/v1';
export const STATIC_BASE_URL = ''; // For images, relative to current host

// WebSocket URL - computed at runtime
export const getWsBaseUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/heartbeat`;
};

export const PING_INTERVAL_MS = 3000; // Send ping every 3 seconds
export const RECONNECT_WINDOW_MS = 10000; // 10 seconds to reconnect
