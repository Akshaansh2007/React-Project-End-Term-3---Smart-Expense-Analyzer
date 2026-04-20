import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, transaction }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 fade-in">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <FiAlertTriangle className="text-red-500 mr-2" size={24} />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Confirm Delete
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this transaction?
          <br />
          <span className="text-sm text-red-500">This action cannot be undone.</span>
        </p>
        
        {transaction && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Category:</strong> {transaction.category}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Amount:</strong> {transaction.amount}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Date:</strong> {transaction.date}
            </p>
          </div>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;