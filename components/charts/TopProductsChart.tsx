
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Transaction, Product, TransactionType } from '../../types';

interface Props {
  transactions: Transaction[];
  products: Product[];
}

const TopProductsChart: React.FC<Props> = ({ transactions, products }) => {
  const data = useMemo(() => {
    const sales = transactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE);
    
    const grouped = sales.reduce((acc, t) => {
        const product = products.find(p => p.id === t.productId);
        const name = product?.name || 'Unknown';
        
        if (!acc[name]) acc[name] = 0;
        acc[name] += (t.amount * (t.quantity || 1));
        return acc;
    }, {} as Record<string, number>);

    // Top 5
    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  }, [transactions, products]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Top 5 Products (Revenue)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
            <Tooltip 
                 cursor={{fill: 'transparent'}}
                 contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                 formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`rgba(16, 185, 129, ${1 - (index * 0.15)})`} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopProductsChart;
