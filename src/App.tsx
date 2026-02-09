import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import PublicKiosk from './components/PublicKiosk';
import AdminLogin from './components/AdminLogin';
import WindowLogin from './components/WindowLogin';
import AdminDashboard from './components/AdminDashboard';
import WindowDashboard from './components/WindowDashboard';
import PublicDisplay from './components/PublicDisplay';
import TestComponent from './components/TestComponent';
import { AuthProvider } from './contexts/AuthContext';
import { QueueProvider } from './contexts/QueueContext';
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
    
    // Test connection after a short delay to not block initial render
    const timer = setTimeout(testConnection, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Don't render anything, just test in background
  return null;
};

function App() {
  return (
    <AuthProvider>
      <QueueProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <ConnectionTest />
            <Routes>
              <Route path="/test" element={<TestComponent />} />
              <Route path="/" element={<PublicKiosk />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/window/login" element={<WindowLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/window/dashboard" element={<WindowDashboard />} />
              <Route path="/window/:windowNumber" element={<WindowDashboard />} />
              <Route path="/display" element={<PublicDisplay />} />
            </Routes>
          </div>
        </Router>
      </QueueProvider>
    </AuthProvider>
  );
}

export default App;
