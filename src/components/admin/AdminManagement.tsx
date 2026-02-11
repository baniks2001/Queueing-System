import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../ConfirmationModal';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  KeyIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

interface Admin {
  _id: string;
  username: string;
  role: 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: string;
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin'
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/users/admins'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      } else {
        console.error('Failed to fetch admins:', response.status);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/users/admins'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({ username: '', password: '', role: 'admin' });
        setIsModalOpen(false);
        fetchAdmins();
        showSuccess('Admin Created', 'New admin account has been created successfully.');
      } else {
        console.error('Failed to create admin:', response.status);
        const errorData = await response.json();
        showError('Creation Failed', errorData.message || 'Failed to create admin account.');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      showError('Creation Failed', 'An error occurred while creating the admin account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      password: '',
      role: admin.role as 'admin' | 'super_admin'
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/users/admins/${editingAdmin._id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({ username: '', password: '', role: 'admin' });
        setIsModalOpen(false);
        setEditingAdmin(null);
        fetchAdmins();
        showSuccess('Admin Updated', 'Admin account has been updated successfully.');
      } else {
        console.error('Failed to update admin:', response.status);
        const errorData = await response.json();
        showError('Update Failed', errorData.message || 'Failed to update admin account.');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      showError('Update Failed', 'An error occurred while updating the admin account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    setSelectedAdminId(adminId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!selectedAdminId) return;

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/users/admins/${selectedAdminId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchAdmins();
        showSuccess('Admin Deleted', 'Admin account has been deleted successfully.');
      } else {
        console.error('Failed to delete admin:', response.status);
        const errorData = await response.json();
        showError('Deletion Failed', errorData.message || 'Failed to delete admin account.');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      showError('Deletion Failed', 'An error occurred while deleting the admin account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/users/admin/${adminId}/toggle-status`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: currentStatus })
      });

      if (response.ok) {
        fetchAdmins();
        const action = currentStatus ? 'deactivated' : 'activated';
        showSuccess('Status Updated', `Admin account has been ${action} successfully.`);
      } else {
        console.error('Failed to toggle admin status:', response.status);
        const errorData = await response.json();
        showError('Status Update Failed', errorData.message || 'Failed to update admin status.');
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      showError('Status Update Failed', 'An error occurred while updating admin status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Create and manage administrator accounts with different roles and permissions</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        >
          <UserPlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Add Admin
        </button>
      </div>

        {isInitialLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {isLoading && !isInitialLoading && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white"></div>
              </div>
            )}

            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              {/* Mobile: Card Layout */}
              <div className="sm:hidden px-4 py-4 space-y-4">
                {admins.map((admin) => (
                  <div key={admin._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-3">
                      {/* Admin Info */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-1">{admin.username}</div>
                          <div className="flex flex-wrap gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              admin.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Created Date */}
                      <div className="text-xs text-gray-500">
                        Created: {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(admin)}
                          className="flex-1 flex items-center justify-center px-2 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                          title="Edit Admin"
                        >
                          <PencilIcon className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(admin._id, !admin.isActive)}
                          className={`flex-1 flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation ${
                            admin.isActive 
                              ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' 
                              : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                          }`}
                          title={admin.isActive ? "Deactivate Admin" : "Activate Admin"}
                        >
                          {admin.isActive ? <NoSymbolIcon className="w-3 h-3 mr-1" /> : <ShieldCheckIcon className="w-3 h-3 mr-1" />}
                          {admin.isActive ? 'Deact' : 'Act'}
                        </button>
                        <button
                          onClick={() => handleDelete(admin._id)}
                          className="flex-1 flex items-center justify-center px-2 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                          title="Delete Admin"
                        >
                          <TrashIcon className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {admins.length === 0 && !isInitialLoading && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm font-medium">No admin accounts found. Create your first admin to get started.</p>
                  </div>
                )}
              </div>
              
              {/* Desktop/Tablet: Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="hidden sm:table-cell px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <tr key={admin._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="sm:hidden">
                            <div className="font-medium">{admin.username}</div>
                          </div>
                          <span className="hidden sm:inline">{admin.username}</span>
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            admin.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-3 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-4 lg:px-6 py-2 sm:py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-1 sm:space-x-2">
                            <button
                              onClick={() => handleEdit(admin)}
                              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                            >
                              <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(admin._id, !admin.isActive)}
                              className={`${
                                admin.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                              } p-1 hover:bg-yellow-50 rounded transition-colors`}
                            >
                              {admin.isActive ? (
                                <NoSymbolIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              ) : (
                                <ShieldCheckIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(admin._id)}
                              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                            >
                              <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {admins.length === 0 && !isInitialLoading && (
                  <div className="text-center py-8 text-gray-500">
                    No admin accounts found. Create your first admin to get started.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAdmin(null);
                    setFormData({ username: '', password: '', role: 'admin' });
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={editingAdmin ? handleUpdate : handleCreate} className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>


                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'super_admin'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingAdmin(null);
                      setFormData({ username: '', password: '', role: 'admin' });
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {isLoading ? 'Creating...' : (editingAdmin ? 'Update Admin' : 'Create Admin')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Admin Account"
        message="Are you sure you want to delete this admin account? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AdminManagement;
