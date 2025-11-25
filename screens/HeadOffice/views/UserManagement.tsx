import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { UserRole } from '../../../types';

const UserManagement: React.FC = () => {
  const { users, shops, addUser } = useAppContext();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shopId, setShopId] = useState('');
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if(!name || !username || !password || !shopId) {
        setMessage({ type: 'error', text: 'Please fill all fields.' });
        return;
    }

    // Simple username uniqueness check
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        setMessage({ type: 'error', text: `Username "${username}" is already taken.` });
        return;
    }

    try {
        addUser({ 
            name, 
            username, 
            password, 
            shopId, 
            role: UserRole.SHOP_OPERATOR 
        });
        setMessage({ type: 'success', text: `User ${username} created successfully!` });
        
        // Reset Form
        setName('');
        setUsername('');
        setPassword('');
        setShopId('');
    } catch (e) {
        setMessage({ type: 'error', text: 'Failed to create user.' });
    }
  };

  const inputStyle = { backgroundColor: '#ffffff', color: '#000000' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create Shop Operator</h3>
        {message && (
            <div className={`p-3 mb-4 text-sm rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
            </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Full Name</label>
            <input 
                type="text" 
                id="userName" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
                style={inputStyle}
                required 
            />
          </div>
          
          <div>
            <label htmlFor="loginId" className="block text-sm font-medium text-gray-700">Login ID (Username)</label>
            <input 
                type="text" 
                id="loginId" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
                style={inputStyle}
                required 
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input 
                type="text" 
                id="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
                style={inputStyle}
                required 
            />
          </div>

          <div>
            <label htmlFor="userShop" className="block text-sm font-medium text-gray-700">Assign to Shop</label>
            <select 
                id="userShop" 
                value={shopId} 
                onChange={e => setShopId(e.target.value)} 
                className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
                style={inputStyle}
                required
            >
              <option value="">Select a shop</option>
              {shops.filter(s => s.isActive).map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Create User</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Users</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Shop</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === UserRole.HEAD_OFFICE ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {user.role === UserRole.HEAD_OFFICE ? 'Admin' : 'Operator'}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.shopId ? shops.find(s => s.id === user.shopId)?.name : 'Head Office'}</td>
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