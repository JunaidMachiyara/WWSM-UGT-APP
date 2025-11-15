
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, Shop, TransactionType } from '../../types';

interface ChartProps {
  transactions: Transaction[];
  shops: Shop[];
}

const ShopPerformanceChart: React.FC<ChartProps> = ({ transactions, shops }) => {
  const data = shops
    .filter(shop => shop.isActive)
    .map(shop => {
      const shopSales = transactions.filter(t => t.shopId === shop.id && (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE));
      const shopExpenses = transactions.filter(t => t.shopId === shop.id && t.type === TransactionType.EXPENSE);
      
      // FIX: Calculate total sales by multiplying amount by quantity.
      const totalSales = shopSales.reduce((acc, t) => acc + (t.amount * (t.quantity || 1)), 0);
      const totalExpenses = shopExpenses.reduce((acc, t) => acc + t.amount, 0);

      return {
        name: shop.name,
        sales: totalSales,
        expenses: totalExpenses,
        profit: totalSales - totalExpenses
      };
    });

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
       <h3 className="text-lg font-semibold mb-4 text-gray-700">Shop Performance Overview</h3>
       <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.3)"/>
            <XAxis dataKey="name" stroke="#6B7280"/>
            <YAxis stroke="#6B7280"/>
            <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Bar dataKey="sales" fill="#82ca9d" name="Total Sales" />
            <Bar dataKey="profit" fill="#8884d8" name="Net Profit" />
            </BarChart>
        </ResponsiveContainer>
       </div>
    </div>
  );
};

export default ShopPerformanceChart;