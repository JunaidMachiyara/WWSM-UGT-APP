
import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';
import DashboardCard from '../../../components/DashboardCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const ExpenseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;
const ProfitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const InventoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const WeightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;
const BalanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;

const Dashboard: React.FC = () => {
  const { transactions, shopId, products, formatCurrency, currentShopCurrency } = useAppContext();
  const shopTransactions = transactions.filter(t => t.shopId === shopId);

  // Helper for compact formatting in Shop Currency
  const formatCompact = (amountInBase: number) => {
      const localAmount = amountInBase * (currentShopCurrency?.rate || 1);
      return (currentShopCurrency?.symbol || '$') + new Intl.NumberFormat('en-US', {
          notation: "compact",
          maximumFractionDigits: 1
      }).format(localAmount);
  };

  // --- Date Range Calculations ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // --- Financial Calculations (Base Currency) ---
  const allSalesTrans = shopTransactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE);
  
  const totalSalesAllTime = allSalesTrans.reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
  const totalReturnsAllTime = shopTransactions.filter(t => t.type === TransactionType.SALES_RETURN).reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
  const netSalesAllTime = totalSalesAllTime - totalReturnsAllTime;

  // KPIs
  const todaySales = useMemo(() => {
    return allSalesTrans
        .filter(t => new Date(t.date) >= todayStart)
        .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
  }, [allSalesTrans]);

  const monthSales = useMemo(() => {
    return allSalesTrans
        .filter(t => new Date(t.date) >= monthStart)
        .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
  }, [allSalesTrans]);

  const todayCreditSales = useMemo(() => {
    return shopTransactions
        .filter(t => t.type === TransactionType.CREDIT_SALE && new Date(t.date) >= todayStart)
        .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
  }, [shopTransactions]);

  const totalReceivables = useMemo(() => {
      let balance = 0;
      shopTransactions.forEach(t => {
          if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
              balance += (t.amount * (t.quantity || 1));
          } else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.ADVANCE_USAGE) {
              const val = (t.type === TransactionType.SALES_RETURN) ? (t.amount * (t.quantity || 1)) : t.amount;
              balance -= val;
          }
      });
      return Math.max(0, balance);
  }, [shopTransactions]);
  
  const totalExpenses = shopTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

  // Profit Logic (Net Sales - COGS - Expenses)
  let cogsForSales = 0;
  allSalesTrans.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if(product) cogsForSales += product.hoCost * (sale.quantity || 1);
  });

  const returnTransactions = shopTransactions.filter(t => t.type === TransactionType.SALES_RETURN);
  let cogsForReturns = 0;
  returnTransactions.forEach(ret => {
      const product = products.find(p => p.id === ret.productId);
      if (product) cogsForReturns += product.hoCost * (ret.quantity || 1);
  });

  const netCogs = cogsForSales - cogsForReturns;
  const netProfit = netSalesAllTime - netCogs - totalExpenses;

  // --- Inventory Calculations ---
  const stockStats = useMemo(() => {
      const stockMap: Record<string, number> = {};
      shopTransactions.forEach(t => {
          const qty = t.quantity || 0;
          if (!t.productId) return;
          
          switch (t.type) {
              case TransactionType.IMPORT:
              case TransactionType.SALES_RETURN:
              case TransactionType.OPENING_STOCK:
              case TransactionType.STOCK_TRANSFER_IN:
                  stockMap[t.productId] = (stockMap[t.productId] || 0) + qty;
                  break;
              case TransactionType.CASH_SALE:
              case TransactionType.CREDIT_SALE:
              case TransactionType.STOCK_TRANSFER_OUT:
                  stockMap[t.productId] = (stockMap[t.productId] || 0) - qty;
                  break;
          }
      });

      let worth = 0;
      let weight = 0;

      Object.entries(stockMap).forEach(([pid, qty]) => {
          if (qty > 0) {
              const p = products.find(prod => prod.id === pid);
              if (p) {
                  worth += qty * p.hoCost;
                  weight += qty * (p.weight || 0);
              }
          }
      });

      return { worth, weight };
  }, [shopTransactions, products]);


  // Data for chart
  const salesByProduct = allSalesTrans.reduce((acc, curr) => {
    const productName = products.find(p => p.id === curr.productId)?.name || 'Unknown';
    acc[productName] = (acc[productName] || 0) + (curr.amount * (curr.quantity || 1));
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(salesByProduct).map(key => ({
    name: key,
    sales: salesByProduct[key] * (currentShopCurrency?.rate || 1),
  }));

  return (
    <div className="space-y-6">
      
      {/* 1. KPI Grid (Standardized sizes for all cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Row 1/2 starts with the newly requested critical metrics */}
        <DashboardCard title="Today's Sales" value={formatCompact(todaySales)} icon={<SalesIcon />} color="bg-primary" />
        <DashboardCard title="Month's Sales" value={formatCompact(monthSales)} icon={<SalesIcon />} color="bg-indigo-600" />
        <DashboardCard title="Total Receivables" value={formatCompact(totalReceivables)} icon={<BalanceIcon />} color="bg-orange-500" />
        <DashboardCard title="Today's Credit" value={formatCompact(todayCreditSales)} icon={<BalanceIcon />} color="bg-red-500" />
        
        {/* Continuing with existing important metrics */}
        <DashboardCard title="All-Time Net Sales" value={formatCompact(netSalesAllTime)} icon={<SalesIcon />} color="bg-blue-500" />
        <DashboardCard title="Total Expenses" value={formatCompact(totalExpenses)} icon={<ExpenseIcon />} color="bg-red-600" />
        <DashboardCard title="Net Profit" value={formatCompact(netProfit)} icon={<ProfitIcon />} color="bg-green-600" />
        <DashboardCard title="Stock Worth (Cost)" value={formatCompact(stockStats.worth)} icon={<InventoryIcon />} color="bg-purple-600" />
        <DashboardCard title="Stock Weight" value={`${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(stockStats.weight)} kg`} icon={<WeightIcon />} color="bg-gray-500" />
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
        <h3 className="text-lg font-black mb-4 text-gray-800 uppercase tracking-tighter italic">Sales Distribution by Product</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.1)" vertical={false}/>
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false}/>
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(tick) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(tick)} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                labelStyle={{ fontWeight: '800', color: '#111827' }}
                formatter={(value: number) => [new Intl.NumberFormat('en-US').format(value), `Sales (${currentShopCurrency.symbol})`]}
              />
              <Bar dataKey="sales" fill="#1E40AF" radius={[4, 4, 0, 0]} name={`Sales (${currentShopCurrency.symbol})`} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
