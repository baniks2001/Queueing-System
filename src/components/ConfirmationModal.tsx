import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />,
          iconBg: 'bg-red-100',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmText: 'text-white'
        };
      case 'warning':
        return {
          icon: <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" />,
          iconBg: 'bg-yellow-100',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          confirmText: 'text-white'
        };
      case 'info':
        return {
          icon: <CheckCircleIcon className="w-12 h-12 text-blue-500" />,
          iconBg: 'bg-blue-100',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          confirmText: 'text-white'
        };
      default:
        return {
          icon: <ExclamationTriangleIcon className="w-12 h-12 text-gray-500" />,
          iconBg: 'bg-gray-100',
          confirmBg: 'bg-gray-600 hover:bg-gray-700',
          confirmText: 'text-white'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto safe-area">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all tv-card high-contrast respect-motion">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg touch-manipulation active-scale"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-20 h-20 ${styles.iconBg} rounded-full flex items-center justify-center`}>
                {styles.icon}
              </div>
              <div className="flex-1">
                <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium touch-manipulation active-scale"
              aria-label="Cancel confirmation"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-6 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg ${styles.confirmBg} ${styles.confirmText} touch-manipulation active-scale tv-button`}
              aria-label="Confirm action"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
