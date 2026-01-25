
import React, { useState, useMemo } from 'react';
import { Sale, Product, Language } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, DollarSign, Package, Sparkles, PieChart, FileText, FileSpreadsheet, Filter, ChevronLeft, Calendar } from 'lucide-react';
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

  const todayStats = useMemo(() => {
    const todayTimestamp = new Date().setHours(0,0,0,0);
    const todaySales = sales.filter(s => s.timestamp >= todayTimestamp);
    const revenue = todaySales.reduce((acc, s) => acc + s.total, 0);
    const count = todaySales.length;
    return { revenue, count };
  }, [sales]);

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
      body: activeTab === 'dashboard' ? filteredSales.map(s => [new Date(s.timestamp).toLocaleDateString(), s.id.slice(-6), s.items.length, s.total.toFixed(2)]) : products.map(p => [p.name, p.stock, (p.sellPrice * p.stock).toFixed(2)]),
      startY: 25 
    });
    doc.save(`${activeTab}_report.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(activeTab === 'dashboard' ? filteredSales : products);
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
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Analytics & Sale Reports</p>
            </div>
        </div>
        
        <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-800">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 dark:bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-slate-900 dark:bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}>Inventory</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1">
        {/* Daily Sale Performance Highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex items-center">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Calendar size={120} /></div>
                <div className="relative z-10 w-full">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Today's Performance</h3>
                            <p className="text-4xl font-black italic uppercase tracking-tighter">Daily Sale Summary</p>
                        </div>
                        <div className="bg-brand-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Revenue</span>
                            <span className="text-2xl font-black">{formatCurrency(todayStats.revenue, language, CURRENCY)}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Orders</span>
                            <span className="text-2xl font-black">{formatNumber(todayStats.count, language)}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Avg Ticket</span>
                            <span className="text-2xl font-black">{formatCurrency(todayStats.count > 0 ? todayStats.revenue / todayStats.count : 0, language, CURRENCY)}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Status</span>
                            <span className="text-2xl font-black text-emerald-400">ACTIVE</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-brand-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute bottom-0 right-0 p-4 opacity-20"><TrendingUp size={100} /></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-200 mb-4">AI Business Analyst</h3>
                <p className="text-sm font-medium leading-relaxed mb-6 opacity-90">{insight || "Tap to generate AI business insights based on current performance data."}</p>
                <button onClick={handleGenerateInsight} disabled={loadingAi} className="bg-white text-brand-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50">
                    {loadingAi ? 'Calculating...' : 'Generate Insight'}
                </button>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
            <Filter size={18} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter Report</span>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl p-2.5 outline-none">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="month">Month</option>
                <option value="all">All Time</option>
            </select>
            <div className="flex-1"></div>
            <div className="flex gap-2">
                <button onClick={exportPDF} className="p-3 text-slate-500 hover:text-red-600 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all" title="Export PDF"><FileText size={20} /></button>
                <button onClick={exportExcel} className="p-3 text-slate-500 hover:text-green-600 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all" title="Export Excel"><FileSpreadsheet size={20} /></button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 w-fit rounded-2xl text-emerald-600 mb-6"><DollarSign size={24} /></div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Selected Revenue</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.revenue, language, CURRENCY)}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 w-fit rounded-2xl text-blue-600 mb-6"><TrendingUp size={24} /></div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Gross Profit</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.grossProfit, language, CURRENCY)}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="bg-purple-50 dark:bg-purple-950/20 p-3 w-fit rounded-2xl text-purple-600 mb-6"><PieChart size={24} /></div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Sales Count</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{formatNumber(stats.transactions, language)}</h3>
            </div>
        </div>
      </div>
    </div>
  );
};
