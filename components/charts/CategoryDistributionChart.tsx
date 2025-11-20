
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction, Product, TransactionType } from '../../types';

interface Props {
  transactions: Transaction[];
  products: Product[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const CategoryDistributionChart: React.FC<Props> = ({ transactions, products }) => {
  const data = useMemo(() => {
    const sales = transactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE);
    
    const grouped = sales.reduce((acc, t) => {
        const product = products.find(p => p.id === t.productId);
        const category = product?.category || 'Uncategorized';
        
        if (!acc[category]) acc[category] = 0;
        acc[category] += (t.amount * (t.quantity || 1));
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value);
  }, [transactions, products]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Sales by Category</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryDistributionChart;
