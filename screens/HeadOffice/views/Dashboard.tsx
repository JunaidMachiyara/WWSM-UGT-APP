
import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';
import DashboardCard from '../../../components/DashboardCard';
import ShopPerformanceChart from '../../../components/charts/ShopPerformanceChart';

// Icons
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const ShopsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const ProfitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;


const Dashboard: React.FC = () => {
  const { transactions, shops, products } = useAppContext();

  // FIX: Calculate total sales by multiplying amount by quantity.
  const totalSales = transactions
    .filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
    .reduce((sum, t) => sum + t.amount * (t.quantity || 1), 0);

  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const salesTransactions = transactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE);
  
  let totalCostOfGoods = 0;
  // FIX: Use product's hoCost for accurate cost of goods calculation.
  salesTransactions.forEach(sale => {
      const product = products.find(p => p.id === sale.productId);
      if(product) {
          totalCostOfGoods += product.hoCost * (sale.quantity || 1);
      }
  });

  const grossProfit = totalSales - totalCostOfGoods;
  const netProfit = grossProfit - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard title="Total Sales" value={`$${totalSales.toLocaleString()}`} icon={<SalesIcon />} color="bg-blue-500" />
        <DashboardCard title="Net Profit" value={`$${netProfit.toLocaleString()}`} icon={<ProfitIcon />} color="bg-green-500" />
        <DashboardCard title="Active Shops" value={shops.filter(s => s.isActive).length} icon={<ShopsIcon />} color="bg-purple-500" />
      </div>
      
      <ShopPerformanceChart transactions={transactions} shops={shops} />

    </div>
  );
};

export default Dashboard;
