import React, { useState, useEffect } from 'react';
import { ShopView } from './ShopDashboard';
import { useAppContext } from '../../context/AppContext';

// SVG Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const ReceiveStockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>;
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;
const ReceiptIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const AdvanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm-1-10h4" /></svg>;
const ReturnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3" /></svg>;
const ExpenseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const InventoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
const WarehouseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" /></svg>;
const AssetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const AccountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;


interface ShopSidebarProps {
  activeView: ShopView;
  setView: (view: ShopView) => void;
}

const ShopSidebar: React.FC<ShopSidebarProps> = ({ activeView, setView }) => {
  const { shops, shopId } = useAppContext();
  const currentShop = shops.find(s => s.id === shopId);
  
  const isReportsActive = activeView.startsWith('reports-');
  const [reportsOpen, setReportsOpen] = useState(isReportsActive);
  
  useEffect(() => {
    if (isReportsActive) {
      setReportsOpen(true);
    }
  }, [activeView, isReportsActive]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'alerts', label: 'Alerts', icon: <AlertIcon /> },
    { id: 'receiveStock', label: 'Receive Stock', icon: <ReceiveStockIcon /> },
    { id: 'sales', label: 'Record Sales', icon: <SalesIcon /> },
    { id: 'receiptVoucher', label: 'Receipt Voucher', icon: <ReceiptIcon /> },
    { id: 'customerAdvances', label: 'Customer Advances', icon: <AdvanceIcon /> },
    { id: 'salesReturn', label: 'Sales Returns', icon: <ReturnIcon /> },
    { id: 'expenses', label: 'Record Expenses', icon: <ExpenseIcon /> },
    { id: 'inventory', label: 'Inventory', icon: <InventoryIcon /> },
    { id: 'warehouseManagement', label: 'Warehouse Mgt', icon: <WarehouseIcon /> },
    { id: 'assetManagement', label: 'Asset Mgt', icon: <AssetIcon /> },
    { id: 'customerManagement', label: 'Customers', icon: <UsersIcon /> },
    { id: 'accountManagement', label: 'Cash & Bank', icon: <AccountIcon /> },
  ];
  
  const reportItems = [
      { id: 'reports-income' as ShopView, label: 'Income Statement' },
      { id: 'reports-ledgers' as ShopView, label: 'Ledgers' },
  ];

  const baseStyle = "flex items-center px-4 py-3 transition-colors duration-200 cursor-pointer";
  const activeStyle = "bg-primary-dark text-white font-bold";
  const inactiveStyle = "text-gray-600 hover:bg-primary-dark hover:text-white";

  const subMenuStyle = "flex items-center pl-12 pr-4 py-2 text-sm transition-colors duration-200 cursor-pointer";
  const activeSubMenuStyle = "bg-primary text-white font-semibold";
  const inactiveSubMenuStyle = "text-gray-500 hover:bg-primary-dark hover:text-white";

  return (
    <aside className="w-64 bg-white text-gray-800 flex flex-col border-r">
      <div className="h-20 flex flex-col items-center justify-center border-b text-center px-2">
        <h2 className="text-xl font-bold text-primary">WWSM_UGT</h2>
        <p className="text-sm text-gray-500 truncate">{currentShop?.name}</p>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map(item => (
          <a
            key={item.id}
            className={`${baseStyle} ${activeView === item.id ? activeStyle : inactiveStyle}`}
            onClick={() => setView(item.id as ShopView)}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </a>
        ))}
         {/* Reports collapsible menu */}
        <div>
            <div
                className={`${baseStyle} justify-between ${isReportsActive ? activeStyle : inactiveStyle}`}
                onClick={() => setReportsOpen(!reportsOpen)}
            >
                <div className="flex items-center">
                    <ReportIcon />
                    <span className="ml-3">Reports</span>
                </div>
                <div className={`transition-transform duration-300 ${reportsOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </div>
            {reportsOpen && (
                <div className="py-1 bg-gray-50">
                    {reportItems.map(item => (
                        <a
                            key={item.id}
                            className={`${subMenuStyle} ${activeView === item.id ? activeSubMenuStyle : inactiveSubMenuStyle}`}
                            onClick={() => setView(item.id)}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
            )}
        </div>
      </nav>
    </aside>
  );
};

export default ShopSidebar;