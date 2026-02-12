import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiUrl, getUploadUrl } from '../../config/api';
import ConfirmationModal from '../ConfirmationModal';
import {
  QueueListIcon,
  TicketIcon,
  EyeIcon,
  UserGroupIcon,
  UsersIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  PlayIcon,
  StopIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import UserManagement from './UserManagement';
import AdminManagement from './AdminManagement';
import ServiceManagement from './ServiceManagement';
import QueueManagement from './QueueManagement';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalQueues: number;
  waitingQueues: number;
  servingQueues: number;
  completedQueues: number;
}

interface TransactionHistory {
  _id: string;
  date: string;
  title: string;
  totalTransactions: number;
  transactionTypes: { [key: string]: number };
  queueNumbers: string[];
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();

  // Define tabs first
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: QueueListIcon, superAdminOnly: false },
    { id: 'users', name: 'User Management', icon: UsersIcon, superAdminOnly: false },
    { id: 'admins', name: 'Admin Management', icon: CogIcon, superAdminOnly: true },
    { id: 'flow', name: 'Transaction Flow', icon: WrenchScrewdriverIcon, superAdminOnly: false },
    { id: 'queues', name: 'Queue Management', icon: TicketIcon, superAdminOnly: false }
  ];

  const filteredTabs = tabs.filter(tab => !tab.superAdminOnly || user?.role === 'super_admin');

  // Initialize activeTab from localStorage to prevent flicker and maintain state on refresh
  const getInitialTab = () => {
    const savedTab = localStorage.getItem('adminActiveTab');
    return savedTab && filteredTabs.some(tab => tab.id === savedTab) ? savedTab : 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalQueues: 0,
    waitingQueues: 0,
    servingQueues: 0,
    completedQueues: 0
  });
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [kioskStatus, setKioskStatus] = useState<'open' | 'standby' | 'closed'>('closed');
  const [kioskTitle, setKioskTitle] = useState('Queue Management System');
  const [governmentOfficeName, setGovernmentOfficeName] = useState('Government Office');
  const [logo, setLogo] = useState<string | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTransactionSummaryModal, setShowTransactionSummaryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [closeModalData, setCloseModalData] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionHistory | null>(null);

  useEffect(() => {
    fetchStats();
    fetchKioskStatus();
    fetchTransactionHistory();
    // Mark as initialized after initial data load
    setIsInitialized(true);
  }, []);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab, isInitialized]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const [queueStats] = await Promise.all([
        fetch(getApiUrl('/api/queue/stats'), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      const queueData = await queueStats.json();
      
      const statusStats = queueData.statusStats || [];
      const waitingCount = statusStats.find((s: any) => s._id === 'waiting')?.count || 0;
      const servingCount = statusStats.find((s: any) => s._id === 'serving')?.count || 0;
      const completedCount = statusStats.find((s: any) => s._id === 'completed')?.count || 0;

      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalQueues: waitingCount + servingCount + completedCount,
        waitingQueues: waitingCount,
        servingQueues: servingCount,
        completedQueues: completedCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchKioskStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/kiosk/status'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKioskStatus(data.status || 'closed');
        setIsKioskOpen(data.isOpen || false);
        setKioskTitle(data.title || 'Queue Management System');
        setGovernmentOfficeName(data.governmentOfficeName || 'Government Office');
        setLogo(data.logo || null);
      }
    } catch (error) {
      console.error('Error fetching kiosk status:', error);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/kiosk/transactions'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactionHistory(data);
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error);
    }
  };

  const openKiosk = async () => {
    // Check if title is set before opening kiosk
    if (!kioskTitle || kioskTitle.trim() === '') {
      showWarning('Kiosk Title Required', 'Please set a kiosk title before opening the kiosk.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/kiosk/open'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: kioskTitle,
          governmentOfficeName: governmentOfficeName
        })
      });
      
      if (response.ok) {
        setKioskStatus('open');
        setIsKioskOpen(true);
        fetchKioskStatus();
        fetchStats();
      }
    } catch (error) {
      console.error('Error opening kiosk:', error);
      showError('Failed to Open Kiosk', 'An error occurred while opening the kiosk. Please try again.');
    }
  };

  const standbyKiosk = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/kiosk/standby'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: kioskTitle,
          governmentOfficeName: governmentOfficeName
        })
      });
      
      if (response.ok) {
        setKioskStatus('standby');
        setIsKioskOpen(false);
        showSuccess('Kiosk on Standby', 'Public Kiosk has been set to standby successfully!');
      }
    } catch (error) {
      console.error('Error setting kiosk to standby:', error);
      showError('Failed to Set Standby', 'An error occurred while setting kiosk to standby. Please try again.');
    }
  };

  const closeKiosk = async () => {
    setShowCloseModal(true);
  };

  const confirmCloseKiosk = async () => {
    setShowCloseModal(false);
    try {
      const token = localStorage.getItem('token');
      
      // Reset on-hold queues first
      console.log('🔄 Resetting on-hold queues...');
      const resetOnHoldResponse = await fetch(getApiUrl('/api/queue/reset-on-hold'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (resetOnHoldResponse.ok) {
        const resetData = await resetOnHoldResponse.json();
        console.log(`✅ Reset ${resetData.resetQueues} on-hold queues and deleted ${resetData.deletedOnHoldRecords} records`);
      } else {
        console.warn('⚠️ Failed to reset on-hold queues');
      }
      
      // Close kiosk
      const response = await fetch(getApiUrl('/api/kiosk/close'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKioskStatus('closed');
        setIsKioskOpen(false);
        
        // Show transaction history modal if there are transactions
        if (data.transactionHistory && data.transactionHistory.totalTransactions > 0) {
          setCloseModalData(data.transactionHistory);
          // Use setTimeout to ensure confirmation modal is fully closed before showing summary
          setTimeout(() => {
            setShowTransactionSummaryModal(true);
          }, 300);
        } else {
          showSuccess('Kiosk Closed', 'Public Kiosk closed successfully! No transactions to save. All on-hold queues have been reset.');
        }
        
        fetchTransactionHistory();
        fetchStats();
      }
    } catch (error) {
      console.error('Error closing kiosk:', error);
      showError('Failed to Close Kiosk', 'An error occurred while closing the kiosk. Please try again.');
    }
  };

  const updateKioskTitle = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/kiosk/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: kioskTitle,
          governmentOfficeName: governmentOfficeName
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        showSuccess('Settings Updated', 'Kiosk settings have been updated successfully!');
        // Update local state with the response
        if (data.status) {
          setKioskStatus(data.status.status || 'closed');
          setIsKioskOpen(data.status.isOpen || false);
          setKioskTitle(data.status.title || kioskTitle);
          setGovernmentOfficeName(data.status.governmentOfficeName || governmentOfficeName);
          setLogo(data.status.logo || logo);
        }
      } else {
        const errorData = await response.json();
        showError('Update Failed', `Error updating settings: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating kiosk settings:', error);
      showError('Update Failed', 'An error occurred while updating kiosk settings. Please try again.');
    }
  };

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showWarning('File Too Large', 'File size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showWarning('Invalid File Type', 'Only image files are allowed');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(getApiUrl('/api/kiosk/upload-logo'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
          // Don't set Content-Type header for FormData - browser sets it automatically
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess('Logo Uploaded', 'Logo has been uploaded successfully!');
        setLogo(data.logo);
        fetchKioskStatus(); // Refresh kiosk status
      } else {
        const errorData = await response.json();
        showError('Upload Failed', `Error uploading logo: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      showError('Upload Failed', 'An error occurred while uploading the logo. Please try again.');
    }
  };

  const exportTransaction = async (transaction: TransactionHistory) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/kiosk/export/${transaction._id}`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaction-${transaction.date}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting transaction:', error);
      showError('Export Failed', 'An error occurred while exporting the transaction. Please try again.');
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setShowDeleteModal(true);
  };

  const confirmDeleteTransaction = async () => {
    setShowDeleteModal(false);
    if (!selectedTransactionId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/kiosk/transactions/${selectedTransactionId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setTransactionHistory(prev => prev.filter(t => t._id !== selectedTransactionId));
        showSuccess('Transaction Deleted', 'Transaction has been deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showError('Deletion Failed', 'An error occurred while deleting the transaction. Please try again.');
    }
  };

  const viewTransaction = (transaction: TransactionHistory) => {
    setSelectedTransaction(transaction);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Kiosk Status - Professional Card */}
      {user?.role === 'super_admin' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Status Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Status Indicator */}
                <div className="relative">
                  <div className={`w-5 h-5 rounded-full ${
                    isKioskOpen ? 'bg-emerald-500' : 
                    kioskStatus === 'standby' ? 'bg-amber-500' : 'bg-red-500'
                  }`}></div>
                  <div className={`absolute inset-0 w-5 h-5 rounded-full ${
                    isKioskOpen ? 'bg-emerald-500' : 
                    kioskStatus === 'standby' ? 'bg-amber-500' : 'bg-red-500'
                  } animate-ping opacity-75`}></div>
                </div>
                
                {/* Status Text */}
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-2xl font-bold text-white">Kiosk Status</h3>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                      isKioskOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                      kioskStatus === 'standby' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 
                      'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {isKioskOpen ? 'OPERATIONAL' : kioskStatus === 'standby' ? 'STANDBY' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1 font-medium">
                    {isKioskOpen ? 'System is active and serving clients' : 
                     kioskStatus === 'standby' ? 'System is temporarily paused' : 
                     'System is currently offline'}
                  </p>
                </div>
              </div>
              
              {/* Status Metrics */}
              <div className="hidden lg:flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.waitingQueues}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Waiting</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.servingQueues}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Serving</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.totalQueues}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Configuration Section */}
          <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Organization Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Name</label>
                  <input
                    type="text"
                    value={governmentOfficeName}
                    onChange={(e) => setGovernmentOfficeName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 bg-white shadow-sm"
                    placeholder="Enter organization name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {isKioskOpen ? 'Display Title' : 'Kiosk Title'}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={kioskTitle}
                      onChange={(e) => setKioskTitle(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 bg-white shadow-sm"
                      placeholder="Enter kiosk display title"
                    />
                    <button
                      onClick={updateKioskTitle}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Update
                    </button>
                  </div>
                  {!isKioskOpen && (!kioskTitle || kioskTitle.trim() === '') && (
                    <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Title is required before activating kiosk</p>
                  )}
                </div>
              </div>
              
              {/* Branding Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Organization Logo</label>
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadLogo}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200 bg-white shadow-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
                    </div>
                    {logo && (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="relative">
                          <img 
                            src={getUploadUrl(logo)} 
                            alt="Organization Logo" 
                            className="h-16 w-16 object-contain border-2 border-gray-200 rounded-lg shadow-sm bg-white p-2"
                            onError={(e) => {
                              console.error('Logo failed to load:', getUploadUrl(logo));
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                        </div>
                        <span className="text-xs text-emerald-600 font-medium">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Kiosk Control Buttons */}
          <div className="px-4 sm:px-6 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {!isKioskOpen ? (
                <button
                  onClick={openKiosk}
                  className="flex items-center justify-center px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 touch-manipulation"
                >
                  <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden xs:inline">Open Kiosk</span>
                  <span className="xs:hidden">Open</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={closeKiosk}
                    className="flex items-center justify-center px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 touch-manipulation"
                  >
                    <StopIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span className="hidden xs:inline">Close Kiosk</span>
                    <span className="xs:hidden">Close</span>
                  </button>
                  <button
                    onClick={standbyKiosk}
                    className="flex items-center justify-center px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-xl hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 touch-manipulation"
                  >
                    <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span className="hidden xs:inline">Standby</span>
                    <span className="xs:hidden">Wait</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modern Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-3 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-blue-500">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-center sm:text-left">
              <p className="text-blue-100 text-xs sm:text-sm font-medium uppercase tracking-wide mb-1 sm:mb-1">Total Queues</p>
              <p className="text-xl sm:text-3xl font-bold">{stats.totalQueues}</p>
            </div>
            <div className="bg-blue-500/20 p-2 sm:p-3 rounded-xl mt-2 sm:mt-0">
              <QueueListIcon className="w-4 h-4 sm:w-8 sm:h-8 text-blue-100" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-3 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-emerald-500">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-center sm:text-left">
              <p className="text-emerald-100 text-xs sm:text-sm font-medium uppercase tracking-wide mb-1 sm:mb-1">Waiting</p>
              <p className="text-xl sm:text-3xl font-bold">{stats.waitingQueues}</p>
            </div>
            <div className="bg-emerald-500/20 p-2 sm:p-3 rounded-xl mt-2 sm:mt-0">
              <UserGroupIcon className="w-4 h-4 sm:w-8 sm:h-8 text-emerald-100" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-3 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-purple-500">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-center sm:text-left">
              <p className="text-purple-100 text-xs sm:text-sm font-medium uppercase tracking-wide mb-1 sm:mb-1">Serving</p>
              <p className="text-xl sm:text-3xl font-bold">{stats.servingQueues}</p>
            </div>
            <div className="bg-purple-500/20 p-2 sm:p-3 rounded-xl mt-2 sm:mt-0">
              <TicketIcon className="w-4 h-4 sm:w-8 sm:h-8 text-purple-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Transaction History */}
      {user?.role === 'super_admin' && (
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Recent Transaction History</h3>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg touch-manipulation"
              >
                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                <span className="hidden xs:inline">View All</span>
                <span className="xs:hidden">All</span>
              </button>
            </div>
          </div>
          
          {/* Mobile: Card Layout */}
          <div className="sm:hidden px-4 py-4 space-y-4">
            {transactionHistory.slice(0, 5).map((transaction) => (
              <div key={transaction._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  {/* Date and Title */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        {new Date(transaction.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {transaction.title}
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {transaction.totalTransactions}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => viewTransaction(transaction)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                      title="View Transaction"
                    >
                      <MagnifyingGlassIcon className="w-3 h-3 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => exportTransaction(transaction)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                      title="Export Transaction"
                    >
                      <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                      Export
                    </button>
                    <button
                      onClick={() => deleteTransaction(transaction._id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                      title="Delete Transaction"
                    >
                      <TrashIcon className="w-3 h-3 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {transactionHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="flex flex-col items-center">
                  <DocumentArrowDownIcon className="w-8 h-8 text-gray-300 mb-3" />
                  <p className="text-sm font-medium">No transaction history available</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Desktop/Tablet: Table Layout */}
          <div className="hidden sm:block overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {transactionHistory.slice(0, 5).map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {transaction.totalTransactions}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewTransaction(transaction)}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="View Transaction"
                          >
                            <MagnifyingGlassIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => exportTransaction(transaction)}
                            className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Export Transaction"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction._id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete Transaction"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactionHistory.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="flex flex-col items-center">
                  <DocumentArrowDownIcon className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-lg font-medium">No transaction history available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderTransactionModal = () => {
    if (!selectedTransaction) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedTransaction.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Transactions</label>
                <p className="mt-1 text-sm text-gray-900">{selectedTransaction.totalTransactions}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Queue Numbers</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedTransaction.queueNumbers.join(', ')}
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Types</label>
              <div className="space-y-2">
                {Object.entries(selectedTransaction.transactionTypes).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">{type}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={() => exportTransaction(selectedTransaction)}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium touch-manipulation active-scale"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="flex items-center justify-center px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium touch-manipulation active-scale"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryModal = () => {
    if (!showHistoryModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[85vh] overflow-hidden border border-gray-200">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 border-b border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <DocumentArrowDownIcon className="w-5 h-5 text-slate-200" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Transaction History</h3>
                  <p className="text-slate-300 text-sm mt-0.5">
                    Complete record of all transaction sessions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Modal Body */}
          <div className="flex-1 overflow-hidden">
            {/* Summary Stats */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sessions</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{transactionHistory.length}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {transactionHistory.reduce((sum, t) => sum + t.totalTransactions, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <QueueListIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg per Session</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {transactionHistory.length > 0 
                          ? Math.round(transactionHistory.reduce((sum, t) => sum + t.totalTransactions, 0) / transactionHistory.length)
                          : 0}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <ChartBarIcon className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Transaction Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Served</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactionHistory.map((transaction, index) => (
                    <tr key={transaction._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {new Date(transaction.date).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(transaction.date).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 rounded-full">
                            <DocumentArrowDownIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{transaction.title}</div>
                            <div className="text-xs text-gray-500">Session #{index + 1}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {transaction.totalTransactions}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.transactionTypes && Object.keys(transaction.transactionTypes).length > 0 ? (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span>{Object.keys(transaction.transactionTypes).length} types</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setShowHistoryModal(false);
                            }}
                            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                          >
                            <EyeIcon className="w-3 h-3 mr-1.5" />
                            View Details
                          </button>
                          <button
                            onClick={() => exportTransaction(transaction)}
                            className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                          >
                            <DocumentArrowDownIcon className="w-3 h-3 mr-1.5" />
                            Export
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {transactionHistory.length === 0 && (
              <div className="text-center py-12">
                <div className="flex flex-col items-center">
                  <DocumentArrowDownIcon className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transaction History</h3>
                  <p className="text-gray-500">No transaction sessions have been recorded yet.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCloseModal = () => {
    if (!showTransactionSummaryModal || !closeModalData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4 p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Summary</h3>
            <button
              onClick={() => setShowTransactionSummaryModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="text-green-800 font-semibold mb-2">Kiosk Closed Successfully!</h4>
              <p className="text-green-700">All transactions have been saved to database.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Session Details</h5>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Transaction Name:</span>
                      <p className="font-medium">{closeModalData.title}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Date:</span>
                      <p className="font-medium">{new Date(closeModalData.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Total Transactions:</span>
                      <p className="font-medium text-lg text-blue-600">{closeModalData.totalTransactions}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Queue Numbers:</span>
                      <p className="font-medium">{closeModalData.queueNumbers?.length || 0} queues</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {closeModalData.transactionTypes && Object.keys(closeModalData.transactionTypes).length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Transaction Types</h5>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {Object.entries(closeModalData.transactionTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between py-2 border-b border-gray-200 last:border-0">
                        <span className="text-gray-700">{type}</span>
                        <span className="font-medium">{String(count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTransactionSummaryModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Transaction Detail Modal */}
      {renderTransactionModal()}
      
      {/* History Modal */}
      {renderHistoryModal()}
      
      {/* Close Modal */}
      {renderCloseModal()}
      
      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={confirmCloseKiosk}
        title="Close Kiosk"
        message="Are you sure you want to close the kiosk? This will save all transactions, reset queue numbers, and clear all on-hold queues."
        confirmText="Close Kiosk"
        cancelText="Cancel"
        type="warning"
      />
      
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
      
      {/* Compact Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg border-b border-blue-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-2 sm:py-3">
            {/* Left side - Title */}
            <div className="flex items-center">
              <h1 className="text-lg sm:text-2xl font-bold text-white">Admin Dashboard</h1>
              <span className="text-blue-200 text-xs sm:text-sm ml-2 sm:ml-3 block">
                {user?.username}
              </span>
            </div>
            
            {/* Right side - Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation active-scale"
                aria-label="Menu"
                aria-expanded={isDropdownOpen}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate('/display'); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                  >
                    <EyeIcon className="w-4 h-4 mr-3 text-gray-500" />
                    View Display
                  </button>
                  <button
                    onClick={() => { setIsDropdownOpen(false); handleLogout(); }}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-gray-200"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3 text-red-500" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modern Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          {/* One line layout for all screen sizes */}
          <nav className="flex justify-between py-2 gap-1">
            {filteredTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center px-1 sm:px-2 py-2 rounded-lg font-medium transition-all duration-200 text-xs touch-manipulation flex-1 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'} ${tab.name.length > 10 ? 'sm:mr-1' : 'sm:mr-2'}`} />
                  <span className={`font-medium ${tab.name.length > 10 ? 'hidden sm:block' : 'block'} text-center leading-tight`}>
                    {tab.name.length > 10 ? 
                      (tab.name.includes('Management') ? tab.name.replace(' Management', '') : 
                       tab.name.includes('Transaction') ? 'Trans. Flow' : 
                       tab.name.substring(0, 8) + '...') : 
                      tab.name
                    }
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div>
          {isInitialized && (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'admins' && <AdminManagement />}
              {activeTab === 'flow' && <ServiceManagement />}
              {activeTab === 'queues' && <QueueManagement />}
            </>
          )}
          {!isInitialized && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
