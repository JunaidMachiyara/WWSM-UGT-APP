

import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const ClearingAgentSetup: React.FC = () => {
  const { clearingAgents, addClearingAgent } = useAppContext();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact) return;
    addClearingAgent({ name, contact });
    setName('');
    setContact('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Add Clearing Agent</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="agentName" className="block text-sm font-medium text-gray-700">Agent Name</label>
            <input type="text" id="agentName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="agentContact" className="block text-sm font-medium text-gray-700">Contact Info</label>
            <input type="text" id="agentContact" value={contact} onChange={e => setContact(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Agent</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Agents</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clearingAgents.map(agent => (
                <tr key={agent.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClearingAgentSetup;