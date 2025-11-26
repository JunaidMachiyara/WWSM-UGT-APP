
import React, { useState, useEffect } from 'react';
import { ShopView } from './ShopDashboard';
import { useAppContext } from '../../context/AppContext';

// SVG Icons
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ReceiveStockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>;
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const CalculatorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

interface ShopSidebarProps {
  activeView: ShopView;
  setView: (view: ShopView) => void;
}

const ShopSidebar: React.FC<ShopSidebarProps> = ({ activeView, setView }) => {
  const { shops, shopId } = useAppContext();
  const currentShop = shops.find(s => s.id === shopId);
  
  const isLedgersActive = ['supplierLedger', 'clearingAgentLedger', 'customsLedger', 'dutyLedger', 'reports-ledgers', 'cashLedger', 'bankLedger'].includes(activeView);
  const isReportsActive = activeView.startsWith('reports-') || ['inventory'].includes(activeView) || isLedgersActive;
  const isAccountingActive = ['receiptVoucher', 'paymentVoucher', 'salesReturn', 'accountManagement', 'expenses', 'customerAdvances'].includes(activeView);
  const isSetupActive = ['customerManagement', 'warehouseManagement', 'assetManagement', 'openingStock'].includes(activeView);

  const [reportsOpen, setReportsOpen] = useState(isReportsActive);
  const [ledgersOpen, setLedgersOpen] = useState(isLedgersActive);
  const [accountingOpen, setAccountingOpen] = useState(isAccountingActive);
  const [setupOpen, setSetupOpen] = useState(isSetupActive);
  
  useEffect(() => {
    if (isLedgersActive) {
        setLedgersOpen(true);
        setReportsOpen(true);
    } else if (isReportsActive) {
        setReportsOpen(true);
    }
    if (isAccountingActive) setAccountingOpen(true);
    if (isSetupActive) setSetupOpen(true);
  }, [activeView, isReportsActive, isLedgersActive, isAccountingActive, isSetupActive]);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'receiveStock', label: 'Receive Stock', icon: <ReceiveStockIcon /> },
    { id: 'sales', label: 'Record Sales', icon: <SalesIcon /> },
  ];

  const accountingItems = [
      { id: 'receiptVoucher' as ShopView, label: 'Receipt Voucher' },
      { id: 'paymentVoucher' as ShopView, label: 'Payment Voucher' },
      { id: 'salesReturn' as ShopView, label: 'Sales Returns' },
      { id: 'customerAdvances' as ShopView, label: 'Customer Advances' },
      { id: 'expenses' as ShopView, label: 'Record Expenses' },
      { id: 'accountManagement' as ShopView, label: 'Cash & Bank' },
  ];
  
  const directReportItems = [
      { id: 'inventory' as ShopView, label: 'Inventory Stock' },
      { id: 'reports-income' as ShopView, label: 'Income Statement' },
  ];

  const ledgerItems = [
      { id: 'reports-ledgers' as ShopView, label: 'Customer Ledgers' },
      { id: 'supplierLedger' as ShopView, label: 'Supplier Ledger' },
      { id: 'cashLedger' as ShopView, label: 'Cash Ledgers' },
      { id: 'bankLedger' as ShopView, label: 'Bank Ledgers' },
      { id: 'clearingAgentLedger' as ShopView, label: 'Clearing Agent Report' },
      { id: 'customsLedger' as ShopView, label: 'Customs Report' },
      { id: 'dutyLedger' as ShopView, label: 'Duty Report' },
  ];

  const setupItems = [
      { id: 'openingStock' as ShopView, label: 'Opening Stock' },
      { id: 'customerManagement' as ShopView, label: 'Customers' },
      { id: 'warehouseManagement' as ShopView, label: 'Warehouse Mgt' },
      { id: 'assetManagement' as ShopView, label: 'Asset Management' },
  ];

  const baseStyle = "flex items-center px-4 py-3 transition-colors duration-200 cursor-pointer";
  const activeStyle = "bg-primary-dark text-white font-bold";
  const inactiveStyle = "text-gray-600 hover:bg-primary-dark hover:text-white";

  const subMenuStyle = "flex items-center pl-12 pr-4 py-2 text-sm transition-colors duration-200 cursor-pointer";
  const activeSubMenuStyle = "bg-primary text-white font-semibold";
  const inactiveSubMenuStyle = "text-gray-500 hover:bg-primary-dark hover:text-white";
  
  const nestedSubMenuStyle = "flex items-center pl-16 pr-4 py-2 text-sm transition-colors duration-200 cursor-pointer";


  return (
    <aside className="w-64 h-full bg-white text-gray-800 flex flex-col border-r overflow-y-auto">
      <div className="h-20 flex flex-col items-center justify-center border-b text-center px-2 flex-shrink-0">
        <h2 className="text-xl font-bold text-primary">WWSM_UGT</h2>
        <p className="text-sm text-gray-500 truncate">{currentShop?.name}</p>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {mainNavItems.map(item => (
          <a
            key={item.id}
            className={`${baseStyle} ${activeView === item.id ? activeStyle : inactiveStyle}`}
            onClick={() => setView(item.id as ShopView)}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </a>
        ))}
        
        {/* Accounting collapsible menu */}
        <div>
            <div
                className={`${baseStyle} justify-between ${isAccountingActive ? activeStyle : inactiveStyle}`}
                onClick={() => setAccountingOpen(!accountingOpen)}
            >
                <div className="flex items-center">
                    <CalculatorIcon />
                    <span className="ml-3">Accounting</span>
                </div>
                <div className={`transition-transform duration-300 ${accountingOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </div>
            {accountingOpen && (
                <div className="py-1 bg-gray-50">
                    {accountingItems.map(item => (
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
                    {/* Direct Reports */}
                    {directReportItems.map(item => (
                        <a
                            key={item.id}
                            className={`${subMenuStyle} ${activeView === item.id ? activeSubMenuStyle : inactiveSubMenuStyle}`}
                            onClick={() => setView(item.id)}
                        >
                            {item.label}
                        </a>
                    ))}
                    
                    {/* Nested Ledgers Section */}
                    <div>
                        <div
                             className={`${subMenuStyle} justify-between ${isLedgersActive ? 'text-primary font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                             onClick={(e) => {
                                 e.stopPropagation();
                                 setLedgersOpen(!ledgersOpen);
                             }}
                        >
                            <span>Ledgers</span>
                             <div className={`transition-transform duration-300 ${ledgersOpen ? 'rotate-180' : ''}`}>
                                <ChevronDownIcon />
                            </div>
                        </div>
                        {ledgersOpen && (
                            <div className="bg-gray-100 border-l-4 border-gray-200 ml-6">
                                {ledgerItems.map(item => (
                                    <a
                                        key={item.id}
                                        className={`flex items-center pl-6 pr-4 py-2 text-sm transition-colors duration-200 cursor-pointer ${activeView === item.id ? 'bg-primary text-white font-semibold' : 'text-gray-500 hover:bg-gray-200'}`}
                                        onClick={() => setView(item.id)}
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>

        {/* Setup collapsible menu */}
        <div>
            <div
                className={`${baseStyle} justify-between ${isSetupActive ? activeStyle : inactiveStyle}`}
                onClick={() => setSetupOpen(!setupOpen)}
            >
                <div className="flex items-center">
                    <SettingsIcon />
                    <span className="ml-3">Setup</span>
                </div>
                <div className={`transition-transform duration-300 ${setupOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </div>
            {setupOpen && (
                <div className="py-1 bg-gray-50">
                    {setupItems.map(item => (
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