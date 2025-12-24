
import React, { useState } from 'react';
import Layout from '../../components/Layout';
import ShopSidebar from './ShopSidebar';
import Dashboard from './views/Dashboard';
import Sales from './views/Sales';
import SalesHistory from './views/SalesHistory';
import Expenses from './views/Expenses';
import Inventory from './views/Inventory';
import IncomeStatement from './views/IncomeStatement';
import Ledgers from './views/Ledgers';
import ReceiptVoucher from './views/ReceiptVoucher';
import ReceiveStock from './views/ReceiveStock';
import CustomerManagement from './views/CustomerManagement';
import AccountManagement from './views/AccountManagement';
import SalesReturn from './views/SalesReturn';
import WarehouseManagement from './views/WarehouseManagement';
import AssetManagement from './views/AssetManagement';
import CustomerAdvances from './views/CustomerAdvances';
import SupplierLedger from './views/SupplierLedger';
import { ClearingAgentLedger, CustomsLedger, DutyLedger, CashLedger, BankLedger } from './views/ReportLedgers';
import PaymentVoucher from './views/PaymentVoucher';
import OpeningStock from './views/OpeningStock';

export type ShopView = 'dashboard' | 'sales' | 'salesHistory' | 'expenses' | 'inventory' | 'reports-income' | 'reports-ledgers' | 'receiptVoucher' | 'paymentVoucher' | 'receiveStock' | 'customerManagement' | 'accountManagement' | 'salesReturn' | 'warehouseManagement' | 'assetManagement' | 'customerAdvances' | 'supplierLedger' | 'clearingAgentLedger' | 'customsLedger' | 'dutyLedger' | 'cashLedger' | 'bankLedger' | 'openingStock';

const ShopDashboard: React.FC = () => {
  const [view, setView] = useState<ShopView>('dashboard');

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'supplierLedger':
        return <SupplierLedger />;
      case 'clearingAgentLedger':
        return <ClearingAgentLedger />;
      case 'customsLedger':
        return <CustomsLedger />;
      case 'dutyLedger':
        return <DutyLedger />;
      case 'cashLedger':
        return <CashLedger />;
      case 'bankLedger':
        return <BankLedger />;
      case 'receiveStock':
        return <ReceiveStock />;
      case 'sales':
        return <Sales onNavigate={setView} />;
      case 'salesHistory':
        return <SalesHistory />;
      case 'receiptVoucher':
        return <ReceiptVoucher />;
      case 'paymentVoucher':
        return <PaymentVoucher />;
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
      case 'openingStock':
        return <OpeningStock />;
      default:
        return <Dashboard />;
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'dashboard': return 'Shop Dashboard';
      case 'supplierLedger': return 'Supplier Ledger (Head Office)';
      case 'clearingAgentLedger': return 'Clearing Agent Report';
      case 'customsLedger': return 'Customs Report';
      case 'dutyLedger': return 'Duty Report';
      case 'cashLedger': return 'Cash Ledgers';
      case 'bankLedger': return 'Bank Ledgers';
      case 'receiveStock': return 'Receive Stock from HO';
      case 'sales': return 'Record Sales';
      case 'salesHistory': return 'Sales History & Invoices';
      case 'receiptVoucher': return 'Receipt Voucher';
      case 'paymentVoucher': return 'Payment Voucher';
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
      case 'openingStock': return 'Add Old Stock (Opening)';
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
