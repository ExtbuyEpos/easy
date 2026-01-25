import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Product, Sale, StoreSettings } from '../types';
import { Shield, User as UserIcon, Trash2, Plus, Save, X, Lock, Database, Download, Upload, AlertTriangle, Archive, Receipt, Image as ImageIcon, Printer, Percent, MessageCircle, Cloud, LogOut, ChevronLeft } from 'lucide-react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { saveFirebaseConfig, clearFirebaseConfig } from '../firebase';

interface SettingsProps {
  users: User[];
  products: Product[];
  sales: Sale[];
  onAddUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
  storeSettings: StoreSettings;
  onUpdateStoreSettings: (settings: StoreSettings) => void;
  onGoBack?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  users, products, sales, onAddUser, onDeleteUser, currentUser, storeSettings, onUpdateStoreSettings, onGoBack
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // User Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'STAFF' as UserRole
  });

  // Store Settings Form State
  const [storeForm, setStoreForm] = useState<StoreSettings>(storeSettings);
  const [storeMessage, setStoreMessage] = useState<string | null>(null);
  
  // Firebase Form
  const [firebaseConfigStr, setFirebaseConfigStr] = useState('');

  useEffect(() => {
    setStoreForm(storeSettings);
    const existing = localStorage.getItem('easyPOS_firebaseConfig');
    if(existing) setFirebaseConfigStr(existing);
  }, [storeSettings]);

  // --- FIREBASE CONFIG LOGIC ---
  const handleSaveFirebase = () => {
      if(saveFirebaseConfig(firebaseConfigStr)) {
          alert("Firebase Config Saved! The app will now reload.");
          window.location.reload();
      } else {
          alert("Invalid JSON configuration. Please check the syntax.");
      }
  };

  const handleClearFirebase = () => {
      if(window.confirm("Disconnect Firebase? This will revert to LocalStorage mode.")) {
          clearFirebaseConfig();
          window.location.reload();
      }
  };

  // --- USER MANAGEMENT LOGIC ---
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

  // --- STORE SETTINGS LOGIC ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreForm(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStoreSettings = () => {
    onUpdateStoreSettings(storeForm);
    setStoreMessage("Settings saved successfully!");
    setTimeout(() => setStoreMessage(null), 3000);
  };

  // --- BACKUP & RESTORE LOGIC ---
  const handleBackup = async () => {
    try {
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];

      // 1. Add System Data (JSON)
      zip.file("users.json", JSON.stringify(users, null, 2));
      zip.file("products.json", JSON.stringify(products, null, 2));
      zip.file("sales.json", JSON.stringify(sales, null, 2));
      zip.file("store_settings.json", JSON.stringify(storeSettings, null, 2));

      // 2. Generate Excel Reports
      const salesWS = XLSX.utils.json_to_sheet(sales.map(s => ({
         ID: s.id, Date: new Date(s.timestamp).toLocaleString(), Total: s.total, Payment: s.paymentMethod
      })));
      const salesCSV = XLSX.utils.sheet_to_csv(salesWS);
      zip.folder("reports")?.file(`sales_report_${dateStr}.csv`, salesCSV);

      const invWS = XLSX.utils.json_to_sheet(products.map(p => ({
        Name: p.name, SKU: p.sku, Stock: p.stock, Value: p.stock * p.costPrice
      })));
      const invCSV = XLSX.utils.sheet_to_csv(invWS);
      zip.folder("reports")?.file(`inventory_valuation_${dateStr}.csv`, invCSV);

      // 3. Generate Zip
      const content = await zip.generateAsync({ type: "blob" });
      
      // 4. Download
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `easyPOS_Backup_${dateStr}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Backup failed", error);
      alert("Failed to create backup.");
    }
  };

  const handleRestoreClick = () => {
    if(window.confirm("WARNING: This will OVERWRITE current system data. Are you sure?")) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(file);

      // Helper to read file
      const readJSON = async (filename: string) => {
        if(unzipped.files[filename]) {
           const text = await unzipped.files[filename].async("string");
           return JSON.parse(text);
        }
        return null;
      };

      const restoredUsers = await readJSON("users.json");
      const restoredProducts = await readJSON("products.json");
      const restoredSales = await readJSON("sales.json");
      const restoredSettings = await readJSON("store_settings.json");

      if (restoredProducts) localStorage.setItem('easyPOS_products', JSON.stringify(restoredProducts));
      if (restoredSales) localStorage.setItem('easyPOS_sales', JSON.stringify(restoredSales));
      if (restoredUsers) localStorage.setItem('easyPOS_users', JSON.stringify(restoredUsers));
      if (restoredSettings) localStorage.setItem('easyPOS_storeSettings', JSON.stringify(restoredSettings));

      alert("System restored successfully! The application will now reload.");
      window.location.reload();

    } catch (error) {
      console.error("Restore failed", error);
      alert("Invalid Backup File. Please ensure you are uploading a valid easyPOS zip.");
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto transition-colors">
       <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {onGoBack && (
            <button onClick={onGoBack} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors active:bg-slate-300">
                <ChevronLeft size={24} />
            </button>
           )}
           <div>
             <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
             <p className="text-slate-500">Manage users, database, and system backups.</p>
           </div>
        </div>
        <div className="flex gap-2">
            <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
            >
            <Plus size={20} /> Add New User
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* Firebase Sync Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Cloud size={18} className="text-orange-600"/> Cloud Synchronization
                </h3>
                <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                        Paste your Firebase Configuration JSON here to enable real-time sync across devices.
                    </p>
                    <textarea 
                        value={firebaseConfigStr}
                        onChange={(e) => setFirebaseConfigStr(e.target.value)}
                        placeholder='{"apiKey": "...", "projectId": "..."}'
                        className="w-full h-24 p-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSaveFirebase}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-bold text-xs transition-colors"
                        >
                            Save & Connect
                        </button>
                        <button 
                            onClick={handleClearFirebase}
                            className="p-2 text-slate-400 hover:text-red-500 border border-slate-200 rounded-lg transition-colors"
                            title="Disconnect"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Receipt Customization Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Receipt size={18} className="text-brand-600"/> Receipt Template
                </h3>
                
                <div className="space-y-4">
                  {/* Logo Upload */}
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                     {storeForm.logo ? (
                       <img src={storeForm.logo} alt="Store Logo" className="h-16 object-contain mb-2" />
                     ) : (
                       <ImageIcon className="text-slate-400 mb-2" size={32} />
                     )}
                     <span className="text-xs text-brand-600 font-bold">{storeForm.logo ? 'Change Logo' : 'Upload Store Logo'}</span>
                     <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Store Name</label>
                    <input 
                       type="text" 
                       value={storeForm.name} 
                       onChange={e => setStoreForm({...storeForm, name: e.target.value})}
                       className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                       placeholder="My Store Name"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Address / Subtitle</label>
                    <textarea 
                       value={storeForm.address} 
                       onChange={e => setStoreForm({...storeForm, address: e.target.value})}
                       className="w-full p-2 border border-slate-200 rounded-lg text-sm h-20 resize-none"
                       placeholder="Store Address..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone / Contact</label>
                    <input 
                       type="text" 
                       value={storeForm.phone} 
                       onChange={e => setStoreForm({...storeForm, phone: e.target.value})}
                       className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                       placeholder="Phone number"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Footer Message</label>
                    <input 
                       type="text" 
                       value={storeForm.footerMessage} 
                       onChange={e => setStoreForm({...storeForm, footerMessage: e.target.value})}
                       className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                       placeholder="Thank you for visiting!"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Printer size={14} /> Paper Size
                    </label>
                    <select
                        value={storeForm.receiptSize || '80mm'}
                        onChange={e => setStoreForm({...storeForm, receiptSize: e.target.value as '58mm' | '80mm'})}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                        <option value="80mm">80mm (Standard Wide Thermal)</option>
                        <option value="58mm">58mm (Narrow Thermal)</option>
                    </select>
                  </div>
                </div>

                {/* Tax Settings */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                        <Percent size={16} /> Tax Configuration
                    </h4>
                    <div className="space-y-3">
                         <div className="flex items-center gap-2">
                             <input 
                               type="checkbox" 
                               id="enableTax"
                               checked={storeForm.taxEnabled}
                               onChange={e => setStoreForm({...storeForm, taxEnabled: e.target.checked})}
                               className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                             />
                             <label htmlFor="enableTax" className="text-sm text-slate-600 font-medium">Enable Tax Calculation</label>
                         </div>
                         
                         {storeForm.taxEnabled && (
                            <div className="grid grid-cols-2 gap-2 animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tax Name</label>
                                    <input 
                                       type="text" 
                                       value={storeForm.taxName}
                                       onChange={e => setStoreForm({...storeForm, taxName: e.target.value})}
                                       className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                       placeholder="VAT"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Rate (%)</label>
                                    <input 
                                       type="number" 
                                       value={storeForm.taxRate}
                                       onChange={e => setStoreForm({...storeForm, taxRate: parseFloat(e.target.value) || 0})}
                                       className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                       placeholder="10"
                                    />
                                </div>
                            </div>
                         )}
                    </div>
                </div>

                 {/* WhatsApp Integration Section */}
                 <div className="mt-6 pt-4 border-t border-slate-100">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                        <MessageCircle size={16} /> WhatsApp Integration
                    </h4>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                           Phone Number <span className="text-red-500" title="Required">*</span>
                       </label>
                       <input 
                         type="tel"
                         value={storeForm.whatsappPhoneNumber || ''}
                         onChange={e => setStoreForm({...storeForm, whatsappPhoneNumber: e.target.value})}
                         className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono"
                         placeholder="+1234567890"
                         required
                       />
                       <p className="text-[10px] text-slate-400">Used for WhatsApp connection and sharing receipts.</p>
                    </div>
                </div>

                <div className="mt-6">
                    <button 
                        onClick={handleSaveStoreSettings}
                        className="w-full bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={16} /> Save Settings
                    </button>
                    {storeMessage && <div className="text-xs text-green-600 text-center font-bold mt-2">{storeMessage}</div>}
                </div>
            </div>

            {/* Backup & Restore Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Database size={18} className="text-blue-600"/> Data & Backup
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Create a full backup of your system data, including products, sales history, and users. 
                  The backup includes Excel reports.
                </p>
                
                <div className="space-y-3">
                   <button 
                     onClick={handleBackup}
                     className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition-colors shadow-sm"
                   >
                     <Archive size={18} /> Download Full Backup (.zip)
                   </button>
                   
                   <div className="relative">
                      <button 
                        onClick={handleRestoreClick}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors border border-slate-200"
                        disabled={isRestoring}
                      >
                        {isRestoring ? 'Restoring...' : <><Upload size={18} /> Restore from Backup</>}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".zip"
                        className="hidden"
                      />
                   </div>
                </div>

                <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg flex gap-2">
                    <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700">
                      <strong>Auto-Save:</strong> The system automatically saves data to browser storage.
                    </p>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: User List */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* User List */}
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
            
            {/* Role Guide (Small) */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-brand-600"/> Role Permissions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                        <span className="font-bold text-purple-700 block mb-1">ADMIN</span>
                        <span className="text-slate-600 text-xs">Full Access: Settings, Reports, Inventory, POS, Stock Check. Complete control over system configuration.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <span className="font-bold text-blue-700 block mb-1">MANAGER</span>
                        <span className="text-slate-600 text-xs">Access: Reports, Inventory (Edit Only), POS, Stock Check. Managers can set prices but cannot add new product entries.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                        <span className="font-bold text-green-700 block mb-1">STAFF</span>
                        <span className="text-slate-600 text-xs">Access: Inventory (View/Stock Edit), POS, Stock Check. Restricted from Reports and System Settings.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-1">CASHIER</span>
                        <span className="text-slate-600 text-xs">Access: POS Terminal Only. Highly restricted role focused solely on sales processing and receipt generation.</span>
                    </div>
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