import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../ConfirmationModal';
import { PencilIcon, TrashIcon, PlusIcon, KeyIcon, CheckIcon, NoSymbolIcon } from '@heroicons/react/24/outline';

interface User {
  _id: string;
  username: string;
  role: 'window';
  windowNumber?: number;
  service?: string;
  isActive: boolean;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'window' as 'window',
    windowNumber: 1,
    service: 'Cashier'
  });
  const [newPassword, setNewPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const services = ['Cashier', 'Information', 'Documentation', 'Technical Support', 'Customer Service'];

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching users with token:', token);
      
      const response = await fetch(getApiUrl('/api/users/all-users'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Users data received:', data);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Fetch Failed', 'Error fetching users. Please check console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      // Choose endpoint based on user role
      const endpoint = '/api/users/window-user';
      
      const url = editingUser 
        ? getApiUrl(`/api/users/window-user/${editingUser._id}`)
        : getApiUrl(endpoint);
      
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { ...formData, isActive: true }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchUsers();
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({
          username: '',
          password: '',
          role: 'window',
          windowNumber: 1,
          service: 'Cashier'
        });
        const action = editingUser ? 'updated' : 'created';
        showSuccess('User Saved', `User account has been ${action} successfully.`);
      } else {
        const error = await response.json();
        showError('Save Failed', error.message || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showError('Save Failed', 'Error saving user. Please try again.');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      windowNumber: user.windowNumber || 1,
      service: user.service || 'Cashier'
    });
    setIsModalOpen(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/users/update-password/${passwordUser._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        setIsPasswordModalOpen(false);
        setPasswordUser(null);
        setNewPassword('');
        showSuccess('Password Updated', 'Password has been updated successfully.');
      } else {
        const error = await response.json();
        showError('Update Failed', error.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      showError('Update Failed', 'Error updating password. Please try again.');
    }
  };

  const handleUpdateStatus = async (user: User, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/users/update-status/${user._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        await fetchUsers();
        const action = isActive ? 'activated' : 'deactivated';
        showSuccess('Status Updated', `User account has been ${action} successfully.`);
      } else {
        const error = await response.json();
        showError('Status Update Failed', error.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      showError('Status Update Failed', 'Error updating user status. Please try again.');
    }
  };

  const openPasswordModal = (user: User) => {
    setPasswordUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    setSelectedUserId(userId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!selectedUserId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/users/window-user/${selectedUserId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchUsers();
        showSuccess('User Deleted', 'User account has been deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Deletion Failed', 'Error deleting user. Please try again.');
    }
  };

  const openModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'window',
      windowNumber: 1,
      service: 'Cashier'
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h3>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Create and manage window user accounts with assigned services and permissions</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium touch-manipulation active-scale"
        >
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="hidden xs:inline">Add User</span>
          <span className="xs:hidden">Add</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Loading users...</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="sm:hidden px-4 py-4 space-y-4">
              {users.map((user) => (
                <div key={user._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-3">
                    {/* User Info */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">{user.username}</div>
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Window
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {user.windowNumber ? `W${user.windowNumber}` : 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {user.service || 'General'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(user)}
                        className="flex-1 flex items-center justify-center px-2 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                        title="Edit User"
                      >
                        <PencilIcon className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => openPasswordModal(user)}
                        className="flex-1 flex items-center justify-center px-2 py-2 text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                        title="Update Password"
                      >
                        <KeyIcon className="w-3 h-3 mr-1" />
                        Password
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(user, !user.isActive)}
                        className={`flex-1 flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation ${
                          user.isActive 
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                        title={user.isActive ? "Deactivate User" : "Activate User"}
                      >
                        {user.isActive ? <NoSymbolIcon className="w-3 h-3 mr-1" /> : <CheckIcon className="w-3 h-3 mr-1" />}
                        {user.isActive ? 'Deact' : 'Act'}
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="flex-1 flex items-center justify-center px-2 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                        title="Delete User"
                      >
                        <TrashIcon className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm font-medium">No users found</p>
                </div>
              )}
            </div>
            
            {/* Desktop/Tablet: Table Layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Username</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Window Number</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Service</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Window
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Window {user.windowNumber || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {user.service || 'General Service'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="Edit User"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="text-yellow-600 hover:text-yellow-800 p-1 hover:bg-yellow-50 rounded transition-colors"
                            title="Update Password"
                          >
                            <KeyIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(user, !user.isActive)}
                            className={user.isActive ? "text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors" : "text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"}
                            title={user.isActive ? "Deactivate User" : "Activate User"}
                          >
                            {user.isActive ? <NoSymbolIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Delete User"
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
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as 'window'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="window">Window User</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingUser}
                  />
                </div>
              )}

              {formData.role === 'window' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Window Number</label>
                    <input
                      type="number"
                      value={formData.windowNumber}
                      onChange={(e) => setFormData({...formData, windowNumber: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                    <select
                      value={formData.service}
                      onChange={(e) => setFormData({...formData, service: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {services.map((service) => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium touch-manipulation"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Update Modal */}
      {isPasswordModalOpen && passwordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
              Update Password for {passwordUser.username}
            </h4>
            
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordUser(null);
                    setNewPassword('');
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium touch-manipulation"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete User Account"
        message="Are you sure you want to delete this user account? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default UserManagement;
