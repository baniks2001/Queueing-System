import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import PublicKiosk from './components/public/PublicKiosk';
import AdminLogin from './components/admin/AdminLogin';
import WindowLogin from './components/window/WindowLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import WindowDashboard from './components/window/WindowDashboard';
import PublicDisplay from './components/public/PublicDisplay';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { QueueProvider } from './contexts/QueueContext';
import { ToastProvider } from './contexts/ToastContext';
import { CONFIG } from './config/app-config';

// Connection Test Component - Non-blocking
const ConnectionTest = () => {
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch(CONFIG.HEALTH_URL);
        if (response.ok) {
          console.log('✅ Backend connection successful!');
        } else {
          console.error('❌ Backend returned error status');
        }
      } catch (error) {
        console.error('❌ Cannot connect to backend server!');
      }
    };
    
    // IP Synchronization
    const syncIP = async () => {
      try {
        const success = await CONFIG.syncIPWithServer();
        if (success) {
          console.log('✅ IP synchronized with server');
        } else {
          console.error('❌ Failed to sync IP with server');
        }
      } catch (error) {
        console.error('❌ Error during IP synchronization:', error);
      }
    };
    
    // Test connection and sync IP after component mounts
    const initializeConnection = async () => {
      await testConnection();
      await syncIP();
    };
    
    // Test connection after a short delay to not block initial render
    const timer = setTimeout(initializeConnection, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Don't render anything, just test in background
  return null;
};

function App() {
  return (
    <AuthProvider>
      <QueueProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <ConnectionTest />
              <Routes>
                <Route path="/" element={<PublicKiosk />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/window/login" element={<WindowLogin />} />
                
                {/* Protected Admin Routes */}
                <Route 
                  path="/admin/dashboard" 
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'super_admin']} redirectTo="/admin/login">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Protected Window Routes */}
                <Route 
                  path="/window/dashboard" 
                  element={
                    <ProtectedRoute requiredRoles={['window']} redirectTo="/window/login">
                      <WindowDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/window/:windowNumber" 
                  element={
                    <ProtectedRoute requiredRoles={['window']} redirectTo="/window/login">
                      <WindowDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Public Display Route */}
                <Route path="/display" element={<PublicDisplay />} />
              </Routes>
            </div>
          </Router>
        </ToastProvider>
      </QueueProvider>
    </AuthProvider>
  );
}

export default App;
