
import React from 'react';
import { HOView } from './HODashboard';

// Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ShopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const ItemIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
const AnalysisIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>;
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-4m-2 4l-3 3m0 0l3 3m-3-3h12" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

interface HOSidebarProps {
  activeView: HOView;
  setView: (view: HOView) => void;
}

const HOSidebar: React.FC<HOSidebarProps> = ({ activeView, setView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'shopManagement', label: 'Shop Management', icon: <ShopIcon /> },
    { id: 'userManagement', label: 'User Management', icon: <UserIcon /> },
    { id: 'itemManagement', label: 'Item Management', icon: <ItemIcon /> },
    { id: 'performanceAnalysis', label: 'Performance Analysis', icon: <AnalysisIcon /> },
    { id: 'exportManagement', label: 'Export Management', icon: <ExportIcon /> },
    { id: 'clearingAgentSetup', label: 'Clearing Agents', icon: <SettingsIcon /> },
    { id: 'freightForwarderSetup', label: 'Freight Forwarders', icon: <SettingsIcon /> },
    { id: 'customExpenseSetup', label: 'Custom Expenses', icon: <SettingsIcon /> },
    { id: 'expenseAccountManagement', label: 'Expense Accounts', icon: <SettingsIcon /> },
    { id: 'currencyManagement', label: 'Currency Rates', icon: <SettingsIcon /> },
  ];

  const baseStyle = "flex items-center px-4 py-3 transition-colors duration-200 cursor-pointer";
  const activeStyle = "bg-primary-dark text-white font-bold";
  const inactiveStyle = "text-gray-600 hover:bg-primary-dark hover:text-white";

  return (
    <aside className="w-64 bg-white text-gray-800 flex flex-col border-r">
      <div className="h-20 flex items-center justify-center border-b">
        <h2 className="text-2xl font-bold text-primary">WWSM_UGT</h2>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.map(item => (
          <a
            key={item.id}
            className={`${baseStyle} ${activeView === item.id ? activeStyle : inactiveStyle}`}
            onClick={() => setView(item.id as HOView)}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default HOSidebar;
