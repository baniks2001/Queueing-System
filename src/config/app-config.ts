// Centralized configuration that reads from unified .env
export const CONFIG = {
  // API Configuration - reads from unified .env
  get API_URL(): string {
    // Check if we're in development or production
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      // In development, use the backend host from .env file
      return `http://${import.meta.env.VITE_BACKEND_HOST || 'localhost'}:${import.meta.env.VITE_BACKEND_PORT || '5000'}`;
    } else {
      // In production, use the configured API URL
      return import.meta.env.VITE_API_URL || 'http://localhost:5000';
    }
  },
  
  get FRONTEND_HOST(): string {
    return import.meta.env.VITE_FRONTEND_HOST || 'localhost';
  },
  
  get FRONTEND_PORT(): number {
    return parseInt(import.meta.env.VITE_FRONTEND_PORT || '5174');
  },
  
  get BACKEND_HOST(): string {
    return import.meta.env.VITE_BACKEND_HOST || 'localhost';
  },
  
  get BACKEND_PORT(): number {
    return parseInt(import.meta.env.VITE_BACKEND_PORT || '5000');
  },
  
  // IP Synchronization
  async syncIPWithServer(): Promise<boolean> {
    try {
      const currentHost = this.FRONTEND_HOST;
      const currentPort = this.FRONTEND_PORT;
      
      const response = await fetch(`${this.API_URL}/api/sync-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frontendHost: currentHost,
          frontendPort: currentPort
        })
      });
      
      if (response.ok) {
        console.log('✅ IP synchronized with server:', await response.json());
        return true;
      } else {
        console.error('❌ Failed to sync IP with server');
        return false;
      }
    } catch (error) {
      console.error('❌ Error syncing IP:', error);
      return false;
    }
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
      FRONTEND_URL: this.FRONTEND_URL
    };
  }
};

// Auto-log configuration on import
if (import.meta.env.DEV) {
  console.log('🔧 Configuration loaded from .env:');
  console.log(CONFIG.DEBUG_INFO);
}
