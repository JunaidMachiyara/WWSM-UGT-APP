import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AlertType } from '../../../types';

const AlertIcon = ({ type }: { type: AlertType }) => {
    switch(type) {
        case AlertType.STOCK_DISCREPANCY:
            return (
                <div className="bg-red-100 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
            );
        default:
            return null;
    }
};

const Alerts: React.FC = () => {
  const { alerts, shopId } = useAppContext();

  const shopAlerts = alerts
    .filter(alert => alert.shopId === shopId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">System Alerts</h2>
        <div className="space-y-4">
            {shopAlerts.length > 0 ? (
                shopAlerts.map(alert => (
                    <div key={alert.id} className="p-4 border border-gray-200 rounded-lg flex items-start space-x-4">
                        <AlertIcon type={alert.type} />
                        <div>
                            <p className="font-semibold text-gray-800">{alert.type.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-gray-600">{alert.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(alert.date).toLocaleString()}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Alerts</h3>
                    <p className="mt-1 text-sm text-gray-500">Everything is running smoothly.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default Alerts;