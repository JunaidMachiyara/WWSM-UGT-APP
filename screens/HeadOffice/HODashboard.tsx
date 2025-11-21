
import React, { useState } from 'react';
import Layout from '../../components/Layout';
import HOSidebar from './HOSidebar';
import Dashboard from './views/Dashboard';
import ShopManagement from './views/ShopManagement';
import UserManagement from './views/UserManagement';
import ItemManagement from './views/ItemManagement';
import PerformanceAnalysis from './views/PerformanceAnalysis';
import ExportManagement from './views/ExportManagement';
import ClearingAgentSetup from './views/ClearingAgentSetup';
import FreightForwarderSetup from './views/FreightForwarderSetup';
import CustomExpenseSetup from './views/CustomExpenseSetup';
import ExpenseAccountManagement from './views/ExpenseAccountManagement';
import CurrencyManagement from './views/CurrencyManagement';
import HOAlerts from './views/HOAlerts';
import HOPaymentVoucher from './views/HOPaymentVoucher';
import HOReceiptVoucher from './views/HOReceiptVoucher';
import HOLedgers from './views/HOLedgers';
import ItemPerformance from './views/ItemPerformance';
import ShopPerformance from './views/ShopPerformance';

export type HOView = 'dashboard' | 'shopManagement' | 'userManagement' | 'itemManagement' | 'performanceAnalysis' | 'exportManagement' | 'clearingAgentSetup' | 'freightForwarderSetup' | 'customExpenseSetup' | 'expenseAccountManagement' | 'currencyManagement' | 'alerts' | 'paymentVoucher' | 'receiptVoucher' | 'ledgers' | 'itemPerformance' | 'shopPerformance';

const HODashboard: React.FC = () => {
  const [view, setView] = useState<HOView>('dashboard');

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'shopManagement':
        return <ShopManagement />;
      case 'userManagement':
        return <UserManagement />;
      case 'itemManagement':
        return <ItemManagement />;
      case 'performanceAnalysis':
        return <PerformanceAnalysis />;
      case 'exportManagement':
        return <ExportManagement />;
      case 'clearingAgentSetup':
        return <ClearingAgentSetup />;
      case 'freightForwarderSetup':
        return <FreightForwarderSetup />;
      case 'customExpenseSetup':
        return <CustomExpenseSetup />;
      case 'expenseAccountManagement':
        return <ExpenseAccountManagement />;
      case 'currencyManagement':
        return <CurrencyManagement />;
      case 'alerts':
        return <HOAlerts />;
      case 'paymentVoucher':
        return <HOPaymentVoucher />;
      case 'receiptVoucher':
        return <HOReceiptVoucher />;
      case 'ledgers':
        return <HOLedgers />;
      case 'itemPerformance':
        return <ItemPerformance />;
      case 'shopPerformance':
        return <ShopPerformance />;
      default:
        return <Dashboard />;
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'dashboard': return 'Head Office Dashboard';
      case 'shopManagement': return 'Shop Management';
      case 'userManagement': return 'User Management';
      case 'itemManagement': return 'Item Management';
      case 'performanceAnalysis': return 'Performance Analysis';
      case 'exportManagement': return 'Export Management';
      case 'clearingAgentSetup': return 'Clearing Agent Setup';
      case 'freightForwarderSetup': return 'Freight Forwarder Setup';
      case 'customExpenseSetup': return 'Custom Expense Setup';
      case 'expenseAccountManagement': return 'Expense Account Management';
      case 'currencyManagement': return 'Currency Management';
      case 'alerts': return 'Notifications & Alerts';
      case 'paymentVoucher': return 'Head Office Payment Voucher';
      case 'receiptVoucher': return 'Receipt from Shop';
      case 'ledgers': return 'Shop Ledgers & Financials';
      case 'itemPerformance': return 'Item Performance Details';
      case 'shopPerformance': return 'Shop Performance Details';
      default: return 'Dashboard';
    }
  };

  return (
    <Layout sidebar={<HOSidebar activeView={view} setView={setView} />} title={getTitle()}>
      {renderView()}
    </Layout>
  );
};

export default HODashboard;
