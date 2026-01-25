import React, { useState, useMemo } from 'react';
import { Sale, Product, Language } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, DollarSign, Package, Sparkles, PieChart, FileText, FileSpreadsheet, Filter, ChevronLeft } from 'lucide-react';
import { generateBusinessInsight } from '../services/geminiService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatNumber, formatCurrency } from '../utils/format';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  onGoBack?: () => void;
  language: Language;
}

type DateRange = 'today' | 'yesterday' | 'last7' | 'week' | 'month' | 'all' | 'custom';
type ReportTab = 'dashboard' | 'inventory';

export const Reports: React.FC<ReportsProps> = ({ sales, products, onGoBack, language }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  const [activeTab, setActiveTab] = useState<ReportTab>('dashboard');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);

  const filteredSales = useMemo(() => {
    let result = sales;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    const last7Days = new Date(now);
    last7Days.setDate(now.getDate() - 6);
    last7Days.setHours(0,0,0,0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (dateRange === 'today') result = result.filter(s => s.timestamp >= today);
    else if (dateRange === 'yesterday') result = result.filter(s => s.timestamp >= yesterday && s.timestamp < today);
    else if (dateRange === 'last7') result = result.filter(s => s.timestamp >= last7Days.getTime());
    else if (dateRange === 'week') result = result.filter(s => s.timestamp >= weekStart.getTime());
    else if (dateRange === 'month') result = result.filter(s => s.timestamp >= monthStart);
    else if (dateRange === 'custom' && customStart && customEnd) {
      const start = new Date(customStart).getTime();
      const end = new Date(customEnd).setHours(23, 59, 59, 999);
      result = result.filter(s => s.timestamp >= start && s.timestamp <= end);
    }

    if (paymentFilter !== 'All') result = result.filter(s => s.paymentMethod === paymentFilter);
    if (categoryFilter !== 'All') result = result.filter(s => s.items.some(i => i.category === categoryFilter));

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [sales, dateRange, customStart, customEnd, paymentFilter, categoryFilter]);

  const filteredInventory = useMemo(() => {
    if (categoryFilter === 'All') return products;
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

  const stats = useMemo(() => {
    let revenue = 0;
    let cogs = 0;
    let transactionCount = 0;

    filteredSales.forEach(sale => {
      let saleRevenue = 0;
      let saleCogs = 0;
      let hasRelevantItem = false;
      sale.items.forEach(item => {
        if (categoryFilter === 'All' || item.category === categoryFilter) {
          saleRevenue += item.sellPrice * item.quantity;
          saleCogs += item.costPrice * item.quantity;
          hasRelevantItem = true;
        }
      });
      if (hasRelevantItem) {
        revenue += saleRevenue;
        cogs += saleCogs;
        transactionCount++;
      }
    });
    
    const grossProfit = revenue - cogs;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    return { revenue, cogs, grossProfit, margin, transactions: transactionCount };
  }, [filteredSales, categoryFilter]);

  const inventoryStats = useMemo(() => {
    const totalStock = filteredInventory.reduce((acc, p) => acc + p.stock, 0);
    const totalCostValue = filteredInventory.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
    const totalRetailValue = filteredInventory.reduce((acc, p) => acc + (p.sellPrice * p.stock), 0);
    const potentialProfit = totalRetailValue - totalCostValue;
    return { totalStock, totalCostValue, totalRetailValue, potentialProfit };
  }, [filteredInventory]);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const text = await generateBusinessInsight(filteredSales, products);
    setInsight(text);
    setLoadingAi(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(activeTab === 'dashboard' ? "Sales Report" : "Inventory Valuation Report", 14, 15);
    autoTable(doc, { 
      head: activeTab === 'dashboard' ? [['Date', 'ID', 'Items', 'Total']] : [['Product', 'Stock', 'Value']],
      body: activeTab === 'dashboard' ? filteredSales.map(s => [new Date(s.timestamp).toLocaleDateString(), s.id.slice(-6), s.items.length, s.total.toFixed(2)]) : filteredInventory.map(p => [p.name, p.stock, (p.sellPrice * p.stock).toFixed(2)]),
      startY: 25 
    });
    doc.save(`${activeTab}_report.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(activeTab === 'dashboard' ? filteredSales : filteredInventory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeTab}_report.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-colors">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90" title="Go Back">
                <ChevronLeft size={28} className="rtl:rotate-180" />
            </button>
            <div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Intelligence</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Analytics & AI Insights</p>
            </div>
        </div>
        
        <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-800">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 dark:bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-slate-900 dark:bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}>Stock Value</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-wrap gap-4 items-center shrink-0">
         <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4">
            <Filter size={18} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Filters</span>
         </div>
         <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl p-2.5 outline-none">
           <option value="today">Today</option>
           <option value="yesterday">Yesterday</option>
           <option value="last7">Last 7 Days</option>
           <option value="month">Month</option>
           <option value="all">All Time</option>
         </select>
         <div className="flex-1"></div>
         <div className="flex gap-2">
            <button onClick={exportPDF} className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"><FileText size={20} /></button>
            <button onClick={exportExcel} className="p-2.5 text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-xl transition-all"><FileSpreadsheet size={20} /></button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Revenue</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.revenue, language, CURRENCY)}</h3></div>
             <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-2xl text-green-600"><DollarSign size={24} /></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Transactions</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatNumber(stats.transactions, language)}</h3></div>
             <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-2xl text-purple-600"><PieChart size={24} /></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Gross Profit</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.grossProfit, language, CURRENCY)}</h3></div>
             <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-2xl text-blue-600"><TrendingUp size={24} /></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Inv Value</p><h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(inventoryStats.totalRetailValue, language, CURRENCY)}</h3></div>
             <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-2xl text-orange-600"><Package size={24} /></div>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-brand-950/30 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Sparkles size={120} /></div>
          <h3 className="text-xl font-black flex items-center gap-2 mb-4 italic uppercase tracking-tighter"><Sparkles className="text-yellow-400" /> AI Performance Analysis</h3>
          <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md text-sm border border-white/10 min-h-[100px] flex items-center justify-center">
            {insight ? <p className="leading-relaxed whitespace-pre-line">{insight}</p> : <p className="text-white/50 italic font-medium">Ready to analyze sales patterns and stock trends...</p>}
          </div>
          <button onClick={handleGenerateInsight} disabled={loadingAi} className="mt-6 bg-brand-500 hover:bg-brand-400 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl disabled:opacity-50">{loadingAi ? 'Analyzing...' : 'Generate AI Insights'}</button>
        </div>
      </div>
    </div>
  );
};