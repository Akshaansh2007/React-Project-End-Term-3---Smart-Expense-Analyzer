import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const categories = {
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
  expense: ['Food', 'Travel', 'Shopping', 'Rent', 'Bills', 'Entertainment', 'Health', 'Education', 'Other']
};

const TransactionForm = ({ transaction, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        note: transaction.note || ''
      });
    } else {
      // Reset form for new transaction
      setFormData({
        amount: '',
        type: 'expense',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
    }
  }, [transaction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle type change (Income/Expense toggle)
    if (name === 'type') {
      // Set default category based on selected type
      const defaultCategory = value === 'income' ? 'Salary' : 'Food';
      setFormData(prev => ({ 
        ...prev, 
        type: value,
        category: defaultCategory  // This ensures the actual data updates
      }));
    } 
    // Handle category change
    else if (name === 'category') {
      setFormData(prev => ({ ...prev, category: value }));
    }
    // Handle other fields (amount, date, note)
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Auto-categorization based on note (only for expenses)
    if (name === 'note' && formData.type === 'expense') {
      const lowerNote = value.toLowerCase();
      
      const categoryKeywords = {
        Food: ['zomato', 'swiggy', 'restaurant', 'food', 'pizza', 'burger', 'meal', 'dinner', 'lunch', 'breakfast', 'cafe'],
        Travel: ['uber', 'ola', 'taxi', 'bus', 'train', 'flight', 'fuel', 'petrol', 'diesel', 'metro', 'cab'],
        Shopping: ['amazon', 'flipkart', 'mall', 'shopping', 'clothes', 'apparel', 'zara', 'nike', 'adidas'],
        Entertainment: ['netflix', 'prime', 'movie', 'cinema', 'spotify', 'youtube', 'disney', 'hotstar', 'game'],
        Health: ['hospital', 'doctor', 'medicine', 'clinic', 'gym', 'fitness', 'pharmacy', 'medical']
      };
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerNote.includes(keyword))) {
          setFormData(prev => ({ ...prev, category: category }));
          toast.success(`Auto-categorized as ${category}`);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    
    try {
      const transactionData = {
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category,
        date: formData.date,
        note: formData.note || '',
        userId: user.uid,
        createdAt: new Date().toISOString()
      };
      
      console.log('Saving transaction:', transactionData); // Debug log
      
      if (transaction) {
        // Update existing transaction
        await updateDoc(doc(db, 'transactions', transaction.id), transactionData);
        toast.success('Transaction updated successfully');
      } else {
        // Add new transaction
        await addDoc(collection(db, 'transactions'), transactionData);
        toast.success('Transaction added successfully');
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Error saving transaction: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              placeholder="Enter amount"
              required
              step="0.01"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={formData.type === 'income'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Income</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={formData.type === 'expense'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Expense</span>
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              {(formData.type === 'income' ? categories.income : categories.expense).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Note (Optional)</label>
            <input
              type="text"
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Zomato order, Uber ride, etc."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              💡 Tip: Add keywords like "Zomato", "Uber", "Netflix" for auto-categorization
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50"
            >
              {loading ? 'Saving...' : transaction ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;