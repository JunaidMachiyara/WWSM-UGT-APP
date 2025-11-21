
import React, { useState, useEffect } from 'react';
import { HOView } from './HODashboard';
import { useAppContext } from '../../context/AppContext';

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-4m-2 4l-3 3m0 0l3 3m-3-3h12" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const CalculatorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

interface HOSidebarProps {
  activeView: HOView;
  setView: (view: HOView) => void;
}

const HOSidebar: React.FC<HOSidebarProps> = ({ activeView, setView }) => {
  const { alerts } = useAppContext();

  const unreadCount = alerts.filter(a => a.shopId === 'HO' && !a.isRead).length;

  const accountingViewIds = ['paymentVoucher', 'receiptVoucher', 'ledgers'];
  const reportsViewIds = ['performanceAnalysis', 'itemPerformance', 'shopPerformance'];
  const setupViewIds = [
      'shopManagement', 
      'userManagement', 
      'itemManagement', 
      'clearingAgentSetup', 
      'customExpenseSetup', 
      'currencyManagement',
      'freightForwarderSetup', 
      'expenseAccountManagement'
  ];
  
  const isAccountingActive = accountingViewIds.includes(activeView);
  const isReportsActive = reportsViewIds.includes(activeView);
  const isSetupActive = setupViewIds.includes(activeView);

  const [isAccountingOpen, setIsAccountingOpen] = useState(isAccountingActive);
  const [isReportsOpen, setIsReportsOpen] = useState(isReportsActive);
  const [isSetupOpen, setIsSetupOpen] = useState(isSetupActive);

  useEffect(() => {
    if (isAccountingActive) setIsAccountingOpen(true);
    if (isReportsActive) setIsReportsOpen(true);
    if (isSetupActive) setIsSetupOpen(true);
  }, [activeView, isAccountingActive, isReportsActive, isSetupActive]);

  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'alerts', label: 'Alerts', icon: <AlertIcon /> },
    { id: 'exportManagement', label: 'Export Management', icon: <ExportIcon /> },
  ];

  const accountingItems = [
    { id: 'paymentVoucher', label: 'Payment Vouchers' },
    { id: 'receiptVoucher', label: 'Receipt from Shop' },
    { id: 'ledgers', label: 'Shop Ledgers' },
  ];

  const reportsItems = [
      { id: 'performanceAnalysis', label: 'Performance Analysis' },
      { id: 'itemPerformance', label: 'Item Performance Details' },
      { id: 'shopPerformance', label: 'Shop Performance Details' },
  ];

  const setupItems = [
    { id: 'shopManagement', label: 'Shop Management' },
    { id: 'userManagement', label: 'User Management' },
    { id: 'itemManagement', label: 'Item Management' },
    { id: 'clearingAgentSetup', label: 'Clearing Agents' },
    { id: 'freightForwarderSetup', label: 'Freight Forwarders' },
    { id: 'customExpenseSetup', label: 'Custom Expenses' },
    { id: 'expenseAccountManagement', label: 'Expense Accounts' },
    { id: 'currencyManagement', label: 'Currency Rates' },
  ];

  const baseStyle = "flex items-center px-4 py-3 transition-colors duration-200 cursor-pointer relative";
  const activeStyle = "bg-primary-dark text-white font-bold";
  const inactiveStyle = "text-gray-600 hover:bg-primary-dark hover:text-white";
  
  const subMenuStyle = "flex items-center pl-12 pr-4 py-2 text-sm transition-colors duration-200 cursor-pointer";
  const activeSubMenuStyle = "bg-primary text-white font-semibold";
  const inactiveSubMenuStyle = "text-gray-500 hover:bg-primary-dark hover:text-white";

  return (
    <aside className="w-64 h-full bg-white text-gray-800 flex flex-col border-r overflow-y-auto">
      <div className="h-20 flex items-center justify-center border-b flex-shrink-0">
        <h2 className="text-2xl font-bold text-primary">WWSM_UGT</h2>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {mainItems.map(item => (
          <a
            key={item.id}
            className={`${baseStyle} ${activeView === item.id ? activeStyle : inactiveStyle}`}
            onClick={() => setView(item.id as HOView)}
          >
            <div className="relative">
                {item.icon}
                {item.id === 'alerts' && unreadCount > 0 && (
                     <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full border-2 border-white leading-none py-0.5 shadow-md">
                        {unreadCount}
                     </span>
                )}
            </div>
            <span className="ml-3">{item.label}</span>
          </a>
        ))}

        {/* Accounting Collapsible Section */}
        <div>
            <div
                className={`${baseStyle} justify-between ${isAccountingActive ? activeStyle : inactiveStyle}`}
                onClick={() => setIsAccountingOpen(!isAccountingOpen)}
            >
                <div className="flex items-center">
                    <CalculatorIcon />
                    <span className="ml-3">Accounting</span>
                </div>
                <div className={`transition-transform duration-300 ${isAccountingOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </div>
            {isAccountingOpen && (
                <div className="py-1 bg-gray-50">
                    {accountingItems.map(item => (
                        <a
                            key={item.id}
                            className={`${subMenuStyle} ${activeView === item.id ? activeSubMenuStyle : inactiveSubMenuStyle}`}
                            onClick={() => setView(item.id as HOView)}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
            )}
        </div>

        {/* Reports Collapsible Section */}
        <div>
            <div
                className={`${baseStyle} justify-between ${isReportsActive ? activeStyle : inactiveStyle}`}
                onClick={() => setIsReportsOpen(!isReportsOpen)}
            >
                <div className="flex items-center">
                    <ReportIcon />
                    <span className="ml-3">Reports</span>
                </div>
                <div className={`transition-transform duration-300 ${isReportsOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </div>
            {isReportsOpen && (
                <div className="py-1 bg-gray-50">
                    {reportsItems.map(item => (
                        <a
                            key={item.id}
                            className={`${subMenuStyle} ${activeView === item.id ? activeSubMenuStyle : inactiveSubMenuStyle}`}
                            onClick={() => setView(item.id as HOView)}
                        >
                            {item.label}
                        </a>
                    ))}
                </div>
            )}
        </div>

        {/* Setup Collapsible Section */}
        <div>
            <div
                className={`${baseStyle} justify-between ${isSetupActive ? activeStyle : inactiveStyle}`}
                onClick={() => setIsSetupOpen(!isSetupOpen)}
            >
                <div className="flex items-center">
                    <SettingsIcon />
                    <span className="ml-3">Setup</span>
                </div>
                <div className={`transition-transform duration-300 ${isSetupOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </div>
            {isSetupOpen && (
                <div className="py-1 bg-gray-50">
                    {setupItems.map(item => (
                        <a
                            key={item.id}
                            className={`${subMenuStyle} ${activeView === item.id ? activeSubMenuStyle : inactiveSubMenuStyle}`}
                            onClick={() => setView(item.id as HOView)}
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

export default HOSidebar;
