// Centralized configuration that automatically syncs with .env
export const CONFIG = {
  // API Configuration - automatically reads from .env and adjusts for environment
  get API_URL(): string {
    // Check if we're in production (HTTPS) or development
    const isProduction = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // For production deployment on Vercel
    if (isProduction && !isLocalhost) {
      const envUrl = import.meta.env.VITE_API_URL;
      
      // If environment variable is set and is a valid URL
      if (envUrl && envUrl.startsWith('http')) {
        // Ensure it's HTTPS for production
        if (envUrl.startsWith('http://')) {
          return envUrl.replace('http://', 'https://');
        }
        return envUrl;
      }
      
      // If no valid env URL, try to construct from current domain
      // This assumes backend is deployed at same domain with different path/port
      console.warn('⚠️ No valid VITE_API_URL found in production. Using fallback configuration.');
      
      // Common production backend patterns
      const possibleUrls = [
        `https://${window.location.hostname}:5000`, // Same domain, different port
        `https://api.${window.location.hostname}`,   // API subdomain
        `https://${window.location.hostname}/api`,   // API path
      ];
      
      return possibleUrls[0]; // Return first option as fallback
    }
    
    // For development, use the .env file value
    return import.meta.env.VITE_API_URL || 'http://localhost:5000';
  },
  
  get FRONTEND_HOST(): string {
    return import.meta.env.VITE_FRONTEND_HOST || 'localhost';
  },
  
  get FRONTEND_PORT(): number {
    return parseInt(import.meta.env.VITE_FRONTEND_PORT) || 5174;
  },
  
  get BACKEND_HOST(): string {
    return import.meta.env.VITE_BACKEND_HOST || 'localhost';
  },
  
  get BACKEND_PORT(): number {
    return parseInt(import.meta.env.VITE_BACKEND_PORT) || 5000;
  },
  
  // Dynamic URL builders
  get API_BASE(): string {
    return `${this.API_URL}/api`;
  },
  
  get AUTH_URL(): string {
    return `${this.API_BASE}/auth`;
  },
  
  get QUEUE_URL(): string {
    return `${this.API_BASE}/queue`;
  },
  
  get ADMIN_URL(): string {
    return `${this.API_BASE}/admin`;
  },
  
  get HEALTH_URL(): string {
    return `${this.API_BASE}/health`;
  },
  
  get SOCKET_URL(): string {
    return this.API_URL;
  },
  
  // Get WebSocket URL with proper protocol (ws:// or wss://)
  get WS_URL(): string {
    const apiUrl = this.API_URL;
    if (apiUrl.startsWith('https://')) {
      return apiUrl.replace('https://', 'wss://');
    } else if (apiUrl.startsWith('http://')) {
      return apiUrl.replace('http://', 'ws://');
    }
    return apiUrl;
  },
  
  // Frontend URLs
  get FRONTEND_URL(): string {
    return `http://${this.FRONTEND_HOST}:${this.FRONTEND_PORT}`;
  },
  
  get LOGIN_URL(): string {
    return `${this.AUTH_URL}/login`;
  },
  
  // Helper method to build URLs dynamically
  buildUrl(endpoint: string): string {
    return `${this.API_BASE}${endpoint}`;
  },
  
  // Debug info
  get DEBUG_INFO(): object {
    return {
      API_URL: this.API_URL,
      FRONTEND_HOST: this.FRONTEND_HOST,
      FRONTEND_PORT: this.FRONTEND_PORT,
      BACKEND_HOST: this.BACKEND_HOST,
      BACKEND_PORT: this.BACKEND_PORT,
      API_BASE: this.API_BASE,
      SOCKET_URL: this.SOCKET_URL,
      WS_URL: this.WS_URL,
      FRONTEND_URL: this.FRONTEND_URL,
      isProduction: window.location.protocol === 'https:',
      currentHostname: window.location.hostname
    };
  }
};

// Auto-log configuration on import
if (import.meta.env.DEV) {
  console.log('🔧 Configuration loaded from .env:');
  console.log(CONFIG.DEBUG_INFO);
}
