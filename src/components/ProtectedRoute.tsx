import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [],
  redirectTo = '/admin/login' 
}) => {
  const { user, token, isLoading } = useAuth();
  const { showError } = useToast();
  const location = useLocation();

  useEffect(() => {
    // Show toast notification if user is authenticated but doesn't have required role
    if (user && token && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      const roleMessages: Record<string, string> = {
        'admin': 'Admin access required. Please use the admin login.',
        'window': 'Window user access required. Please use the window login.',
        'super_admin': 'Super admin access required.'
      };
      
      const message = roleMessages[requiredRoles[0]] || 'Access denied. Insufficient permissions.';
      showError('Access Denied', message);
    }
  }, [user, token, requiredRoles, showError]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-sm">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !token) {
    // Store the attempted location for redirect after login
    const state = { from: location.pathname };
    return <Navigate to={redirectTo} state={state} replace />;
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    // Determine the appropriate redirect based on user's current role
    let redirectPath = '/admin/login';
    if (user.role === 'window') {
      redirectPath = '/window/login';
    } else if (user.role === 'admin' || user.role === 'super_admin') {
      redirectPath = '/admin/login';
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
