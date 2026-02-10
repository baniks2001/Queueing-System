import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../config/app-config';
import { getApiUrl } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';
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
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">Person Type Management</h3>
        <button
          onClick={openModal}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Person Type
        </button>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2">Loading person types...</p>
          </div>
        ) : (
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
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(type._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
