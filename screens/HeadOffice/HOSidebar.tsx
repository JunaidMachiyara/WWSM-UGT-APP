import React, { useState, useEffect, useRef } from 'react';
import { HOView } from './HODashboard';
import { useAppContext } from '../../context/AppContext';

// Icons
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;

interface HOSidebarProps {
  activeView: HOView;
  setView: (view: HOView) => void;
}

const HOSidebar: React.FC<HOSidebarProps> = ({ activeView, setView }) => {
  const { alerts } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const unreadCount = alerts.filter(a => a.shopId === 'HO' && !a.isRead).length;

  // View IDs for active state checking
  const accountingViewIds = ['paymentVoucher', 'receiptVoucher', 'ledgers'];
  const reportsViewIds = ['performanceAnalysis', 'itemPerformance', 'shopPerformance'];
  const setupViewIds = [
      'shopManagement', 'userManagement', 'itemManagement', 
      'clearingAgentSetup', 'customExpenseSetup', 'currencyManagement',
      'freightForwarderSetup', 'expenseAccountManagement', 'adminUtility'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (view: HOView) => {
      setView(view);
      setActiveDropdown(null);
      setMobileMenuOpen(false);
  };

  const toggleDropdown = (menu: string) => {
      setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  // Nav Structures
  const accountingItems = [
    { id: 'paymentVoucher', label: 'Payment Vouchers' },
    { id: 'receiptVoucher', label: 'Receipt from Shop' },
    { id: 'ledgers', label: 'Shop Ledgers' },
  ];

  const reportsItems = [
      { id: 'performanceAnalysis', label: 'Performance Analysis' },
      { id: 'itemPerformance', label: 'Item Performance' },
      { id: 'shopPerformance', label: 'Shop Performance' },
  ];

  const setupItems = [
    { id: 'shopManagement', label: 'Shops' },
    { id: 'userManagement', label: 'Users' },
    { id: 'itemManagement', label: 'Items' },
    { id: 'clearingAgentSetup', label: 'Clearing Agents' },
    { id: 'freightForwarderSetup', label: 'Freight Forwarders' },
    { id: 'customExpenseSetup', label: 'Custom Expenses' },
    { id: 'expenseAccountManagement', label: 'Expense Accounts' },
    { id: 'currencyManagement', label: 'Currencies' },
    { id: 'adminUtility', label: 'Admin Utility' },
  ];

  const NavLink = ({ id, label, isAlert, icon }: { id: HOView, label: string, isAlert?: boolean, icon?: React.ReactNode }) => (
      <button
          onClick={() => handleNavClick(id)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative whitespace-nowrap flex items-center ${
              activeView === id 
              ? 'bg-primary text-white shadow-sm' 
              : 'text-gray-700 hover:bg-blue-100 hover:text-primary'
          }`}
          title={label}
      >
          {icon ? icon : label}
          {isAlert && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white min-w-[1.25rem] text-center flex items-center justify-center">
                  {unreadCount}
              </span>
          )}
      </button>
  );

  const Dropdown = ({ label, items, isOpen, onToggle, activeIds }: { label: string, items: {id: string, label: string}[], isOpen: boolean, onToggle: () => void, activeIds: string[] }) => {
      const isActive = activeIds.includes(activeView);
      return (
          <div className="relative">
              <button
                  onClick={onToggle}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none ${
                      isActive || isOpen ? 'text-primary bg-blue-100' : 'text-gray-700 hover:bg-blue-100 hover:text-primary'
                  }`}
              >
                  {label}
                  <ChevronDownIcon />
              </button>
              
              {isOpen && (
                  <div className="absolute left-0 mt-2 w-56 rounded-md shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-in-down origin-top-left">
                      <div className="py-1">
                          {items.map(item => (
                              <button
                                  key={item.id}
                                  onClick={() => handleNavClick(item.id as HOView)}
                                  className={`block w-full text-left px-4 py-2 text-sm ${
                                      activeView === item.id 
                                      ? 'bg-blue-50 text-primary font-semibold' 
                                      : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                              >
                                  {item.label}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      );
  };

  return (
    <nav className="bg-blue-50" ref={navRef}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          <div className="flex items-center">
            {/* Desktop Menu */}
            <div className="hidden lg:flex lg:space-x-1 lg:items-center">
              <NavLink id="dashboard" label="Dashboard" />
              <NavLink id="exportManagement" label="Exports" />
              
              <div className="h-6 w-px bg-blue-200 mx-2"></div>

              <Dropdown 
                  label="Accounting" 
                  items={accountingItems} 
                  isOpen={activeDropdown === 'accounting'} 
                  onToggle={() => toggleDropdown('accounting')}
                  activeIds={accountingViewIds}
              />
              
              <Dropdown 
                  label="Reports" 
                  items={reportsItems} 
                  isOpen={activeDropdown === 'reports'} 
                  onToggle={() => toggleDropdown('reports')}
                  activeIds={reportsViewIds}
              />

              <Dropdown 
                  label="Setup" 
                  items={setupItems} 
                  isOpen={activeDropdown === 'setup'} 
                  onToggle={() => toggleDropdown('setup')}
                  activeIds={setupViewIds}
              />

              <div className="h-6 w-px bg-blue-200 mx-2"></div>

              <NavLink id="alerts" label="Alerts" isAlert icon={<BellIcon />} />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden w-full justify-end">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-primary hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Drawer) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white absolute w-full z-50 shadow-lg">
          <div className="pt-2 pb-3 space-y-1 px-2">
            <button onClick={() => handleNavClick('dashboard')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Dashboard</button>
            <button onClick={() => handleNavClick('exportManagement')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Exports</button>
            <button onClick={() => handleNavClick('alerts')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Alerts {unreadCount > 0 && `(${unreadCount})`}</button>
            
            <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Accounting</p>
                {accountingItems.map(i => (
                    <button key={i.id} onClick={() => handleNavClick(i.id as HOView)} className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 pl-6">{i.label}</button>
                ))}
            </div>

            <div className="pt-2 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reports</p>
                {reportsItems.map(i => (
                    <button key={i.id} onClick={() => handleNavClick(i.id as HOView)} className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 pl-6">{i.label}</button>
                ))}
            </div>

            <div className="pt-2 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Setup</p>
                {setupItems.map(i => (
                    <button key={i.id} onClick={() => handleNavClick(i.id as HOView)} className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 pl-6">{i.label}</button>
                ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default HOSidebar;
