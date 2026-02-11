import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  windowNumber?: number;
  service?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string, isSuperAdmin?: boolean) => Promise<{user: User}>;
  logout: () => void;
  isLoading: boolean;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to check if token is expired
  const isTokenExpired = useCallback((): boolean => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  }, [token]);

  // Token refresh function
  const refreshToken = async (): Promise<boolean> => {
    if (!token || isTokenExpired()) {
      logout();
      return false;
    }

    try {
      // For now, we'll implement a simple validation
      // In a more advanced system, you'd have a refresh token endpoint
      const response = await axios.get(getApiUrl('/api/auth/validate-token'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.valid) {
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      logout();
      return false;
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      // Check if token is expired before restoring
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp < currentTime) {
        // Token is expired, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoading(false);
        return;
      }
      
      const parsedUser = JSON.parse(savedUser);
      console.log('AuthContext - Loaded user from localStorage:', parsedUser);
      
      // Use setTimeout to avoid synchronous setState
      setTimeout(() => {
        setToken(savedToken);
        setUser(parsedUser);
        setIsLoading(false);
      }, 0);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, isSuperAdmin: boolean = false): Promise<{user: User}> => {
    // Clear any existing auth data first
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
    
    const endpoint = isSuperAdmin ? '/api/auth/super-admin-login' : '/api/auth/login';
    const response = await axios.post(getApiUrl(endpoint), {
      username,
      password
    });

    const { token: newToken, user: userData } = response.data;
    
    setToken(newToken);
    setUser(userData);
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    return { user: userData };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  // Auto-logout when token expires
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = () => {
      if (isTokenExpired()) {
        console.log('Token expired, logging out...');
        logout();
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    
    return () => clearInterval(interval);
  }, [token, isTokenExpired]);

  const value = {
    user,
    token,
    login,
    logout,
    isLoading,
    refreshToken,
    isTokenExpired
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
