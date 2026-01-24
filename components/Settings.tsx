import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, User as UserIcon, Trash2, Plus, Save, X, Lock } from 'lucide-react';

interface SettingsProps {
  users: User[];
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ users, onAddUser, onDeleteUser, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'STAFF' as UserRole
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.name) {
      alert("All fields are required");
      return;
    }
    
    // Check username uniqueness
    if (users.some(u => u.username === formData.username)) {
        alert("Username already exists");
        return;
    }

    onAddUser({
      id: Date.now().toString(),
      name: formData.name,
      username: formData.username,
      password: formData.password,
      role: formData.role
    });
    
    setIsModalOpen(false);
    setFormData({ name: '', username: '', password: '', role: 'STAFF' });
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'MANAGER': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'STAFF': return 'bg-green-100 text-green-700 border-green-200';
      case 'CASHIER': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
          <p className="text-slate-500">Manage users, roles, and access permissions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={20} /> Add New User
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Guide */}
        <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-brand-600"/> Role Permissions
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                        <span className="font-bold text-purple-700 block mb-1">ADMIN</span>
                        <span className="text-slate-600">Full Access: Settings, Reports, Inventory, POS, Stock Check.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <span className="font-bold text-blue-700 block mb-1">MANAGER</span>
                        <span className="text-slate-600">Access: Reports, Inventory, POS, Stock Check.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                        <span className="font-bold text-green-700 block mb-1">STAFF</span>
                        <span className="text-slate-600">Access: Inventory, POS, Stock Check.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-1">CASHIER</span>
                        <span className="text-slate-600">Access: POS Terminal Only.</span>
                    </div>
                </div>
            </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Registered Users</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                            <tr>
                                <th className="p-4 border-b">User Profile</th>
                                <th className="p-4 border-b">Role</th>
                                <th className="p-4 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{user.name}</div>
                                                <div className="text-xs text-slate-400">@{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {user.id !== currentUser.id ? (
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm('Delete this user?')) onDeleteUser(user.id);
                                                }}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Current User</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">Create New User</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                        <input 
                            type="text"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="e.g. johnd"
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                                placeholder="Set password"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                        <select 
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white"
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                        >
                            <option value="CASHIER">Cashier (POS Only)</option>
                            <option value="STAFF">Staff (POS, Inventory)</option>
                            <option value="MANAGER">Manager (POS, Inv, Reports)</option>
                            <option value="ADMIN">Admin (Full Access)</option>
                        </select>
                    </div>

                    <button type="submit" className="w-full mt-4 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                        <Save size={18} /> Create Account
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};