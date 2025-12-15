
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

  // --- Financial Calculations (Base Currency) ---
  const totalSales = shopTransactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE).reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
  const totalReturns = shopTransactions.filter(t => t.type === TransactionType.SALES_RETURN).reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
  const netSales = totalSales - totalReturns;
  
  const totalExpenses = shopTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

  const salesTransactions = shopTransactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE);
  let cogsForSales = 0;
  salesTransactions.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if(product) {
          cogsForSales += product.hoCost * (sale.quantity || 1);
      }
  });

  const returnTransactions = shopTransactions.filter(t => t.type === TransactionType.SALES_RETURN);
  let cogsForReturns = 0;
  returnTransactions.forEach(ret => {
      const product = products.find(p => p.id === ret.productId);
      if (product) {
          cogsForReturns += product.hoCost * (ret.quantity || 1);
      }
  });

  const netCogs = cogsForSales - cogsForReturns;
  const netProfit = netSales - netCogs - totalExpenses;

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
                  worth += qty * p.hoCost; // Cost Value in Base Currency
                  weight += qty * (p.weight || 0); // Weight
              }
          }
      });

      return { worth, weight };
  }, [shopTransactions, products]);


  // Data for chart
  const salesByProduct = salesTransactions.reduce((acc, curr) => {
    const productName = products.find(p => p.id === curr.productId)?.name || 'Unknown';
    acc[productName] = (acc[productName] || 0) + (curr.amount * (curr.quantity || 1));
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(salesByProduct).map(key => ({
    name: key,
    sales: salesByProduct[key] * (currentShopCurrency?.rate || 1), // Convert data for chart display
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <DashboardCard title="Net Sales" value={formatCompact(netSales)} icon={<SalesIcon />} color="bg-blue-500" />
        <DashboardCard title="Total Expenses" value={formatCompact(totalExpenses)} icon={<ExpenseIcon />} color="bg-red-500" />
        <DashboardCard title="Net Profit" value={formatCompact(netProfit)} icon={<ProfitIcon />} color="bg-green-500" />
        
        {/* New Inventory Cards */}
        <DashboardCard 
            title="Stock Worth" 
            value={formatCompact(stockStats.worth)} 
            icon={<InventoryIcon />} 
            color="bg-purple-600" 
        />
        <DashboardCard 
            title="Stock Weight" 
            value={`${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(stockStats.weight)} kg`} 
            icon={<WeightIcon />} 
            color="bg-orange-500" 
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Sales by Product</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)"/>
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" tickFormatter={(tick) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(tick)} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '0.5rem' }} 
                labelStyle={{ color: '#374151' }}
                formatter={(value: number) => [new Intl.NumberFormat('en-US').format(value), `Sales (${currentShopCurrency.symbol})`]}
              />
              <Bar dataKey="sales" fill="#8884d8" name={`Sales (${currentShopCurrency.symbol})`} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
