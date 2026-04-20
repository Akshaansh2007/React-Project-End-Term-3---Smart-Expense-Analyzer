import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import BudgetDeleteConfirmModal from '../components/BudgetDeleteConfirmModal';
import { FiPlus, FiEdit2, FiTrash2, FiBell } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

const Budgets = () => {
  const { user, userData } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [newBudget, setNewBudget] = useState({
    category: '',
    amount: '',
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  const categories = ['Food', 'Travel', 'Shopping', 'Rent', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch budgets
      const budgetsQuery = query(
        collection(db, 'budgets'),
        where('userId', '==', user.uid)
      );
      const budgetsSnapshot = await getDocs(budgetsQuery);
      const budgetsData = [];
      budgetsSnapshot.forEach(doc => {
        budgetsData.push({ id: doc.id, ...doc.data() });
      });
      setBudgets(budgetsData);

      // Fetch current month transactions
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());
      
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = [];
      transactionsSnapshot.forEach(doc => {
        const transaction = { id: doc.id, ...doc.data() };
        const transactionDate = new Date(transaction.date);
        if (transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd) {
          transactionsData.push(transaction);
        }
      });
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error fetching budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!newBudget.category || !newBudget.amount) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const budgetData = {
        ...newBudget,
        amount: parseFloat(newBudget.amount),
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      if (editingBudget) {
        await updateDoc(doc(db, 'budgets', editingBudget.id), budgetData);
        toast.success('Budget updated successfully');
      } else {
        await addDoc(collection(db, 'budgets'), budgetData);
        toast.success('Budget created successfully');
      }

      setShowBudgetForm(false);
      setEditingBudget(null);
      setNewBudget({ category: '', amount: '', month: new Date().getMonth(), year: new Date().getFullYear() });
      fetchData();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Error saving budget');
    }
  };

  // Open delete confirmation modal
  const handleDeleteClick = (budget) => {
    setBudgetToDelete(budget);
    setShowDeleteModal(true);
  };

  // Actual delete function
  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'budgets', budgetToDelete.id));
      toast.success('Budget deleted successfully');
      setShowDeleteModal(false);
      setBudgetToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Error deleting budget');
    }
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setNewBudget({
      category: budget.category,
      amount: budget.amount,
      month: budget.month,
      year: budget.year
    });
    setShowBudgetForm(true);
  };

  // Calculate spending by category for current month
  const categorySpending = useMemo(() => {
    const spending = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      }
    });
    return spending;
  }, [transactions]);

  // Get budget status with alerts
  const budgetStatus = useMemo(() => {
    return budgets.map(budget => {
      const spent = categorySpending[budget.category] || 0;
      const percentage = (spent / budget.amount) * 100;
      let status = 'good';
      let message = '';
      
      if (percentage >= 100) {
        status = 'exceeded';
        message = `⚠️ Alert: You've exceeded your ${budget.category} budget!`;
        // Show toast notification for exceeded budget
        if (percentage === 100 || percentage > 100) {
          toast.error(message);
        }
      } else if (percentage >= 70) {
        status = 'warning';
        message = `⚠️ Warning: You've used ${percentage.toFixed(1)}% of your ${budget.category} budget`;
        // Show toast notification for 70% usage
        if (percentage >= 70 && percentage < 71) {
          toast(message, { icon: '⚠️' });
        }
      }
      
      return {
        ...budget,
        spent,
        percentage,
        status,
        message,
        remaining: budget.amount - spent
      };
    });
  }, [budgets, categorySpending]);

  const totalBudget = budgetStatus.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetStatus.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 sm:pb-8">
          <LoadingSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 sm:pb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Budget Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Set and track your monthly spending limits
            </p>
          </div>
          <button
            onClick={() => {
              setEditingBudget(null);
              setNewBudget({ category: '', amount: '', month: new Date().getMonth(), year: new Date().getFullYear() });
              setShowBudgetForm(true);
            }}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition-opacity duration-200"
          >
            <FiPlus className="mr-2" />
            Set Budget
          </button>
        </div>

        {/* Overall Budget Summary */}
        {budgetStatus.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Overall Budget Summary - {format(new Date(), 'MMMM yyyy')}
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Total Budget: {userData?.currency || '₹'} {totalBudget.toLocaleString()}</span>
                <span>Total Spent: {userData?.currency || '₹'} {totalSpent.toLocaleString()}</span>
                <span>Remaining: {userData?.currency || '₹'} {(totalBudget - totalSpent).toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    overallPercentage >= 100 ? 'bg-red-600' : overallPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgetStatus.map(budget => (
            <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                      {budget.category}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Monthly Budget
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditBudget(budget)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 transition-colors"
                      title="Edit budget"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(budget)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 transition-colors"
                      title="Delete budget"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Spent: {userData?.currency || '₹'} {budget.spent.toLocaleString()}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      of {userData?.currency || '₹'} {budget.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        budget.status === 'exceeded' ? 'bg-red-600' : 
                        budget.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {budget.percentage.toFixed(1)}% used
                    </span>
                    <span className={`text-xs font-medium ${
                      budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {budget.remaining >= 0 ? 'Remaining' : 'Overspent'}: {userData?.currency || '₹'} {Math.abs(budget.remaining).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {budget.message && (
                  <div className={`p-3 rounded-lg ${
                    budget.status === 'exceeded' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
                    'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                  }`}>
                    <div className="flex items-center">
                      <FiBell className="mr-2" />
                      <span className="text-sm">{budget.message}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {budgetStatus.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No budgets set yet
            </p>
            <button
              onClick={() => setShowBudgetForm(true)}
              className="text-primary hover:underline"
            >
              Create your first budget
            </button>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-400 mb-3">
            💡 Budgeting Tips
          </h3>
          <ul className="space-y-2 text-blue-700 dark:text-blue-300">
            <li>• Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings</li>
            <li>• Review your budgets monthly and adjust based on your spending patterns</li>
            <li>• Set realistic budgets based on your past spending history</li>
            <li>• Try to keep your category spending below 70% to avoid reaching limits early</li>
          </ul>
        </div>
      </div>

      {/* Budget Form Modal */}
      {showBudgetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {editingBudget ? 'Edit Budget' : 'Set New Budget'}
              </h2>
              <button
                onClick={() => {
                  setShowBudgetForm(false);
                  setEditingBudget(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Budget Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {userData?.currency || '₹'}
                  </span>
                  <input
                    type="number"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    placeholder="Enter amount"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowBudgetForm(false);
                    setEditingBudget(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBudget}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90"
                >
                  {editingBudget ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <BudgetDeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setBudgetToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        budget={budgetToDelete}
      />
    </>
  );
};

export default Budgets;