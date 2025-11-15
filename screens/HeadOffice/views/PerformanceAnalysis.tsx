

import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import ComparativeAnalysisChart from '../../../components/charts/ComparativeAnalysisChart';

const PerformanceAnalysis: React.FC = () => {
    const { transactions, products, shops } = useAppContext();
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Advanced Performance Metrics</h2>
            <ComparativeAnalysisChart transactions={transactions} products={products} shops={shops} />
            {/* Additional charts and visualizations can be added here */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Item Behavior Insights (Placeholder)</h3>
                <p className="text-gray-600">
                    This section will feature visualizations for sales seasonality, price elasticity, and stock-out frequency per shop.
                    These advanced analytics provide deeper insights into product performance and market dynamics.
                </p>
            </div>
        </div>
    );
};

export default PerformanceAnalysis;