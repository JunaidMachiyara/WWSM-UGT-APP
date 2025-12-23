
import React, { useState, useEffect, useRef } from 'react';
import { ShopView } from './ShopDashboard';
import { useAppContext } from '../../context/AppContext';
import { UserRole } from '../../types';

// Icons
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>;

interface ShopSidebarProps {
  activeView: ShopView;
  setView: (view: ShopView) => void;
}

const ShopSidebar: React.FC<ShopSidebarProps> = ({ activeView, setView }) => {
  const { shops, shopId, logout, currentUser, switchShop, role } = useAppContext();
  const currentShop = shops.find(s => s.id === shopId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const isManager = role === UserRole.MANAGER;
  const isHO = role === UserRole.HEAD_OFFICE;
  const multiShopAccess = (currentUser?.allowedShopIds?.length || 0) > 1;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (view: ShopView) => {
      setView(view);
      setActiveDropdown(null);
      setMobileMenuOpen(false);
  };

  const toggleDropdown = (menu: string) => {
      setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  // Nav Groups
  const accountingItems = [
      { id: 'receiptVoucher', label: 'Receipt Voucher (In)' },
      { id: 'paymentVoucher', label: 'Payment Voucher (Out)' },
      { id: 'salesReturn', label: 'Sales Returns' },
      { id: 'customerAdvances', label: 'Customer Advances' },
      { id: 'expenses', label: 'Record Expenses' },
      { id: 'accountManagement', label: 'Cash & Bank Accounts' },
  ];
  
  const reportItems = [
      { id: 'inventory', label: 'Inventory Stock' },
      { id: 'reports-income', label: 'Income Statement' },
      { id: 'reports-ledgers', label: 'Customer Ledgers' },
      { id: 'supplierLedger', label: 'Supplier (HO) Ledger' },
      { id: 'cashLedger', label: 'Cash Account Ledgers' },
      { id: 'bankLedger', label: 'Bank Account Ledgers' },
      { id: 'clearingAgentLedger', label: 'Clearing Report' },
      { id: 'customsLedger', label: 'Customs Report' },
      { id: 'dutyLedger', label: 'Duty Report' },
  ];

  const setupItems = [
      { id: 'openingStock', label: 'Opening Stock' },
      { id: 'customerManagement', label: 'Customers' },
      { id: 'warehouseManagement', label: 'Warehouses' },
      { id: 'assetManagement', label: 'Assets' },
  ];

  const NavLink = ({ id, label }: { id: ShopView, label: string }) => (
      <button
          onClick={() => handleNavClick(id)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === id 
              ? 'bg-primary text-white shadow-sm' 
              : 'text-gray-700 hover:bg-blue-100 hover:text-primary'
          }`}
      >
          {label}
      </button>
  );

  const Dropdown = ({ label, items, isOpen, onToggle }: { label: string, items: {id: string, label: string}[], isOpen: boolean, onToggle: () => void }) => {
      const isActive = items.some(i => i.id === activeView);
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
                                  onClick={() => handleNavClick(item.id as ShopView)}
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
          
          {/* Left Side: Logo & Main Nav */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center mr-6">
              <span className="text-xl font-extrabold text-primary tracking-tight">WWSM_UGT</span>
              <div className="ml-3 flex flex-col justify-center border-l border-blue-200 pl-3">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide leading-none">{currentShop?.name}</span>
                  <span className="text-[10px] text-gray-500 leading-none mt-0.5">{currentShop?.country}</span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden lg:flex lg:space-x-1 lg:items-center">
              <NavLink id="dashboard" label="Dashboard" />
              <NavLink id="receiveStock" label="Receive Stock" />
              <NavLink id="sales" label="Sales" />
              <NavLink id="salesHistory" label="History" />
              
              <div className="h-6 w-px bg-blue-200 mx-2"></div>

              <Dropdown 
                  label="Accounting" 
                  items={accountingItems} 
                  isOpen={activeDropdown === 'accounting'} 
                  onToggle={() => toggleDropdown('accounting')}
              />
              
              <Dropdown 
                  label="Reports" 
                  items={reportItems} 
                  isOpen={activeDropdown === 'reports'} 
                  onToggle={() => toggleDropdown('reports')}
              />

              <Dropdown 
                  label="Setup" 
                  items={setupItems} 
                  isOpen={activeDropdown === 'setup'} 
                  onToggle={() => toggleDropdown('setup')}
              />
            </div>
          </div>

          {/* Right Side: Home, User & Logout */}
          <div className="hidden lg:flex items-center space-x-4">
              {/* Home Button */}
              <button 
                  onClick={() => handleNavClick('dashboard')}
                  title="Go to Shop Dashboard"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-bold transition-all border border-transparent ${
                      activeView === 'dashboard' 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-primary hover:bg-blue-100 hover:border-blue-200'
                  }`}
              >
                  <HomeIcon />
                  Shop Home
              </button>

              <div className="h-8 w-px bg-blue-200"></div>

              {(isManager || (isHO && multiShopAccess)) && (
                  <button 
                    onClick={() => switchShop(null)}
                    className="flex items-center text-xs font-bold text-blue-700 bg-blue-100 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-200 transition-all shadow-sm"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                      </svg>
                      {isManager ? 'MANAGER PORTAL' : 'SWITCH SHOP'}
                  </button>
              )}

              <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{currentUser?.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{isHO ? 'Administrator' : isManager ? 'Manager' : 'Operator'}</p>
              </div>
              <button
                onClick={logout}
                className="bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-gray-200 hover:border-red-200 shadow-sm"
              >
                Logout
              </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-primary hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Drawer) - Keep white for contrast */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white absolute w-full z-50 shadow-lg">
          <div className="pt-2 pb-3 space-y-1 px-2">
            <button 
                onClick={() => handleNavClick('dashboard')} 
                className="flex items-center w-full text-left px-3 py-3 rounded-md text-base font-bold text-primary bg-blue-50 border-l-4 border-primary"
            >
                <HomeIcon />
                Shop Dashboard
            </button>
            
            {(isManager || (isHO && multiShopAccess)) && (
                <button 
                    onClick={() => switchShop(null)}
                    className="flex items-center w-full text-left px-3 py-3 text-blue-700 font-bold bg-blue-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                    </svg>
                    {isManager ? 'GO TO MANAGER PORTAL' : 'SWITCH LOCATION'}
                </button>
            )}

            <div className="h-px bg-gray-100 my-2"></div>
            <button onClick={() => handleNavClick('receiveStock')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Receive Stock</button>
            <button onClick={() => handleNavClick('sales')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Sales</button>
            <button onClick={() => handleNavClick('salesHistory')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">History</button>
            
            <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Accounting</p>
                {accountingItems.map(i => (
                    <button key={i.id} onClick={() => handleNavClick(i.id as ShopView)} className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 pl-6">{i.label}</button>
                ))}
            </div>

            <div className="pt-2 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reports & Ledgers</p>
                {reportItems.map(i => (
                    <button key={i.id} onClick={() => handleNavClick(i.id as ShopView)} className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 pl-6">{i.label}</button>
                ))}
            </div>

            <div className="pt-2 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Setup</p>
                {setupItems.map(i => (
                    <button key={i.id} onClick={() => handleNavClick(i.id as ShopView)} className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 pl-6">{i.label}</button>
                ))}
            </div>
          </div>
          <div className="pt-4 pb-4 border-t border-gray-200 px-4 bg-gray-50">
            <div className="flex items-center">
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{currentUser?.name}</div>
                <div className="text-sm font-medium text-gray-500">{role}</div>
              </div>
              <button
                onClick={logout}
                className="ml-auto bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-md text-sm font-medium shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default ShopSidebar;
