
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
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Head Office Notifications</h2>
        <div className="space-y-4">
            {hoAlerts.length > 0 ? (
                hoAlerts.map(alert => (
                    <div key={alert.id} className={`p-4 border rounded-lg flex items-start space-x-4 ${alert.isRead ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}`}>
                        <AlertIcon type={alert.type} />
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className={`font-semibold ${alert.isRead ? 'text-gray-800' : 'text-blue-900'}`}>Notification</p>
                                {!alert.isRead && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">NEW</span>}
                            </div>
                            <p className="text-sm text-gray-800 font-medium mt-1">{alert.message}</p>
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-gray-500">{new Date(alert.date).toLocaleString()}</p>
                                {alert.context?.shipmentId && (
                                     <span className="text-xs bg-white border border-gray-300 px-2 py-1 rounded text-gray-600">
                                         Related to Shipment #{alert.context.shipmentId}
                                     </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Notifications</h3>
                    <p className="mt-1 text-sm text-gray-500">You have no new alerts or notifications.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default HOAlerts;