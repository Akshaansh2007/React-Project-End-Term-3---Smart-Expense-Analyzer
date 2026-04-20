import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, getYear } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec489a'];

const Analytics = () => {
  const { user, userData } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const transactionsData = [];
      querySnapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(transactionsData);
      
      // Extract available years from transactions
      const years = [...new Set(transactionsData.map(t => getYear(new Date(t.date))))];
      if (years.length > 0) {
        years.sort((a, b) => b - a); // Sort descending (newest first)
        setAvailableYears(years);
        // Set selected year to most recent year if current year has no data
        if (!years.includes(selectedYear) && years.length > 0) {
          setSelectedYear(years[0]);
        }
      } else {
        // If no transactions, show current year
        setAvailableYears([new Date().getFullYear()]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Error fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  // Get selected year's transactions
  const yearTransactions = useMemo(() => {
    return transactions.filter(t => getYear(new Date(t.date)) === selectedYear);
  }, [transactions, selectedYear]);

  // Spending by category (expenses only)
  const categoryData = useMemo(() => {
    const expenses = yearTransactions.filter(t => t.type === 'expense');
    const categoryMap = {};
    expenses.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [yearTransactions]);

  // Monthly data for the year
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31)
    });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTransactions = yearTransactions.filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      return {
        month: format(month, 'MMM'),
        income,
        expenses,
        savings: income - expenses
      };
    });
  }, [yearTransactions, selectedYear]);

  // Daily spending pattern
  const dailyPattern = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const spendingByDay = {};
    days.forEach(day => spendingByDay[day] = 0);
    
    yearTransactions.filter(t => t.type === 'expense').forEach(t => {
      const day = format(new Date(t.date), 'EEEE');
      spendingByDay[day] += t.amount;
    });
    
    return days.map(day => ({ day, amount: spendingByDay[day] }));
  }, [yearTransactions]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...yearTransactions]
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [yearTransactions]);

  // Monthly comparison (current month vs last month)
  const monthlyComparison = useMemo(() => {
    const currentMonth = new Date();
    const currentMonthStart = startOfMonth(currentMonth);
    const lastMonthStart = startOfMonth(subMonths(currentMonth, 1));
    const lastMonthEnd = endOfMonth(subMonths(currentMonth, 1));
    
    const currentExpenses = yearTransactions.filter(t => 
      t.type === 'expense' && new Date(t.date) >= currentMonthStart && getYear(new Date(t.date)) === selectedYear
    ).reduce((sum, t) => sum + t.amount, 0);
    
    const lastMonthExpenses = transactions.filter(t => 
      t.type === 'expense' && 
      new Date(t.date) >= lastMonthStart && 
      new Date(t.date) <= lastMonthEnd
    ).reduce((sum, t) => sum + t.amount, 0);
    
    const percentageChange = lastMonthExpenses ? ((currentExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1) : 0;
    
    return {
      current: currentExpenses,
      last: lastMonthExpenses,
      percentage: percentageChange,
      isHigher: percentageChange > 0
    };
  }, [yearTransactions, transactions, selectedYear]);

  // Anomaly detection
  const anomalies = useMemo(() => {
    const expenses = yearTransactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return [];
    
    const average = expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length;
    const stdDev = Math.sqrt(expenses.reduce((sum, t) => sum + Math.pow(t.amount - average, 2), 0) / expenses.length);
    const threshold = average + (2 * stdDev);
    
    return expenses.filter(t => t.amount > threshold);
  }, [yearTransactions]);

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
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Analytics & Insights
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Deep dive into your spending patterns
            </p>
          </div>
          
          {/* Year Selector - Fixed */}
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>

        {/* Show message if no transactions for selected year */}
        {yearTransactions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No transactions found for {selectedYear}
            </p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              Add some transactions to see analytics
            </p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {userData?.currency || '₹'} {yearTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {userData?.currency || '₹'} {yearTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">Average Monthly Spend</p>
                <p className="text-2xl font-bold text-blue-600">
                  {userData?.currency || '₹'} {Math.round(
                    yearTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) / 12
                  ).toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">vs Last Month</p>
                <p className={`text-2xl font-bold ${monthlyComparison.isHigher ? 'text-red-600' : 'text-green-600'}`}>
                  {monthlyComparison.isHigher ? '+' : ''}{monthlyComparison.percentage}%
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Spending by Category - Pie Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Spending by Category
                </h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${userData?.currency || '₹'} ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">No expense data available</div>
                )}
              </div>

              {/* Monthly Trends - Bar Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Monthly Income vs Expenses ({selectedYear})
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${userData?.currency || '₹'} ${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Spending Pattern */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Spending by Day of Week
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyPattern}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${userData?.currency || '₹'} ${value.toLocaleString()}`} />
                    <Line type="monotone" dataKey="amount" stroke="#667eea" name="Spending" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Savings Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  Monthly Savings Trend ({selectedYear})
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${userData?.currency || '₹'} ${value.toLocaleString()}`} />
                    <Line type="monotone" dataKey="savings" stroke="#10b981" name="Savings" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Expenses */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Top 5 Largest Expenses in {selectedYear}
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {topExpenses.map(expense => (
                  <div key={expense.id} className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{expense.category}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{expense.note || 'No description'}</p>
                      <p className="text-xs text-gray-400">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                    </div>
                    <p className="text-lg font-bold text-red-600">
                      {userData?.currency || '₹'} {expense.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
                {topExpenses.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No expenses recorded yet
                  </div>
                )}
              </div>
            </div>

            {/* Anomaly Detection */}
            {anomalies.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800 mb-8">
                <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-400 mb-3">
                  ⚠️ Unusual Expenses Detected in {selectedYear}
                </h3>
                <div className="space-y-2">
                  {anomalies.map(anomaly => (
                    <div key={anomaly.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-400">
                          {anomaly.category} - {anomaly.note || 'No description'}
                        </p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-500">
                          {format(new Date(anomaly.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-yellow-800 dark:text-yellow-400">
                        {userData?.currency || '₹'} {anomaly.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-3">
                  These expenses are significantly higher than your average spending pattern.
                </p>
              </div>
            )}

            {/* Smart Suggestions */}
            <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-3">💡 Smart Suggestions</h3>
              <div className="space-y-2">
                {categoryData.length > 0 && categoryData[0] && (
                  <p>• Your biggest expense category is "{categoryData[0].name}". Consider setting a budget for it.</p>
                )}
                {dailyPattern.length > 0 && dailyPattern.reduce((max, curr) => curr.amount > max.amount ? curr : max, { amount: 0 }).amount > 0 && (
                  <p>• You spend the most on {dailyPattern.reduce((max, curr) => curr.amount > max.amount ? curr : max, { amount: 0 }).day}s. Plan your week better.</p>
                )}
                {monthlyComparison.isHigher && monthlyComparison.percentage > 0 && (
                  <p>• Your spending increased by {Math.abs(monthlyComparison.percentage)}% this month. Review your expenses to identify areas to cut back.</p>
                )}
                <p>• Try to save at least 20% of your income each month for financial security.</p>
                {anomalies.length > 0 && (
                  <p>• You had {anomalies.length} unusual expense{anomalies.length > 1 ? 's' : ''} recently. Consider if these were necessary purchases.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Analytics;