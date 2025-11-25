
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { UserRole } from '../../../types';

const UserManagement: React.FC = () => {
  const { users, shops, addUser } = useAppContext();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleShopToggle = (shopId: string) => {
      setSelectedShopIds(prev => 
          prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]
      );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if(!name || !username || !password) {
        setMessage({ type: 'error', text: 'Please fill all user detail fields.' });
        return;
    }

    if (selectedShopIds.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one shop for this operator.' });
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
            role: UserRole.SHOP_OPERATOR,
            allowedShopIds: selectedShopIds,
            shopId: selectedShopIds[0] // Legacy fallback
        });
        setMessage({ type: 'success', text: `User ${username} created successfully with access to ${selectedShopIds.length} shops!` });
        
        // Reset Form
        setName('');
        setUsername('');
        setPassword('');
        setSelectedShopIds([]);
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Shops (Select multiple)</label>
            <div className="border border-gray-300 rounded-md p-3 bg-gray-50 h-40 overflow-y-auto">
                {shops.filter(s => s.isActive).map(shop => (
                    <div key={shop.id} className="flex items-center mb-2 last:mb-0">
                        <input 
                            type="checkbox" 
                            id={`shop-${shop.id}`}
                            checked={selectedShopIds.includes(shop.id)}
                            onChange={() => handleShopToggle(shop.id)}
                            className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor={`shop-${shop.id}`} className="ml-2 text-sm text-gray-800 cursor-pointer select-none">
                            {shop.name}
                        </label>
                    </div>
                ))}
                {shops.length === 0 && <p className="text-xs text-gray-500 italic">No active shops available.</p>}
            </div>
            <p className="text-xs text-gray-500 mt-1">User will select shop upon login if multiple are assigned.</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Shops</th>
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
                  <td className="px-6 py-4 text-sm text-gray-500">
                      {user.role === UserRole.HEAD_OFFICE ? (
                          <span className="text-gray-400 italic">All Access</span>
                      ) : (
                          <div className="flex flex-wrap gap-1">
                              {user.allowedShopIds && user.allowedShopIds.length > 0 ? (
                                  user.allowedShopIds.map(sid => {
                                      const s = shops.find(shop => shop.id === sid);
                                      return (
                                          <span key={sid} className="bg-gray-100 border border-gray-300 px-2 py-0.5 rounded text-xs">
                                              {s ? s.name : 'Unknown'}
                                          </span>
                                      )
                                  })
                              ) : (
                                  <span className="text-red-500 text-xs">No Access</span>
                              )}
                          </div>
                      )}
                  </td>
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
