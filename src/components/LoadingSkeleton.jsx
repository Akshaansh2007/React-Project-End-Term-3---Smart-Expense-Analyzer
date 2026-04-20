import React from 'react';

const LoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="skeleton h-4 w-24 mb-2"></div>
            <div className="skeleton h-8 w-32"></div>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="skeleton h-64 w-full"></div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;