import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiUrl, getUploadUrl } from '../config/api';
import ConfirmationModal from './ConfirmationModal';
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
  const [activeTab, setActiveTab] = useState('dashboard');
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [closeModalData, setCloseModalData] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionHistory | null>(null);
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

  useEffect(() => {
    fetchStats();
    fetchKioskStatus();
    fetchTransactionHistory();
  }, []);

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
          setShowCloseModal(true);
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
      {/* Kiosk Status - Modern Card */}
      {user?.role === 'super_admin' && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-4 h-4 rounded-full ${
                  isKioskOpen ? 'bg-green-400 shadow-lg shadow-green-400/50' : 
                  kioskStatus === 'standby' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'
                } animate-pulse`}></div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Kiosk Status: <span className="font-light">
                      {isKioskOpen ? 'OPEN' : kioskStatus === 'standby' ? 'STANDBY' : 'CLOSED'}
                    </span>
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {isKioskOpen ? 'Public kiosk is currently accepting queue numbers' : 'Public kiosk is closed'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Government Office/Company Name:</h4>
                <input
                  type="text"
                  value={governmentOfficeName}
                  onChange={(e) => setGovernmentOfficeName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                  placeholder="Enter government office or company name"
                />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {isKioskOpen ? 'Current Title:' : 'Set Kiosk Title:'}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={kioskTitle}
                    onChange={(e) => setKioskTitle(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                    placeholder="Enter kiosk title"
                  />
                  <button
                    onClick={updateKioskTitle}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Update Settings
                  </button>
                </div>
                {!isKioskOpen && (!kioskTitle || kioskTitle.trim() === '') && (
                  <p className="text-xs text-red-600 mt-1">Title is required before opening kiosk</p>
                )}
              </div>
            </div>

            {/* Logo Upload */}
            <div className="mt-4 pt-4 border-t border-gray-300">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Logo Upload:</h4>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadLogo}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
                />
                {logo && (
                  <div className="flex items-center space-x-3">
                    <img 
                      src={getUploadUrl(logo)} 
                      alt="Logo" 
                      className="h-12 w-12 object-contain border border-gray-300 rounded-lg shadow-sm"
                      onError={(e) => {
                        console.error('Logo failed to load:', getUploadUrl(logo));
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-sm text-green-600 font-medium">Logo uploaded successfully</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Upload a logo (max 5MB, image files only)</p>
            </div>
          </div>
          
          {/* Kiosk Control Buttons */}
          <div className="px-6 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {!isKioskOpen ? (
                <button
                  onClick={openKiosk}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Open Kiosk
                </button>
              ) : (
                <>
                  <button
                    onClick={closeKiosk}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <StopIcon className="w-5 h-5 mr-2" />
                    Close Kiosk
                  </button>
                  <button
                    onClick={standbyKiosk}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-xl hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Standby
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total Queues Today</p>
              <p className="text-3xl font-bold mt-1">{stats.totalQueues}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <QueueListIcon className="w-8 h-8 text-blue-100" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium uppercase tracking-wide">Currently Waiting</p>
              <p className="text-3xl font-bold mt-1">{stats.waitingQueues}</p>
            </div>
            <div className="bg-emerald-500/20 p-3 rounded-xl">
              <UserGroupIcon className="w-8 h-8 text-emerald-100" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Currently Serving</p>
              <p className="text-3xl font-bold mt-1">{stats.servingQueues}</p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-xl">
              <TicketIcon className="w-8 h-8 text-purple-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Transaction History */}
      {user?.role === 'super_admin' && (
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Recent Transaction History</h3>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
              >
                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                View All
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
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
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-medium">
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
          
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => exportTransaction(selectedTransaction)}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">All Transaction History</h3>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactionHistory.map((transaction) => (
                  <tr key={transaction._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.totalTransactions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowHistoryModal(false);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => exportTransaction(transaction)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactionHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transaction history available
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCloseModal = () => {
    if (!showCloseModal || !closeModalData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4 p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Summary</h3>
            <button
              onClick={() => setShowCloseModal(false)}
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
                onClick={() => setShowCloseModal(false)}
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
      
      {/* Dark Blue Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg border-b border-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
                <span className="text-blue-200 text-sm sm:text-base block mt-1">
                  Welcome back, <span className="font-semibold text-white">{user?.username}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => navigate('/display')}
                className="flex items-center justify-center px-4 py-2.5 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                View Display
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-1 overflow-x-auto">
            {filteredTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 mr-2 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'admins' && <AdminManagement />}
          {activeTab === 'flow' && <ServiceManagement />}
          {activeTab === 'queues' && <QueueManagement />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
