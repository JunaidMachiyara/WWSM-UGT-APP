
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType, ShipmentStatus, AlertType } from '../../../types';
import DashboardCard from '../../../components/DashboardCard';
import ShopPerformanceChart from '../../../components/charts/ShopPerformanceChart';
import SalesTrendChart from '../../../components/charts/SalesTrendChart';
import CategoryDistributionChart from '../../../components/charts/CategoryDistributionChart';
import TopProductsChart from '../../../components/charts/TopProductsChart';

// Icons
const RevenueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;
const InventoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const ProfitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const ExpenseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LogisticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;

type ModalType = 'STOCK' | 'REVENUE' | 'EXPENSE' | 'PROFIT' | 'SHIPMENTS' | 'ALERTS' | 'PRICE_VIOLATIONS';

interface DetailModalState {
    isOpen: boolean;
    type: ModalType;
    shopId: string;
    shopName: string;
}

const Dashboard: React.FC = () => {
  const { transactions, shops, products, shipments, alerts, warehouses } = useAppContext();
  const [modalState, setModalState] = useState<DetailModalState | null>(null);

  // Helper for compact formatting (e.g. 1.5K, 2M)
  const formatCompact = (num: number) => {
    return '$' + new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
  };

  // --- KPI Calculations ---
  const totalSales = useMemo(() => 
    transactions
      .filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
      .reduce((sum, t) => sum + t.amount * (t.quantity || 1), 0),
    [transactions]
  );

  const totalExpenses = useMemo(() => 
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const costOfGoodsSold = useMemo(() => {
    const sales = transactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE);
    return sales.reduce((sum, t) => {
        const product = products.find(p => p.id === t.productId);
        return sum + (product ? product.hoCost * (t.quantity || 1) : 0);
    }, 0);
  }, [transactions, products]);

  const grossProfit = totalSales - costOfGoodsSold;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

  const inventoryValuation = useMemo(() => {
      let totalCostValue = 0;
      const stockMap: Record<string, number> = {}; 
      transactions.forEach(t => {
          if (t.productId && t.quantity) {
              if (!stockMap[t.productId]) stockMap[t.productId] = 0;
              if (t.type === TransactionType.IMPORT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.OPENING_STOCK) {
                  stockMap[t.productId] += t.quantity;
              }
              if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
                  stockMap[t.productId] -= t.quantity;
              }
          }
      });
      Object.entries(stockMap).forEach(([pid, qty]) => {
          const p = products.find(prod => prod.id === pid);
          if (qty > 0 && p) totalCostValue += qty * p.hoCost;
      });
      return totalCostValue;
  }, [transactions, products]);

  // Alert Counts
  const pendingShipmentsCount = shipments.filter(s => s.status === ShipmentStatus.PENDING).length;
  const activeStockAlerts = alerts.filter(a => a.type === AlertType.STOCK_DISCREPANCY && !a.isRead).length;
  const activePriceViolations = alerts.filter(a => a.type === AlertType.PRICE_VIOLATION && !a.isRead).length;

  const getModalContent = () => {
      if (!modalState) return null;
      const { type } = modalState;

      if (type === 'PRICE_VIOLATIONS') {
        const violations = alerts.filter(a => a.type === AlertType.PRICE_VIOLATION && !a.isRead).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return (
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                         <tr>
                             <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                             <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Violation Message</th>
                             <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Inv #</th>
                         </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                         {violations.map((a) => (
                             <tr key={a.id}>
                                 <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">{new Date(a.date).toLocaleDateString()}</td>
                                 <td className="px-4 py-2 text-sm text-red-600 font-bold">{a.message}</td>
                                 <td className="px-4 py-2 text-sm text-right text-gray-900 font-mono">{a.context?.invoiceId || '-'}</td>
                             </tr>
                         ))}
                         {violations.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-500">No active violations.</td></tr>}
                     </tbody>
                 </table>
             </div>
        );
      }
      
      // ... (Other modal content remains same as previous state)
      return <p className="text-gray-500 italic">Details viewing available in "Notifications & Alerts" page.</p>;
  };

  return (
    <div className="space-y-8 relative">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="Total Revenue" value={formatCompact(totalSales)} icon={<RevenueIcon />} color="bg-blue-600" />
        <DashboardCard title="Net Profit" value={formatCompact(netProfit)} icon={<ProfitIcon />} color={netProfit >= 0 ? "bg-green-600" : "bg-red-600"} />
        <DashboardCard title="Total Expenses" value={formatCompact(totalExpenses)} icon={<ExpenseIcon />} color="bg-red-500" />
        <div className="bg-white rounded-lg shadow-lg p-6 flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">Profit Margin</p>
                <p className={`text-2xl font-bold ${Number(profitMargin) > 20 ? 'text-green-600' : 'text-yellow-600'}`}>{profitMargin}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">%</div>
        </div>
      </div>

      {/* Critical Alerts Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* PRICE VIOLATION CARD - IMMEDIATE VISIBILITY */}
         <div className={`rounded-lg shadow-lg p-6 border-l-8 transition-all transform hover:scale-105 ${activePriceViolations > 0 ? 'bg-red-50 border-red-600 animate-pulse' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-sm font-bold uppercase tracking-wider ${activePriceViolations > 0 ? 'text-red-700' : 'text-gray-500'}`}>Price Violations</p>
                    <p className={`text-4xl font-black ${activePriceViolations > 0 ? 'text-red-600' : 'text-gray-300'}`}>{activePriceViolations}</p>
                </div>
                <div className={`p-4 rounded-full ${activePriceViolations > 0 ? 'bg-red-600 shadow-lg' : 'bg-gray-100'}`}>
                    <RevenueIcon />
                </div>
            </div>
            <button 
                disabled={activePriceViolations === 0}
                onClick={() => setModalState({ isOpen: true, type: 'PRICE_VIOLATIONS', shopId: '', shopName: 'Active Price Violations' })}
                className={`mt-4 text-sm font-bold flex items-center ${activePriceViolations > 0 ? 'text-red-600 hover:text-red-800' : 'text-gray-400 cursor-not-allowed'}`}
            >
                {activePriceViolations > 0 ? 'REVIEW VIOLATIONS NOW →' : 'No violations detected'}
            </button>
         </div>

         <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Pending Logistics</p>
                    <p className="text-2xl font-bold text-gray-800">{pendingShipmentsCount}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full text-orange-600"><LogisticsIcon /></div>
            </div>
         </div>

         <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Stock Alerts</p>
                    <p className="text-2xl font-bold text-gray-800">{activeStockAlerts}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full text-blue-600"><WarningIcon /></div>
            </div>
         </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesTrendChart transactions={transactions} />
        <ShopPerformanceChart transactions={transactions} shops={shops} />
      </div>

      {/* Details Modal */}
      {modalState && modalState.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                  <div className="p-6 border-b border-red-200 flex justify-between items-center sticky top-0 bg-white rounded-t-lg z-10">
                      <div>
                          <h3 className="text-xl font-bold text-red-600">{modalState.shopName}</h3>
                          <p className="text-sm text-gray-500 font-medium">Managers must review these occurrences to prevent revenue leakage.</p>
                      </div>
                      <button onClick={() => setModalState(null)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      {getModalContent()}
                  </div>
                  <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-lg">
                      <button onClick={() => setModalState(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-bold">Dismiss</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
