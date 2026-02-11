import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/api';
import { useToast } from '../../contexts/ToastContext';
import ConfirmationModal from '../ConfirmationModal';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface WindowUser {
  _id: string;
  username: string;
  windowNumber: number;
  service: string;
  isActive: boolean;
}

interface TransactionStep {
  id: string;
  stepNumber: number;
  stepName: string;
  windowNumber: number;
  description: string;
}

interface TransactionFlow {
  _id: string;
  name: string;
  description: string;
  prefix: string;
  steps: TransactionStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ServiceManagement: React.FC = () => {
  const [transactionFlows, setTransactionFlows] = useState<TransactionFlow[]>([]);
  const [windowUsers, setWindowUsers] = useState<WindowUser[]>([]);
  const [editingFlow, setEditingFlow] = useState<TransactionFlow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prefix: '',
    steps: [
      {
        id: '1',
        stepNumber: 1,
        stepName: 'Get Queue Number',
        windowNumber: 0,
        description: 'Initial queue number assignment'
      }
    ]
  });

  useEffect(() => {
    fetchTransactionFlows();
    fetchWindowUsers();
  }, []);

  const fetchWindowUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/users/window-users'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWindowUsers(data.filter((user: WindowUser) => user.isActive));
      }
    } catch (error) {
      console.error('Error fetching window users:', error);
    }
  };

  const fetchTransactionFlows = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/api/admin/transaction-flows'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactionFlows(data);
      }
    } catch (error) {
      console.error('Error fetching transaction flows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingFlow 
        ? getApiUrl(`/api/admin/transaction-flow/${editingFlow._id}`)
        : getApiUrl('/api/admin/transaction-flow');
      
      const method = editingFlow ? 'PUT' : 'POST';
      const body = { 
        ...formData, 
        isActive: true,
        steps: formData.steps.map(step => ({
          ...step,
          id: step.id || `${Date.now()}-${Math.random()}`
        }))
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        await fetchTransactionFlows();
        setIsModalOpen(false);
        setEditingFlow(null);
        resetForm();
        const action = editingFlow ? 'updated' : 'created';
        showSuccess('Transaction Flow Saved', `Transaction flow has been ${action} successfully.`);
      } else {
        const error = await response.json();
        showError('Save Failed', error.message || 'Failed to save transaction flow');
      }
    } catch (error) {
      console.error('Error saving transaction flow:', error);
      showError('Save Failed', 'Error saving transaction flow. Please try again.');
    }
  };

  const handleEdit = (flow: TransactionFlow) => {
    setEditingFlow(flow);
    setFormData({
      name: flow.name,
      description: flow.description,
      prefix: flow.prefix,
      steps: flow.steps
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (flowId: string) => {
    setSelectedFlowId(flowId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!selectedFlowId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(`/api/admin/transaction-flow/${selectedFlowId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchTransactionFlows();
        showSuccess('Transaction Flow Deleted', 'Transaction flow has been deleted successfully.');
      } else {
        const error = await response.json();
        showError('Deletion Failed', error.message || 'Failed to delete transaction flow');
      }
    } catch (error) {
      console.error('Error deleting transaction flow:', error);
      showError('Deletion Failed', 'Error deleting transaction flow. Please try again.');
    }
  };

  const addStep = () => {
    const newStepNumber = formData.steps.length + 1;
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          id: `${Date.now()}-${Math.random()}`,
          stepNumber: newStepNumber,
          stepName: `Step ${newStepNumber}`,
          windowNumber: 0,
          description: ''
        }
      ]
    });
  };

  const removeStep = (stepId: string) => {
    if (formData.steps.length <= 1) return;
    
    const updatedSteps = formData.steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({
        ...step,
        stepNumber: index + 1
      }));
    
    setFormData({
      ...formData,
      steps: updatedSteps
    });
  };

  const updateStep = (stepId: string, field: keyof TransactionStep, value: TransactionStep[keyof TransactionStep]) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(step =>
        step.id === stepId ? { ...step, [field]: value } : step
      )
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      prefix: '',
      steps: [
        {
          id: '1',
          stepNumber: 1,
          stepName: 'Get Queue Number',
          windowNumber: 0,
          description: 'Initial queue number assignment'
        }
      ]
    });
  };

  const openModal = () => {
    setEditingFlow(null);
    resetForm();
    setIsModalOpen(true);
  };

  const getWindowName = (windowNumber: number) => {
    const window = windowUsers.find(w => w.windowNumber === windowNumber);
    return window ? `Window ${windowNumber} - ${window.username}` : `Window ${windowNumber}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Transaction Flow Management</h3>
          <p className="text-gray-600 mt-1">Create and manage transaction flows for different services</p>
        </div>
        <button
          onClick={openModal}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Transaction Flow
        </button>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2">Loading transaction flows...</p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Transaction Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Prefix</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Steps</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactionFlows.map((flow) => (
                <tr key={flow._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{flow.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {flow.prefix}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{flow.description}</td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {flow.steps.map((step) => (
                        <div key={step.id} className="text-xs text-gray-600">
                          {step.stepNumber}. {step.stepName} - {getWindowName(step.windowNumber)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      flow.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {flow.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(flow)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Transaction Flow"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(flow._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Transaction Flow"
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
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
            <h4 className="text-xl font-bold text-gray-800 mb-4">
              {editingFlow ? 'Edit Transaction Flow' : 'Create New Transaction Flow'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Renewing Driving License"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) => setFormData({...formData, prefix: e.target.value.toUpperCase()})}
                    className="input-field"
                    placeholder="e.g., RDL"
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Describe the transaction flow..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium text-gray-700">Transaction Steps</label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="btn-secondary text-sm flex items-center"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Step
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.steps.map((step) => (
                    <div key={step.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-800">Step {step.stepNumber}</h5>
                        {formData.steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(step.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Step Name</label>
                          <input
                            type="text"
                            value={step.stepName}
                            onChange={(e) => updateStep(step.id, 'stepName', e.target.value)}
                            className="input-field text-sm"
                            placeholder="e.g., Pass Documents"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Window</label>
                          <select
                            value={step.windowNumber}
                            onChange={(e) => updateStep(step.id, 'windowNumber', parseInt(e.target.value))}
                            className="input-field text-sm"
                            required
                          >
                            <option value={0}>Select Window</option>
                            {windowUsers.map((window) => (
                              <option key={window._id} value={window.windowNumber}>
                                Window {window.windowNumber} - {window.username}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={step.description}
                            onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                            className="input-field text-sm"
                            placeholder="Step description..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                  {editingFlow ? 'Update' : 'Create'} Transaction Flow
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
        title="Delete Transaction Flow"
        message="Are you sure you want to delete this transaction flow? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ServiceManagement;
