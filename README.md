# 💰 Smart Expense Analyzer

A comprehensive, feature-rich expense tracking application that helps you manage your finances intelligently with AI-powered insights, budget management, and detailed analytics.

## 🎯 Problem It Solves

Managing personal finances is challenging:
- ❌ People don't know where their money goes
- ❌ Manual expense tracking is tedious and error-prone
- ❌ No awareness of spending patterns or budget violations
- ❌ Difficulty in saving money without proper insights
- ❌ Lack of visual representation of financial data

## ✨ Solution

Smart Expense Analyzer provides:
- ✅ Automated expense categorization
- ✅ Real-time budget tracking with alerts
- ✅ AI-powered spending insights and predictions
- ✅ Beautiful visual analytics and reports
- ✅ Multi-device synchronization with cloud backup

## 🚀 Live Demo

copy the below link -> 

react-project-end-term-3-smart-expe.vercel.app

## 📋 Features

### 🔐 Authentication System
- Email + password signup/login
- Secure logout functionality
- Password reset capability
- Protected routes (dashboard only after login)
- Persistent session (auto-login on refresh)

### 📊 Main Dashboard
- **Overview Cards**: Total balance, income, expenses, monthly savings
- **Time-based Views**: Daily/Weekly/Monthly data toggles
- **Real-time Updates**: Dynamic updates based on selection

### 💰 Transaction Management
- **CRUD Operations**: Create, Read, Update, Delete transactions
- **Transaction Types**: Income and Expense categorization
- **Categories**: Food, Travel, Shopping, Rent, Bills, Entertainment, Health, Education
- **Advanced Filters**: 
  - Category filter
  - Date range filter
  - Income vs Expense filter
  - Search functionality

### 📈 Analytics & Insights
- **Spending Breakdown**: Interactive pie charts by category
- **Monthly Trends**: Bar charts for income vs expenses
- **Spending Patterns**: Line charts showing spending over time
- **Smart Insights**:
  - "You spend 42% on food this month"
  - "Your highest spending day is Sunday"
  - "You are spending 18% more than last month"

### 🎯 Budget Management
- Set monthly budgets per category (e.g., Food: ₹5000)
- Real-time budget tracking with progress bars
- **Smart Alerts**:
  - Warning at 70% usage
  - Alert when budget exceeded

### 🤖 AI-Powered Features
- **Auto Categorization**: Detects spending patterns (e.g., "Zomato" → Food)
- **Spending Prediction**: "You may spend ₹12,000 this month based on trend"
- **Anomaly Detection**: "Unusual expense detected: ₹5000 on Food"
- **Smart Suggestions**: "Try reducing food delivery to save ₹1500/month"

### 📅 Monthly Financial Reports
- Auto-generated summary including:
  - Total income and expenses
  - Savings overview
  - Top spending category
  - Worst spending habit identification
- Export options (PDF download)

### 🔔 Notification System
- Budget limit alerts
- Weekly spending summaries
- Overspending warnings
- Toast notifications for success/error states

### 👤 User Profile
- Personal information management
- Multi-currency support (₹, $, €, £, ¥)
- Monthly savings goal setting
- Dark/Light mode toggle

### 📱 UI/UX Excellence
- Fully responsive design (mobile + desktop)
- Loading skeletons for better UX
- Empty states with helpful messages
- Smooth animations and transitions
- Dark mode support
- Toast notifications

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router v6** - Navigation and routing
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling and responsive design

### Backend & Database
- **Firebase Authentication** - User management
- **Firebase Firestore** - Real-time database
- **Cloud Storage** - Data persistence

### Data Visualization
- **Recharts** - Charts and graphs
- **Chart.js** - Additional visualizations

### Additional Libraries
- **date-fns** - Date manipulation
- **react-hot-toast** - Notifications
- **react-icons** - Icon library
- **jsPDF** - PDF report generation
- **html2canvas** - Report export
