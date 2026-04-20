import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import TransactionForm from '../components/TransactionForm';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';

const Dashboard = () => {
    const { user, userData } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTransactionForm, setShowTransactionForm] = useState(false);
    const [timeRange, setTimeRange] = useState('monthly'); // daily, weekly, monthly

    // Fetch transactions with real-time listener
    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const transactionsData = [];
            querySnapshot.forEach((doc) => {
                transactionsData.push({ id: doc.id, ...doc.data() });
            });
            setTransactions(transactionsData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching transactions:', error);
            // Add this toast notification
            import('react-hot-toast').then(({ default: toast }) => {
                toast.error('Error loading transactions. Please check if Firestore is enabled in Firebase Console.');
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Filter transactions based on time range
    const getFilteredTransactions = useCallback(() => {
        const now = new Date();
        let startDate;

        switch (timeRange) {
            case 'daily':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'weekly':
                startDate = startOfWeek(now);
                break;
            case 'monthly':
                startDate = startOfMonth(now);
                break;
            default:
                startDate = startOfMonth(now);
        }

        return transactions.filter(t => new Date(t.date) >= startDate);
    }, [transactions, timeRange]);

    // Calculate totals using useMemo for performance
    const totals = useMemo(() => {
        const filtered = getFilteredTransactions();
        const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expenses;
        const savings = userData?.monthlyGoal ? (balance / userData.monthlyGoal) * 100 : 0;

        return { income, expenses, balance, savings };
    }, [getFilteredTransactions, userData]);

    // Get spending by category
    const categorySpending = useMemo(() => {
        const filtered = getFilteredTransactions().filter(t => t.type === 'expense');
        const categories = {};
        filtered.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
        });
        return categories;
    }, [getFilteredTransactions]);

    // Get spending trend data for chart
    const trendData = useMemo(() => {
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const month = subMonths(new Date(), i);
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const monthTransactions = transactions.filter(t =>
                isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
            );

            const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

            last6Months.push({
                month: format(month, 'MMM'),
                income,
                expenses,
                savings: income - expenses
            });
        }
        return last6Months;
    }, [transactions]);

    // Generate smart insights
    const insights = useMemo(() => {
        const filtered = getFilteredTransactions();
        const expenses = filtered.filter(t => t.type === 'expense');
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

        // Find top spending category
        const categoryTotal = {};
        expenses.forEach(t => {
            categoryTotal[t.category] = (categoryTotal[t.category] || 0) + t.amount;
        });
        const topCategory = Object.entries(categoryTotal).sort((a, b) => b[1] - a[1])[0];

        // Find highest spending day
        const dailySpending = {};
        expenses.forEach(t => {
            const day = format(new Date(t.date), 'EEEE');
            dailySpending[day] = (dailySpending[day] || 0) + t.amount;
        });
        const topDay = Object.entries(dailySpending).sort((a, b) => b[1] - a[1])[0];

        // Calculate percentage of top category
        const topCategoryPercentage = topCategory ? ((topCategory[1] / totalExpenses) * 100).toFixed(1) : 0;

        // Compare with last month
        const now = new Date();
        const currentMonth = startOfMonth(now);
        const lastMonth = startOfMonth(subMonths(now, 1));

        const currentExpenses = transactions.filter(t =>
            t.type === 'expense' && new Date(t.date) >= currentMonth
        ).reduce((sum, t) => sum + t.amount, 0);

        const lastMonthExpenses = transactions.filter(t =>
            t.type === 'expense' && new Date(t.date) >= lastMonth && new Date(t.date) < currentMonth
        ).reduce((sum, t) => sum + t.amount, 0);

        const changePercentage = lastMonthExpenses ? ((currentExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1) : 0;

        return {
            topCategory: topCategory ? topCategory[0] : 'None',
            topCategoryPercentage,
            topDay: topDay ? topDay[0] : 'None',
            changePercentage,
            isSavingLess: changePercentage > 0
        };
    }, [getFilteredTransactions, transactions]);

    // Spending prediction
    const spendingPrediction = useMemo(() => {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();

        const currentExpenses = transactions.filter(t =>
            t.type === 'expense' && new Date(t.date) >= currentMonthStart
        ).reduce((sum, t) => sum + t.amount, 0);

        const dailyAverage = currentExpenses / currentDay;
        const predictedTotal = dailyAverage * daysInMonth;
        const remainingPrediction = predictedTotal - currentExpenses;

        return {
            predictedTotal: Math.round(predictedTotal),
            remainingPrediction: Math.round(remainingPrediction),
            dailyAverage: Math.round(dailyAverage)
        };
    }, [transactions]);

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
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                            Welcome back, {userData?.name || 'User'}!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Here's your financial overview
                        </p>
                    </div>
                    <button
                        onClick={() => setShowTransactionForm(true)}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition-opacity duration-200"
                    >
                        <FiPlus className="mr-2" />
                        Add Transaction
                    </button>
                </div>

                {/* Time Range Selector */}
                <div className="flex space-x-2 mb-6">
                    {['daily', 'weekly', 'monthly'].map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg capitalize transition-colors duration-200 ${timeRange === range
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 dark:text-gray-400">Total Balance</h3>
                            <FiDollarSign className="text-green-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white">
                            {userData?.currency || '₹'} {totals.balance.toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 dark:text-gray-400">Total Income</h3>
                            <FiTrendingUp className="text-green-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-green-600">
                            {userData?.currency || '₹'} {totals.income.toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 dark:text-gray-400">Total Expenses</h3>
                            <FiTrendingDown className="text-red-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-red-600">
                            {userData?.currency || '₹'} {totals.expenses.toLocaleString()}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-500 dark:text-gray-400">Monthly Savings</h3>
                            <FiPieChart className="text-blue-500" size={24} />
                        </div>
                        <p className="text-3xl font-bold text-blue-600">
                            {totals.savings.toFixed(1)}%
                        </p>
                        {userData?.monthlyGoal > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                                Goal: {userData?.currency || '₹'} {userData.monthlyGoal.toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Spending Trend */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                            Spending Trend (Last 6 Months)
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="income" stroke="#10b981" name="Income" />
                                <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                                <Line type="monotone" dataKey="savings" stroke="#3b82f6" name="Savings" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Smart Insights */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                            Smart Insights
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-gray-800 dark:text-white">
                                    💡 You spend <strong className="text-primary">{insights.topCategoryPercentage}%</strong> on <strong>{insights.topCategory}</strong> this {timeRange}
                                </p>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <p className="text-gray-800 dark:text-white">
                                    📅 Your highest spending day is <strong>{insights.topDay}</strong>
                                </p>
                            </div>
                            <div className={`p-4 rounded-lg ${insights.isSavingLess ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                                <p className="text-gray-800 dark:text-white">
                                    {insights.isSavingLess
                                        ? `⚠️ You are spending ${Math.abs(insights.changePercentage)}% more than last month`
                                        : `🎉 You are saving ${insights.changePercentage}% more than last month`}
                                </p>
                            </div>
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <p className="text-gray-800 dark:text-white">
                                    📊 Based on your spending pattern, you may spend <strong>{userData?.currency || '₹'} {spendingPrediction.predictedTotal.toLocaleString()}</strong> this month
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Daily average: {userData?.currency || '₹'} {spendingPrediction.dailyAverage}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            Recent Transactions
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {getFilteredTransactions().slice(0, 5).map(transaction => (
                            <div key={transaction.id} className="px-6 py-4 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-white">{transaction.category}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.note || 'No description'}</p>
                                    <p className="text-xs text-gray-400">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
                                </div>
                                <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.type === 'income' ? '+' : '-'}{userData?.currency || '₹'} {transaction.amount.toLocaleString()}
                                </p>
                            </div>
                        ))}
                        {getFilteredTransactions().length === 0 && (
                            <div className="px-6 py-8 text-center">
                                <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                                <button
                                    onClick={() => setShowTransactionForm(true)}
                                    className="mt-2 text-primary hover:underline"
                                >
                                    Add your first transaction
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showTransactionForm && (
                <TransactionForm
                    onClose={() => setShowTransactionForm(false)}
                    onSuccess={() => setShowTransactionForm(false)}
                />
            )}
        </>
    );
};

export default Dashboard;