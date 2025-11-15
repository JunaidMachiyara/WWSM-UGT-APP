

import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { UserRole } from '../../../types';

const UserManagement: React.FC = () => {
  const { users, shops, addUser } = useAppContext();
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!name || !shopId) return;
    addUser({ name, shopId, role: UserRole.SHOP_OPERATOR });
    setName('');
    setShopId('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Shop User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700">User Name</label>
            {/* FIX: Add focus styles for consistency. */}
            <input type="text" id="userName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" required />
          </div>
          <div>
            <label htmlFor="userShop" className="block text-sm font-medium text-gray-700">Assign to Shop</label>
            {/* FIX: Add focus styles for consistency. */}
            <select id="userShop" value={shopId} onChange={e => setShopId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" required>
              <option value="">Select a shop</option>
              {shops.filter(s => s.isActive).map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add User</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Users</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Shop</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role === UserRole.HEAD_OFFICE ? 'Head Office' : 'Shop Operator'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.shopId ? shops.find(s => s.id === user.shopId)?.name : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;