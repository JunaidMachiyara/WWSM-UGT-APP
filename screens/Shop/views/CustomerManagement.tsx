
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const CustomerManagement: React.FC = () => {
  const { customers, addCustomer, shopId } = useAppContext();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');

  const shopCustomers = customers.filter(c => c.shopId === shopId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!name || !shopId) return;
    addCustomer({ name, phone, reference, shopId });
    setName('');
    setPhone('');
    setReference('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Add New Customer</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name</label>
            <input 
              type="text" 
              id="customerName" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" 
              required 
            />
          </div>
           <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input 
              type="text" 
              id="customerPhone" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
            />
          </div>
           <div>
            <label htmlFor="customerReference" className="block text-sm font-medium text-gray-700">Reference</label>
            <input 
              type="text" 
              id="customerReference" 
              value={reference} 
              onChange={e => setReference(e.target.value)} 
              className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
            />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Customer</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Customers</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shopCustomers.map(customer => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.reference || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;