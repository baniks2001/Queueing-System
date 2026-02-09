import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/api';
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
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeModalData, setCloseModalData] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionHistory | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/kiosk/open'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: kioskTitle })
      });
      
      if (response.ok) {
        setKioskStatus('open');
        setIsKioskOpen(true);
        alert('Public Kiosk opened successfully!');
      }
    } catch (error) {
      console.error('Error opening kiosk:', error);
      alert('Error opening kiosk');
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
        body: JSON.stringify({ title: kioskTitle })
      });
      
      if (response.ok) {
        setKioskStatus('standby');
        setIsKioskOpen(false);
        alert('Public Kiosk set to standby successfully!');
      }
    } catch (error) {
      console.error('Error setting kiosk to standby:', error);
      alert('Error setting kiosk to standby');
    }
  };

  const closeKiosk = async () => {
    if (!confirm('Are you sure you want to close the kiosk? This will save all transactions and reset queue numbers.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
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
          alert('Public Kiosk closed successfully! No transactions to save.');
        }
        
        fetchTransactionHistory();
        fetchStats();
      }
    } catch (error) {
      console.error('Error closing kiosk:', error);
      alert('Error closing kiosk');
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
      alert('Error exporting transaction');
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/kiosk/transactions/${transactionId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setTransactionHistory(prev => prev.filter(t => t._id !== transactionId));
        alert('Transaction deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction');
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
    <div>
      {/* Kiosk Status - Prominent Display like Election System */}
      {user?.role === 'super_admin' && (
        <div className="mb-8 bg-white rounded-lg shadow-xl border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${isKioskOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <h3 className="text-xl font-bold text-gray-900">
                Kiosk Status: 
                <span className={isKioskOpen ? 'text-green-600' : 'text-red-600'}>
                  {isKioskOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </h3>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleString()}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kiosk Title
              </label>
              <input
                type="text"
                value={kioskTitle}
                onChange={(e) => setKioskTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter kiosk title (e.g., Enrollment, Department Name)"
              />
            </div>
            
            <div className="flex items-end space-x-4">
              <div>
                <div className="text-sm text-gray-500 mb-2">
                  {kioskStatus === 'open' ? 'Kiosk is currently open and serving customers' : 
                   kioskStatus === 'standby' ? 'Kiosk is currently in standby mode' : 
                   'Kiosk is currently closed'}
                </div>
                <div className="text-xs text-gray-400">
                  Last updated: {new Date().toLocaleString()}
                </div>
              </div>
              <div className="flex space-x-2">
                {kioskStatus !== 'open' && (
                  <button
                    onClick={openKiosk}
                    disabled={user?.role !== 'super_admin'}
                    className={`flex items-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold text-sm shadow-lg transform transition-all duration-200 hover:scale-105 ${
                      user?.role !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={user?.role !== 'super_admin' ? 'Only Super Admin can open kiosk' : 'Open Kiosk'}
                  >
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Open
                  </button>
                )}
                {kioskStatus !== 'standby' && (
                  <button
                    onClick={standbyKiosk}
                    disabled={user?.role !== 'super_admin'}
                    className={`flex items-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-semibold text-sm shadow-lg transform transition-all duration-200 hover:scale-105 ${
                      user?.role !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={user?.role !== 'super_admin' ? 'Only Super Admin can set kiosk to standby' : 'Set Kiosk to Standby'}
                  >
                    <ClockIcon className="w-4 h-4 mr-2" />
                    Standby
                  </button>
                )}
                {kioskStatus !== 'closed' && (
                  <button
                    onClick={closeKiosk}
                    disabled={user?.role !== 'super_admin'}
                    className={`flex items-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-sm shadow-lg transform transition-all duration-200 hover:scale-105 ${
                      user?.role !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={user?.role !== 'super_admin' ? 'Only Super Admin can close kiosk' : 'Close Kiosk'}
                  >
                    <StopIcon className="w-4 h-4 mr-2" />
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Queues Today</p>
              <p className="text-3xl font-bold">{stats.totalQueues}</p>
            </div>
            <QueueListIcon className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Waiting</p>
              <p className="text-3xl font-bold">{stats.waitingQueues}</p>
            </div>
            <TicketIcon className="w-12 h-12 text-yellow-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Currently Serving</p>
              <p className="text-3xl font-bold">{stats.servingQueues}</p>
            </div>
            <EyeIcon className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Completed Today</p>
              <p className="text-3xl font-bold">{stats.completedQueues}</p>
            </div>
            <UserGroupIcon className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100">Window Users</p>
              <p className="text-3xl font-bold">{stats.activeUsers}</p>
            </div>
            <UsersIcon className="w-12 h-12 text-indigo-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-pink-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100">Services</p>
              <p className="text-3xl font-bold">5</p>
            </div>
            <WrenchScrewdriverIcon className="w-12 h-12 text-pink-200" />
          </div>
        </div>
      </div>

      {/* Transaction History - For Admin and Super Admin */}
      {(user?.role === 'super_admin' || user?.role === 'admin') && (
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ClockIcon className="w-4 h-4 mr-2" />
              View All Transactions
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queue Numbers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactionHistory.slice(0, 5).map((transaction) => (
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
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {transaction.queueNumbers.slice(0, 3).join(', ')}
                        {transaction.queueNumbers.length > 3 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <MagnifyingGlassIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportTransaction(transaction)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTransaction(transaction._id)}
                          className="text-red-600 hover:text-red-900"
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
              <div className="text-center py-8 text-gray-500">
                No transaction history available
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => exportTransaction(selectedTransaction)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
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
      
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="ml-4 text-sm text-gray-500">
                Welcome, {user?.username}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/display')}
                className="btn-secondary flex items-center"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                View Display
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="flex space-x-1">
            {filteredTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

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
