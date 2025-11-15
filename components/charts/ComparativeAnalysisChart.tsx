
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, Product, Shop, TransactionType } from '../../types';

interface ChartProps {
  transactions: Transaction[];
  products: Product[];
  shops: Shop[];
}

const ComparativeAnalysisChart: React.FC<ChartProps> = ({ transactions, products, shops }) => {
  // Compare gross profit margin per unit for a specific product across shops
  const productToCompare = products[0]; // Example: Compare the first product

  const data = shops
    .filter(shop => shop.isActive)
    .map(shop => {
      const sales = transactions.filter(t => t.shopId === shop.id && t.productId === productToCompare.id && (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE));
      const imports = transactions.filter(t => t.shopId === shop.id && t.productId === productToCompare.id && t.type === TransactionType.IMPORT);

      if (sales.length === 0) {
        return { name: shop.name, profitMargin: 0 };
      }

      const totalRevenue = sales.reduce((acc, curr) => acc + curr.amount * (curr.quantity || 1), 0);
      const totalUnitsSold = sales.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      const avgSalePrice = totalRevenue / totalUnitsSold;

      const avgImportCost = imports.length > 0
        ? imports.reduce((acc, curr) => acc + curr.amount * (curr.quantity || 1), 0) / imports.reduce((acc, curr) => acc + (curr.quantity || 1), 0)
        : 0;

      const profitMargin = avgSalePrice - avgImportCost;

      return {
        name: shop.name,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
      };
    });

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Comparative Analysis: '{productToCompare.name}' Profit Margin Per Unit</h3>
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
            <Bar dataKey="profitMargin" fill="#8884d8" name="Profit Margin ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ComparativeAnalysisChart;