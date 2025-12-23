
import React, { useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AlertType } from '../../../types';

const AlertIcon = ({ type }: { type: AlertType }) => {
    switch(type) {
        case AlertType.STOCK_DISCREPANCY:
            return (
                <div className="bg-blue-100 rounded-full p-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            );
        case AlertType.PRICE_VIOLATION:
            return (
                <div className="bg-red-600 rounded-full p-2 shadow-sm animate-pulse">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                    </svg>
                </div>
            );
        default:
            return null;
    }
};

const HOAlerts: React.FC = () => {
  const { alerts, markAlertAsRead } = useAppContext();

  // Filter alerts specifically for Head Office
  const hoAlerts = alerts
    .filter(alert => alert.shopId === 'HO')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    // Mark all unread HO alerts as read when this view is opened
    const unreadAlerts = hoAlerts.filter(a => !a.isRead);
    unreadAlerts.forEach(alert => {
        markAlertAsRead(alert.id);
    });
  }, [hoAlerts, markAlertAsRead]);

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Security & Operational Alerts</h2>
        <div className="space-y-4">
            {hoAlerts.length > 0 ? (
                hoAlerts.map(alert => (
                    <div key={alert.id} className={`p-5 border rounded-xl flex items-start space-x-5 transition-all ${
                        alert.type === AlertType.PRICE_VIOLATION 
                        ? 'bg-red-50 border-red-200' 
                        : alert.isRead ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-md'
                    }`}>
                        <AlertIcon type={alert.type} />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-2">
                                    <p className={`font-black text-sm uppercase tracking-tighter ${alert.type === AlertType.PRICE_VIOLATION ? 'text-red-700' : (alert.isRead ? 'text-gray-800' : 'text-blue-900')}`}>
                                        {alert.type.replace(/_/g, ' ')}
                                    </p>
                                    {alert.type === AlertType.PRICE_VIOLATION && (
                                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">CRITICAL</span>
                                    )}
                                </div>
                                {!alert.isRead && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">NEW</span>}
                            </div>
                            <p className={`text-base mt-1 ${alert.type === AlertType.PRICE_VIOLATION ? 'text-red-900 font-bold' : 'text-gray-800 font-medium'}`}>
                                {alert.message}
                            </p>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-400 italic">{new Date(alert.date).toLocaleString()}</p>
                                <div className="flex space-x-2">
                                    {alert.context?.invoiceId && (
                                         <span className="text-xs font-mono bg-white border border-gray-200 px-3 py-1 rounded shadow-sm text-gray-600">
                                             #INV-{alert.context.invoiceId}
                                         </span>
                                    )}
                                    {alert.context?.shopName && (
                                         <span className="text-xs font-bold bg-blue-100 px-3 py-1 rounded text-blue-800">
                                             {alert.context.shopName}
                                         </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <h3 className="mt-4 text-lg font-bold text-gray-400">No Active Notifications</h3>
                </div>
            )}
        </div>
    </div>
  );
};

export default HOAlerts;
