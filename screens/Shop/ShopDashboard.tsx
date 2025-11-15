import React, { useState } from 'react';
import Layout from '../../components/Layout';
import ShopSidebar from './ShopSidebar';
import Dashboard from './views/Dashboard';
import Sales from './views/Sales';
import Expenses from './views/Expenses';
import Inventory from './views/Inventory';
import IncomeStatement from './views/IncomeStatement';
import Ledgers from './views/Ledgers';
import ReceiptVoucher from './views/ReceiptVoucher';
import ReceiveStock from './views/ReceiveStock';
import CustomerManagement from './views/CustomerManagement';
import AccountManagement from './views/AccountManagement';
import SalesReturn from './views/SalesReturn';
import Alerts from './views/Alerts';
import WarehouseManagement from './views/WarehouseManagement';
import AssetManagement from './views/AssetManagement';
import CustomerAdvances from './views/CustomerAdvances';

export type ShopView = 'dashboard' | 'sales' | 'expenses' | 'inventory' | 'reports-income' | 'reports-ledgers' | 'receiptVoucher' | 'receiveStock' | 'customerManagement' | 'accountManagement' | 'salesReturn' | 'alerts' | 'warehouseManagement' | 'assetManagement' | 'customerAdvances';

const ShopDashboard: React.FC = () => {
  const [view, setView] = useState<ShopView>('dashboard');

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'alerts':
        return <Alerts />;
      case 'receiveStock':
        return <ReceiveStock />;
      case 'sales':
        return <Sales />;
      case 'receiptVoucher':
        return <ReceiptVoucher />;
      case 'customerAdvances':
        return <CustomerAdvances />;
      case 'salesReturn':
        return <SalesReturn />;
      case 'expenses':
        return <Expenses />;
      case 'inventory':
        return <Inventory />;
      case 'warehouseManagement':
        return <WarehouseManagement />;
      case 'assetManagement':
        return <AssetManagement />;
      case 'customerManagement':
        return <CustomerManagement />;
      case 'accountManagement':
        return <AccountManagement />;
      case 'reports-income':
        return <IncomeStatement />;
      case 'reports-ledgers':
        return <Ledgers />;
      default:
        return <Dashboard />;
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'dashboard': return 'Shop Dashboard';
      case 'alerts': return 'System Alerts';
      case 'receiveStock': return 'Receive Stock from HO';
      case 'sales': return 'Sales & Receivables';
      case 'receiptVoucher': return 'Receipt Voucher';
      case 'customerAdvances': return 'Customer Advances';
      case 'salesReturn': return 'Sales Returns & Claims';
      case 'expenses': return 'Expenses & Payables';
      case 'inventory': return 'Inventory Management';
      case 'warehouseManagement': return 'Warehouse Management';
      case 'assetManagement': return 'Asset Management';
      case 'customerManagement': return 'Customer Management';
      case 'accountManagement': return 'Cash & Bank Accounts';
      case 'reports-income': return 'Income Statement';
      case 'reports-ledgers': return 'Customer Ledgers';
      default: return 'Dashboard';
    }
  };

  return (
    <Layout sidebar={<ShopSidebar activeView={view} setView={setView} />} title={getTitle()}>
      {renderView()}
    </Layout>
  );
};

export default ShopDashboard;