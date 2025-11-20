
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, TransactionType } from '../../types';

interface SalesTrendChartProps {
  transactions: Transaction[];
}

interface SalesDataPoint {
  name: string;
  value: number;
  dateObj: Date;
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ transactions }) => {
  const data = useMemo(() => {
    const sales = transactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE);
    
    // Group by Date (DD MMM)
    const grouped = sales.reduce((acc, t) => {
        const date = new Date(t.date);
        const key = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
        
        if (!acc[key]) {
            acc[key] = { name: key, value: 0, dateObj: date };
        }
        acc[key].value += (t.amount * (t.quantity || 1));
        return acc;
    }, {} as Record<string, SalesDataPoint>);

    // Convert to array and sort by date
    return Object.values(grouped).sort((a: SalesDataPoint, b: SalesDataPoint) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [transactions]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Revenue Trend (Last 30 Days)</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1E40AF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280', fontSize: 12}} 
                dy={10}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#6B7280', fontSize: 12}} 
                tickFormatter={(value) => `$${value}`} 
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Area type="monotone" dataKey="value" stroke="#1E40AF" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesTrendChart;
