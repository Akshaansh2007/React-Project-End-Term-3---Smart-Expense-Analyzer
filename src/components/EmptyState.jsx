import React from 'react';
import { FiDollarSign } from 'react-icons/fi';

const EmptyState = ({ message, actionText, onAction }) => {
  return (
    <div className="text-center py-12">
      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiDollarSign className="text-gray-400 text-4xl" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {message || "No data available"}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="text-primary hover:underline"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;