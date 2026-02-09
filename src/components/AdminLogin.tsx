import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LockClosedIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// Get superadmin credentials from environment
const SUPERADMIN_USERNAME = import.meta.env.VITE_SUPERADMIN_USERNAME || 'superadmin';
const SUPERADMIN_PASSWORD = import.meta.env.VITE_SUPERADMIN_PASSWORD || 'SuperAdmin123!';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Auto-detect superadmin credentials
  const handleInputChange = (field: 'username' | 'password', value: string) => {
    if (field === 'username') {
      setUsername(value);
      // Check if username matches superadmin (case-insensitive)
      const isSuperAdmin = value.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase();
      if (isSuperAdmin) {
        // Auto-set password if superadmin username is detected
        setPassword(SUPERADMIN_PASSWORD);
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
      // Auto-detect superadmin based on credentials
      const isSuperAdmin = username.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase() && password === SUPERADMIN_PASSWORD;
      await login(username, password, isSuperAdmin);
      navigate('/admin/dashboard');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if current credentials match superadmin
  const isSuperAdminDetected = username.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase() && password === SUPERADMIN_PASSWORD;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="card bg-white shadow-2xl rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <ShieldCheckIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Admin Login</h2>
            <p className="text-xl text-gray-600 mt-2">
              {isSuperAdminDetected ? 'Super Administrator' : 'Administrator'} Access
            </p>
            {isSuperAdminDetected && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>🔑 Super Admin Mode Detected</strong><br />
                  Username: {SUPERADMIN_USERNAME}<br />
                  Password: {SUPERADMIN_PASSWORD}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <LockClosedIcon className="w-5 h-5 mr-2" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Public Kiosk
            </button>
            <button
              onClick={() => navigate('/window/login')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
