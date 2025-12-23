
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { UserRole, User } from '../../../types';

const UserManagement: React.FC = () => {
  const { users, shops, addUser, updateUser, deleteUser, currentUser } = useAppContext();
  
  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SHOP_OPERATOR);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  
  // Editing State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleShopToggle = (shopId: string) => {
      setSelectedShopIds(prev => 
          prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]
      );
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setUsername(user.username);
    setPassword(user.password || '');
    setRole(user.role);
    setSelectedShopIds(user.allowedShopIds || []);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
        alert("You cannot delete your own account while logged in.");
        return;
    }
    if (window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) {
        try {
            await deleteUser(userId);
            setMessage({ type: 'success', text: `User "${userName}" deleted successfully.` });
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to delete user.' });
        }
    }
  };

  const cancelEdit = () => {
      setEditingUserId(null);
      setName('');
      setUsername('');
      setPassword('');
      setRole(UserRole.SHOP_OPERATOR);
      setSelectedShopIds([]);
      setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if(!name || !username || !password) {
        setMessage({ type: 'error', text: 'Please fill all user detail fields.' });
        return;
    }

    if (role !== UserRole.HEAD_OFFICE && selectedShopIds.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one shop for this user.' });
        return;
    }

    // Uniqueness check for username (excluding self if editing)
    const duplicate = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== editingUserId);
    if (duplicate) {
        setMessage({ type: 'error', text: `Username "${username}" is already taken.` });
        return;
    }

    try {
        const userData = { 
            name, 
            username, 
            password, 
            role,
            allowedShopIds: role === UserRole.HEAD_OFFICE ? [] : selectedShopIds,
            shopId: selectedShopIds.length > 0 ? selectedShopIds[0] : ''
        };

        if (editingUserId) {
            await updateUser(editingUserId, userData);
            setMessage({ type: 'success', text: `User "${username}" updated successfully!` });
        } else {
            await addUser(userData);
            setMessage({ type: 'success', text: `User "${username}" created successfully!` });
        }
        
        // Reset Form
        cancelEdit();
    } catch (e) {
        setMessage({ type: 'error', text: `Failed to ${editingUserId ? 'update' : 'create'} user.` });
    }
  };

  const inputStyle = { backgroundColor: '#ffffff', color: '#000000' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
            {editingUserId ? 'Edit User Details' : 'Create New User'}
        </h3>
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
            <label htmlFor="userRole" className="block text-sm font-medium text-gray-700">Role</label>
            <select 
                id="userRole" 
                value={role} 
                onChange={e => setRole(e.target.value as UserRole)}
                className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary"
            >
                <option value={UserRole.SHOP_OPERATOR}>Shop Operator (Storefront)</option>
                <option value={UserRole.MANAGER}>Manager (Oversight / Multi-Shop)</option>
                <option value={UserRole.HEAD_OFFICE}>Admin (Head Office)</option>
            </select>
          </div>

          {role !== UserRole.HEAD_OFFICE && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Access (Select shops)</label>
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
              </div>
          )}

          <div className="flex flex-col space-y-2">
            <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
                {editingUserId ? 'Update User' : 'Create User'}
            </button>
            {editingUserId && (
                <button type="button" onClick={cancelEdit} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
                    Cancel Edit
                </button>
            )}
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Access</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className={editingUserId === user.id ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === UserRole.HEAD_OFFICE ? 'bg-purple-100 text-purple-800' : 
                        user.role === UserRole.MANAGER ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                      {user.role === UserRole.HEAD_OFFICE ? (
                          <span className="text-gray-400 italic">Full System Access</span>
                      ) : (
                          <div className="flex flex-wrap gap-1">
                              {user.allowedShopIds && user.allowedShopIds.length > 0 ? (
                                  user.allowedShopIds.map(sid => {
                                      const s = shops.find(shop => shop.id === sid);
                                      return (
                                          <span key={sid} className="bg-gray-100 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-medium text-gray-600">
                                              {s ? s.name : 'Unknown'}
                                          </span>
                                      )
                                  })
                              ) : (
                                  <span className="text-red-500 text-xs font-bold">Access Revoked</span>
                              )}
                          </div>
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                          <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => handleDelete(user.id, user.name)} className="text-red-600 hover:text-red-900">Delete</button>
                      </div>
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
