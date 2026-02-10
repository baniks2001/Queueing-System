import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LockClosedIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// Get superadmin credentials from environment (no fallbacks)
const SUPERADMIN_USERNAME = import.meta.env.VITE_SUPERADMIN_USERNAME;
const SUPERADMIN_PASSWORD = import.meta.env.VITE_SUPERADMIN_PASSWORD;

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle input changes with superadmin detection
  const handleInputChange = (field: 'username' | 'password', value: string) => {
    if (field === 'username') {
      setUsername(value);
      // Auto-dect superadmin if environment variables are set
      if (SUPERADMIN_USERNAME && SUPERADMIN_PASSWORD) {
        const isSuperAdmin = value.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase();
        if (isSuperAdmin) {
          setPassword(SUPERADMIN_PASSWORD);
        }
      }
    } else if (field === 'password') {
      setPassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Detect if this is a superadmin login (only if env vars are set)
      const isSuperAdmin = SUPERADMIN_USERNAME && SUPERADMIN_PASSWORD && 
        username.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase() && 
        password === SUPERADMIN_PASSWORD;
      
      await login(username, password, isSuperAdmin);
      navigate('/admin/dashboard');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-2 sm:px-4 lg:px-8 py-4">
      <div className="w-full max-w-md mx-auto">
        <div className="card bg-white shadow-2xl rounded-lg p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <ShieldCheckIcon className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Admin Login</h2>
            <p className="text-lg sm:text-xl text-gray-600 mt-2">
              Administrator Access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-4 text-sm sm:text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center space-y-2">
            <button
              onClick={() => navigate('/')}
              className="block w-full text-blue-600 hover:text-blue-800 text-sm font-medium py-2"
            >
              ← Back to Public Kiosk
            </button>
            <button
              onClick={() => navigate('/window/login')}
              className="block w-full text-blue-600 hover:text-blue-800 text-sm font-medium py-2"
            >
              ← Window Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
