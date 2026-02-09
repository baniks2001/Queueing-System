import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
      } else {
        console.error('Failed to create admin:', response.status);
      }
    } catch (error) {
      console.error('Error creating admin:', error);
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
      } else {
        console.error('Failed to update admin:', response.status);
      }
    } catch (error) {
      console.error('Error updating admin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin account?')) {
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/users/admins/${adminId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchAdmins();
      } else {
        console.error('Failed to delete admin:', response.status);
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
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
      } else {
        console.error('Failed to toggle admin status:', response.status);
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Management</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
              <div className="overflow-x-auto">
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
                              className="text-blue-600 hover:text-blue-900 p-1"
                            >
                              <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(admin._id, !admin.isActive)}
                              className={`${
                                admin.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                              } p-1`}
                            >
                              {admin.isActive ? (
                                <NoSymbolIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              ) : (
                                <ShieldCheckIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(admin._id)}
                              className="text-red-600 hover:text-red-900 p-1"
                            >
                              <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {admins.length === 0 && !isInitialLoading && (
                <div className="text-center py-8 text-gray-500">
                  No admin accounts found. Create your first admin to get started.
                </div>
              )}
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

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingAdmin(null);
                      setFormData({ username: '', password: '', role: 'admin' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <KeyIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        {editingAdmin ? 'Update' : 'Create'}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManagement;
