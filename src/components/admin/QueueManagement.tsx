import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../../config/app-config';
import { getApiUrl } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../ConfirmationModal';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PersonType {
  _id: string;
  name: string;
  description: string;
  priority: 'Low' | 'High';
  color: string;
  isActive: boolean;
}

const QueueManagement: React.FC = () => {
  const [personTypes, setPersonTypes] = useState<PersonType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<PersonType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'Low' as 'Low' | 'High',
    color: '#3B82F6'
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchPersonTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching person types with token:', token);
      
      const response = await fetch(getApiUrl('/api/admin/person-types'), {
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
      console.log('Person types data received:', data);
      setPersonTypes(data);
    } catch (error) {
      console.error('Error fetching person types:', error);
      showError('Fetch Failed', 'Error fetching person types. Please check console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchPersonTypes();
  }, [fetchPersonTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingType 
        ? getApiUrl(`/api/admin/person-type/${editingType._id}`)
        : getApiUrl('/api/admin/person-type');
      
      const method = editingType ? 'PUT' : 'POST';
      const body = { ...formData, isActive: true };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchPersonTypes();
        setIsModalOpen(false);
        setEditingType(null);
        setFormData({
          name: '',
          description: '',
          priority: 'Low' as 'Low' | 'High',
          color: '#3B82F6'
        });
        const action = editingType ? 'updated' : 'created';
        showSuccess('Person Type Saved', `Person type has been ${action} successfully.`);
      }
    } catch (error) {
      console.error('Error saving person type:', error);
      showError('Save Failed', 'Error saving person type. Please try again.');
    }
  };

  const handleEdit = (type: PersonType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description,
      priority: type.priority,
      color: type.color
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (typeId: string) => {
    setSelectedTypeId(typeId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!selectedTypeId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(CONFIG.buildUrl(`/admin/person-type/${selectedTypeId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchPersonTypes();
        showSuccess('Person Type Deleted', 'Person type has been deleted successfully.');
      } else {
        const errorData = await response.json();
        showError('Deletion Failed', errorData.message || 'Failed to delete person type.');
      }
    } catch (error) {
      console.error('Error deleting person type:', error);
      showError('Deletion Failed', 'Error deleting person type. Please try again.');
    }
  };

  const openModal = () => {
    setEditingType(null);
    setFormData({
      name: '',
      description: '',
      priority: 'Low' as 'Low' | 'High',
      color: '#3B82F6'
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Person Type Management</h3>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Create and manage person types with High and Low priority levels and color coding</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium touch-manipulation active-scale"
        >
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="hidden xs:inline">Add Person Type</span>
          <span className="xs:hidden">Add</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Loading person types...</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="sm:hidden px-4 py-4 space-y-4">
              {personTypes.map((type) => (
                <div key={type._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-3">
                    {/* Type Info */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 mb-1">{type.name}</div>
                        <div className="text-xs text-gray-600 mb-2">{type.description}</div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            type.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {type.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            type.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {type.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300 mr-2"
                            style={{ backgroundColor: type.color }}
                          />
                          <span className="text-xs text-gray-600">{type.color}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(type)}
                        className="flex-1 flex items-center justify-center px-2 py-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                        title="Edit Person Type"
                      >
                        <PencilIcon className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(type._id)}
                        className="flex-1 flex items-center justify-center px-2 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200 text-xs font-medium touch-manipulation"
                        title="Delete Person Type"
                      >
                        <TrashIcon className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {personTypes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm font-medium">No person types found</p>
                </div>
              )}
            </div>
            
            {/* Desktop/Tablet: Table Layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Color</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {personTypes.map((type) => (
                    <tr key={type._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{type.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{type.description}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          type.priority === 'High' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {type.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-gray-300 mr-2"
                            style={{ backgroundColor: type.color }}
                          />
                          <span className="text-sm text-gray-600">{type.color}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          type.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {type.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(type)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(type._id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {personTypes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm font-medium">No person types found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h4 className="text-xl font-bold text-gray-800 mb-4">
              {editingType ? 'Edit Person Type' : 'Add New Person Type'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as 'Low' | 'High'})}
                    className="input-field"
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="input-field h-10"
                    required
                  />
                </div>
              </div>

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
                  {editingType ? 'Update' : 'Create'}
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
        title="Delete Person Type"
        message="Are you sure you want to delete this person type? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default QueueManagement;
