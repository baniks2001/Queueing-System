// API Configuration for Network Access - Now using centralized CONFIG
import { CONFIG } from './app-config';

export const API_CONFIG = {
  // Get the current server URL from centralized configuration
  getServerUrl: (): string => {
    console.log('🔧 Using centralized CONFIG API URL:', CONFIG.API_URL);
    return CONFIG.API_URL;
  },
  
  // API endpoints
  endpoints: {
    auth: '/api/auth',
    queue: '/api/queue',
    users: '/api/users',
    admin: '/api/admin',
    health: '/api/health'
  },
  
  // Socket.IO configuration
  socket: {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.getServerUrl();
  const fullUrl = `${baseUrl}${endpoint}`;
  
  // Debug logging
  console.log('🔗 API URL:', fullUrl);
  console.log('🌐 Hostname:', window.location.hostname);
  console.log('🔧 Environment API URL:', CONFIG.API_URL);
  console.log('🔧 Environment Backend Host:', CONFIG.BACKEND_HOST);
  console.log('🔧 Environment Frontend Host:', CONFIG.FRONTEND_HOST);
  
  return fullUrl;
};

// Helper function to get socket URL
export const getSocketUrl = (): string => {
  const socketUrl = API_CONFIG.getServerUrl();
  
  // Debug logging
  console.log('🔌 Socket URL:', socketUrl);
  
  return socketUrl;
};

// Test API connection
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('/api/health'));
    const data = await response.json();
    console.log('✅ API Connection Test:', data);
    return response.ok;
  } catch (error) {
    console.error('❌ API Connection Test Failed:', error);
    return false;
  }
};
