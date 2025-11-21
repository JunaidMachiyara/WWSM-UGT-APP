
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

type ModalType = 'STOCK' | 'REVENUE' | 'EXPENSE' | 'PROFIT' | 'SHIPMENTS' | 'ALERTS';

interface DetailModalState {
    isOpen: boolean;
    type: ModalType;
    shopId: string;
    shopName: string;
}

const Dashboard: React.FC = () => {
  const { transactions, shops, products, shipments, alerts, warehouses } = useAppContext();
  const [modalState, setModalState] = useState<DetailModalState | null>(null);

  // --- KPI Calculations ---

  // 1. Financials
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

  // 2. Global Inventory Valuation
  const inventoryValuation = useMemo(() => {
      let totalCostValue = 0;
      let totalRetailValue = 0;

      const productMap = products.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
      }, {} as Record<string, typeof products[0]>);

      const stockMap: Record<string, number> = {}; 
      
      transactions.forEach(t => {
          if (t.productId && t.quantity) {
              if (!stockMap[t.productId]) stockMap[t.productId] = 0;
              if (t.type === TransactionType.IMPORT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.STOCK_TRANSFER_IN) {
                  stockMap[t.productId] += t.quantity;
              }
              if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
                  stockMap[t.productId] -= t.quantity;
              }
          }
      });

      Object.entries(stockMap).forEach(([pid, qty]) => {
          if (qty > 0 && productMap[pid]) {
              totalCostValue += qty * productMap[pid].hoCost;
              totalRetailValue += qty * productMap[pid].minSalePrice;
          }
      });

      return { cost: totalCostValue, retail: totalRetailValue };
  }, [transactions, products]);

  // 3. Shop-wise Metrics (Last 30 Days)
  const shopMetrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const productCostMap = products.reduce((acc, p) => {
        acc[p.id] = p.hoCost;
        return acc;
    }, {} as Record<string, number>);

    const metrics: Record<string, {
        id: string;
        name: string;
        revenue: number;
        expenses: number;
        cogs: number;
        stockValue: number;
    }> = {};

    shops.forEach(s => {
        if (s.isActive) {
            metrics[s.id] = {
                id: s.id,
                name: s.name,
                revenue: 0,
                expenses: 0,
                cogs: 0,
                stockValue: 0
            };
        }
    });

    const locToShop: Record<string, string> = {};
    shops.forEach(s => locToShop[s.id] = s.id);
    warehouses.forEach(w => locToShop[w.id] = w.shopId);

    const stockMap: Record<string, Record<string, number>> = {};

    transactions.forEach(t => {
        if (t.productId && t.locationId) {
             if (!stockMap[t.locationId]) stockMap[t.locationId] = {};
             const qty = t.quantity || 0;
             
             if (t.type === TransactionType.IMPORT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.STOCK_TRANSFER_IN) {
                 stockMap[t.locationId][t.productId] = (stockMap[t.locationId][t.productId] || 0) + qty;
             } else if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
                 stockMap[t.locationId][t.productId] = (stockMap[t.locationId][t.productId] || 0) - qty;
             }
        }

        const tDate = new Date(t.date);
        if (tDate >= thirtyDaysAgo && t.shopId && metrics[t.shopId]) {
            if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                metrics[t.shopId].revenue += (t.amount * (t.quantity || 1));
                if (t.productId && productCostMap[t.productId]) {
                    metrics[t.shopId].cogs += (productCostMap[t.productId] * (t.quantity || 1));
                }
            } else if (t.type === TransactionType.EXPENSE) {
                metrics[t.shopId].expenses += t.amount;
            } else if (t.type === TransactionType.SALES_RETURN) {
                 metrics[t.shopId].revenue -= (t.amount * (t.quantity || 1));
                 if (t.productId && productCostMap[t.productId]) {
                    metrics[t.shopId].cogs -= (productCostMap[t.productId] * (t.quantity || 1));
                 }
            }
        }
    });

    Object.entries(stockMap).forEach(([locId, prods]) => {
        const shopId = locToShop[locId];
        if (shopId && metrics[shopId]) {
            Object.entries(prods).forEach(([prodId, qty]) => {
                if (qty > 0 && productCostMap[prodId]) {
                    metrics[shopId].stockValue += (qty * productCostMap[prodId]);
                }
            });
        }
    });

    return Object.values(metrics);
  }, [transactions, shops, products, warehouses]);


  // 3. Logistics
  const pendingShipmentsCount = shipments.filter(s => s.status === ShipmentStatus.PENDING).length;
  const activeStockAlerts = alerts.filter(a => a.type === AlertType.STOCK_DISCREPANCY && !a.isRead).length;

  // --- Detail Modal Data Logic ---
  const getModalContent = () => {
      if (!modalState) return null;
      
      const { type, shopId, shopName } = modalState;
      
      if (type === 'STOCK') {
          // Aggregate stock for this shop + its warehouses
          const relevantLocIds = [shopId, ...warehouses.filter(w => w.shopId === shopId).map(w => w.id)];
          const productStock: Record<string, number> = {};
          
          transactions.forEach(t => {
              if (t.productId && t.locationId && relevantLocIds.includes(t.locationId)) {
                  const qty = t.quantity || 0;
                  if (t.type === TransactionType.IMPORT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.STOCK_TRANSFER_IN) {
                      productStock[t.productId] = (productStock[t.productId] || 0) + qty;
                  } else if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
                      productStock[t.productId] = (productStock[t.productId] || 0) - qty;
                  }
              }
          });

          const stockData = Object.entries(productStock)
              .filter(([_, qty]) => qty !== 0)
              .map(([pid, qty]) => {
                  const product = products.find(p => p.id === pid);
                  return {
                      name: product?.name || 'Unknown',
                      category: product?.category || '-',
                      qty,
                      cost: product?.hoCost || 0,
                      total: qty * (product?.hoCost || 0)
                  };
              })
              .sort((a, b) => b.total - a.total);

          return (
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {stockData.map((item, idx) => (
                              <tr key={idx}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-500">{item.category}</td>
                                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">{item.qty}</td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-500">${item.cost.toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">${item.total.toLocaleString()}</td>
                              </tr>
                          ))}
                          {stockData.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-gray-500">No stock data.</td></tr>}
                      </tbody>
                  </table>
              </div>
          );
      }

      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      if (type === 'REVENUE') {
          const sales = transactions
              .filter(t => t.shopId === shopId && (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) && new Date(t.date) >= thirtyDaysAgo)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          return (
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {sales.map((t, idx) => {
                              const product = products.find(p => p.id === t.productId);
                              return (
                                  <tr key={idx}>
                                      <td className="px-4 py-2 text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{t.invoiceId || '-'}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">{product?.name || 'Unknown'}</td>
                                      <td className="px-4 py-2 text-sm text-right text-gray-500">{t.quantity}</td>
                                      <td className="px-4 py-2 text-sm text-right font-bold text-green-600">${(t.amount * (t.quantity || 1)).toLocaleString()}</td>
                                  </tr>
                              );
                          })}
                          {sales.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-gray-500">No revenue records in last 30 days.</td></tr>}
                      </tbody>
                  </table>
              </div>
          );
      }

      if (type === 'EXPENSE') {
        const expenses = transactions
            .filter(t => t.shopId === shopId && t.type === TransactionType.EXPENSE && new Date(t.date) >= thirtyDaysAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {expenses.map((t, idx) => (
                            <tr key={idx}>
                                <td className="px-4 py-2 text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{t.description}</td>
                                <td className="px-4 py-2 text-sm text-right font-bold text-red-600">${t.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                         {expenses.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-500">No expense records in last 30 days.</td></tr>}
                    </tbody>
                </table>
            </div>
        );
      }

      if (type === 'PROFIT') {
           // Simple Summary for Profit
           const metrics = shopMetrics.find(m => m.id === shopId);
           if (!metrics) return null;
           
           return (
               <div className="p-4">
                   <p className="text-sm text-gray-600 mb-4">Profit breakdown calculation for the last 30 days.</p>
                   <div className="space-y-3">
                       <div className="flex justify-between items-center border-b pb-2">
                           <span className="font-medium text-gray-700">Total Revenue</span>
                           <span className="font-bold text-green-600">${metrics.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                       </div>
                       <div className="flex justify-between items-center border-b pb-2">
                           <span className="font-medium text-gray-700">Cost of Goods Sold (COGS)</span>
                           <span className="font-bold text-red-600">-${metrics.cogs.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                       </div>
                        <div className="flex justify-between items-center border-b pb-2 bg-gray-50 p-2 rounded">
                           <span className="font-bold text-gray-800">Gross Profit</span>
                           <span className="font-bold text-gray-800">${(metrics.revenue - metrics.cogs).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                       </div>
                       <div className="flex justify-between items-center border-b pb-2">
                           <span className="font-medium text-gray-700">Operating Expenses</span>
                           <span className="font-bold text-red-600">-${metrics.expenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                       </div>
                        <div className="flex justify-between items-center pt-2">
                           <span className="text-lg font-bold text-primary">Net Profit</span>
                           <span className={`text-lg font-bold ${metrics.revenue - metrics.cogs - metrics.expenses >= 0 ? 'text-primary' : 'text-red-600'}`}>
                               ${(metrics.revenue - metrics.cogs - metrics.expenses).toLocaleString(undefined, {minimumFractionDigits: 2})}
                           </span>
                       </div>
                   </div>
               </div>
           )
      }

      if (type === 'SHIPMENTS') {
        const pending = shipments.filter(s => s.status === ShipmentStatus.PENDING).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return (
             <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {pending.map((s) => {
                              const shopName = shops.find(shop => shop.id === s.shopId)?.name || 'Unknown';
                              const totalValue = s.items.reduce((acc, item) => acc + (item.landedCost * item.expectedQuantity), 0) + s.freightCost + s.clearingCost + s.customExpenseCost + s.expectedDuty;
                              return (
                                  <tr key={s.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">#{s.id}</td>
                                      <td className="px-4 py-2 text-sm text-gray-500">{shopName}</td>
                                      <td className="px-4 py-2 text-sm text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                                      <td className="px-4 py-2 text-sm text-right text-gray-900">{s.items.length}</td>
                                      <td className="px-4 py-2 text-sm text-right font-bold text-gray-900">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                  </tr>
                              );
                          })}
                          {pending.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-gray-500">No pending shipments.</td></tr>}
                      </tbody>
                  </table>
              </div>
        );
      }

      if (type === 'ALERTS') {
        const activeAlerts = alerts.filter(a => a.type === AlertType.STOCK_DISCREPANCY && !a.isRead).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
         return (
             <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {activeAlerts.map((a) => {
                              const shopName = shops.find(shop => shop.id === a.shopId)?.name || 'Unknown';
                              return (
                                  <tr key={a.id}>
                                      <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">{new Date(a.date).toLocaleString()}</td>
                                      <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">{shopName}</td>
                                      <td className="px-4 py-2 text-sm text-red-600 font-medium">{a.message}</td>
                                      <td className="px-4 py-2 text-sm text-gray-500">
                                          {a.context ? (
                                              <div className="text-xs">
                                                  {a.context.invoiceId && <p>Inv: #{a.context.invoiceId}</p>}
                                                  {a.context.productName && <p>Prod: {a.context.productName}</p>}
                                                  {a.context.stockQty !== undefined && <p>Stock: {a.context.stockQty}</p>}
                                              </div>
                                          ) : '-'}
                                      </td>
                                  </tr>
                              );
                          })}
                          {activeAlerts.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-500">No active alerts.</td></tr>}
                      </tbody>
                  </table>
              </div>
        );
      }

      return null;
  };


  return (
    <div className="space-y-8 relative">
      {/* Section 1: Executive Overview (Key Financials) */}
      <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Executive Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardCard 
                title="Total Revenue" 
                value={`$${totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                icon={<RevenueIcon />} 
                color="bg-blue-600" 
            />
            <DashboardCard 
                title="Net Profit" 
                value={`$${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                icon={<ProfitIcon />} 
                color={netProfit >= 0 ? "bg-green-600" : "bg-red-600"} 
            />
             <DashboardCard 
                title="Total Expenses" 
                value={`$${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
                icon={<ExpenseIcon />} 
                color="bg-red-500" 
            />
             <div className="bg-white rounded-lg shadow-lg p-6 flex items-center justify-between transform hover:scale-105 transition-transform duration-300">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Profit Margin</p>
                    <p className={`text-2xl font-bold ${Number(profitMargin) > 20 ? 'text-green-600' : 'text-yellow-600'}`}>{profitMargin}%</p>
                    <p className="text-xs text-gray-400">Net Income / Revenue</p>
                </div>
                 <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    %
                 </div>
            </div>
          </div>
      </div>

      {/* Section 2: Inventory & Logistics Insights */}
      <div>
         <h2 className="text-xl font-bold text-gray-800 mb-4">Supply Chain Insights</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 text-white">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm">Total Inventory Value (Cost)</p>
                        <h3 className="text-3xl font-bold">${inventoryValuation.cost.toLocaleString()}</h3>
                    </div>
                    <InventoryIcon />
                </div>
                <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Potential Retail Value</span>
                        <span className="text-green-400 font-semibold">${inventoryValuation.retail.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                         <span className="text-gray-400">Potential ROI</span>
                         <span className="text-blue-400 font-semibold">
                            {inventoryValuation.cost > 0 
                                ? (((inventoryValuation.retail - inventoryValuation.cost) / inventoryValuation.cost) * 100).toFixed(0) 
                                : 0}%
                         </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Pending Logistics</p>
                        <p className="text-2xl font-bold text-gray-800">{pendingShipmentsCount}</p>
                        <p className="text-xs text-gray-400 mt-1">Shipments in transit to shops</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-full">
                        <LogisticsIcon />
                    </div>
                </div>
                 <div className="mt-4">
                     <button 
                        onClick={() => setModalState({ isOpen: true, type: 'SHIPMENTS', shopId: '', shopName: 'Pending Shipments' })}
                        className="text-sm text-orange-600 font-semibold hover:text-orange-800"
                     >
                         View Shipments &rarr;
                     </button>
                 </div>
            </div>

             <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">System Alerts</p>
                        <p className="text-2xl font-bold text-gray-800">{activeStockAlerts}</p>
                        <p className="text-xs text-gray-400 mt-1">Unresolved stock discrepancies</p>
                    </div>
                     <div className="bg-red-100 p-3 rounded-full text-red-600">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                </div>
                 <div className="mt-4">
                     <button 
                        onClick={() => setModalState({ isOpen: true, type: 'ALERTS', shopId: '', shopName: 'System Alerts' })}
                        className="text-sm text-red-600 font-semibold hover:text-red-800"
                     >
                         View Alerts &rarr;
                     </button>
                 </div>
            </div>
         </div>
      </div>

      {/* Section 3: Analytics & Visualizations */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Analytics & Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
                 <SalesTrendChart transactions={transactions} />
            </div>
            <div className="lg:col-span-1">
                 <CategoryDistributionChart transactions={transactions} products={products} />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2">
                 <ShopPerformanceChart transactions={transactions} shops={shops} />
            </div>
            <div className="lg:col-span-1">
                 <TopProductsChart transactions={transactions} products={products} />
            </div>
        </div>
      </div>
      
      {/* Section 4: Shop-wise Detailed Report */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Shop Performance Report (Last 30 Days)</h3>
            <span className="text-xs text-gray-500">Click figures to view details</span>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock Value (Cost)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue (30d)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses (30d)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Profit (30d)</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {shopMetrics.length > 0 ? shopMetrics.map(m => {
                        const profit = m.revenue - m.cogs - m.expenses;
                        return (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.name}</td>
                            
                            <td 
                                onClick={() => setModalState({ isOpen: true, type: 'STOCK', shopId: m.id, shopName: m.name })}
                                className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                                title="Click to view stock details"
                            >
                                ${m.stockValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            
                            <td 
                                onClick={() => setModalState({ isOpen: true, type: 'REVENUE', shopId: m.id, shopName: m.name })}
                                className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-semibold cursor-pointer hover:text-blue-800 hover:underline"
                                title="Click to view revenue details"
                            >
                                ${m.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            
                            <td 
                                onClick={() => setModalState({ isOpen: true, type: 'EXPENSE', shopId: m.id, shopName: m.name })}
                                className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 cursor-pointer hover:text-red-800 hover:underline"
                                title="Click to view expense details"
                            >
                                ${m.expenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            
                            <td 
                                onClick={() => setModalState({ isOpen: true, type: 'PROFIT', shopId: m.id, shopName: m.name })}
                                className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold cursor-pointer hover:underline ${profit >= 0 ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
                                title="Click to view profit breakdown"
                            >
                                ${profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                        </tr>
                    )}) : (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">No shop data available.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Details Modal */}
      {modalState && modalState.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-lg z-10">
                      <div>
                          <h3 className="text-xl font-bold text-gray-800">{modalState.shopName} Details</h3>
                          <p className="text-sm text-gray-500">
                              {modalState.type === 'STOCK' && 'Current Inventory Breakdown'}
                              {modalState.type === 'REVENUE' && 'Sales Transactions (Last 30 Days)'}
                              {modalState.type === 'EXPENSE' && 'Expense Breakdown (Last 30 Days)'}
                              {modalState.type === 'PROFIT' && 'Profit & Loss Summary (Last 30 Days)'}
                              {modalState.type === 'SHIPMENTS' && 'Pending Shipments to Shops'}
                              {modalState.type === 'ALERTS' && 'Unresolved System Alerts'}
                          </p>
                      </div>
                      <button onClick={() => setModalState(null)} className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      {getModalContent()}
                  </div>
                  <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-lg">
                      <button onClick={() => setModalState(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium">Close</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;
