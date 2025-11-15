

import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

const IncomeStatement: React.FC = () => {
    const { transactions, shopId, products, formatCurrency } = useAppContext();
    const shopTransactions = transactions.filter(t => t.shopId === shopId);

    const totalSales = shopTransactions.filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE).reduce((sum, t) => sum + t.amount * (t.quantity || 1), 0);
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
    const grossProfit = netSales - netCogs;
    const netProfit = grossProfit - totalExpenses;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Income Statement</h2>
      <div className="border-t border-b border-gray-200 py-4">
        <div className="flow-root">
          <dl className="-my-4 text-sm divide-y divide-gray-200">
            <div className="py-4 sm:flex sm:items-center sm:justify-between">
              <dt className="font-medium text-gray-900">Net Revenue (Sales - Returns)</dt>
              <dd className="mt-1 font-medium text-green-600 sm:mt-0">{formatCurrency(netSales)}</dd>
            </div>
            <div className="py-4 sm:flex sm:items-center sm:justify-between">
              <dt className="text-gray-600">Cost of Goods Sold (COGS)</dt>
              <dd className="mt-1 font-medium text-red-600 sm:mt-0">({formatCurrency(netCogs)})</dd>
            </div>
            <div className="py-4 sm:flex sm:items-center sm:justify-between font-bold">
              <dt className="text-gray-900">Gross Profit</dt>
              <dd className="mt-1 text-gray-900 sm:mt-0">{formatCurrency(grossProfit)}</dd>
            </div>
             <div className="py-4 sm:flex sm:items-center sm:justify-between">
              <dt className="text-gray-600">Operating Expenses</dt>
              <dd className="mt-1 font-medium text-red-600 sm:mt-0">({formatCurrency(totalExpenses)})</dd>
            </div>
            <div className="py-4 sm:flex sm:items-center sm:justify-between text-lg font-bold">
              <dt className="text-primary">Net Profit</dt>
              <dd className="mt-1 text-primary sm:mt-0">{formatCurrency(netProfit)}</dd>
            </div>
          </dl>
        </div>
      </div>
       <p className="text-center mt-6 text-xs text-gray-500">This is a simplified real-time income statement based on recorded transactions.</p>
    </div>
  );
};

export default IncomeStatement;