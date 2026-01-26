
import React, { useState, useMemo, useEffect } from 'react';
import { Sale, Product, Language, StockAdjustment } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, Sparkles, PieChart, FileText, ChevronLeft, Activity, Target, History, ClipboardList, Loader2, FileSpreadsheet, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { generateBusinessInsight } from '../services/geminiService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { formatNumber, formatCurrency } from '../utils/format';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  onGoBack?: () => void;
  language: Language;
}

type DateRange = 'today' | 'yesterday' | 'last7' | 'month' | 'custom' | 'all';
type ReportTab = 'FINANCIAL' | 'ADJUSTMENTS';

export const Reports: React.FC<ReportsProps> = ({ sales, products, onGoBack, language }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('FINANCIAL');
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  
  // Custom Date States
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('easyPOS_stockHistory');
    if(saved) setAdjustments(JSON.parse(saved));
  }, []);

  const getCustomTimeRange = () => {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  };

  const filteredSales = useMemo(() => {
    let result = [...sales];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    const last7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (dateRange === 'today') result = result.filter(s => s.timestamp >= today);
    else if (dateRange === 'yesterday') result = result.filter(s => s.timestamp >= yesterday && s.timestamp < today);
    else if (dateRange === 'last7') result = result.filter(s => s.timestamp >= last7);
    else if (dateRange === 'month') result = result.filter(s => s.timestamp >= monthStart);
    else if (dateRange === 'custom') {
      const range = getCustomTimeRange();
      result = result.filter(s => s.timestamp >= range.start && s.timestamp <= range.end);
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [sales, dateRange, customStart, customEnd]);

  const filteredAdjustments = useMemo(() => {
    let result = [...adjustments];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (dateRange === 'today') result = result.filter(a => a.timestamp >= today);
    else if (dateRange === 'custom') {
      const range = getCustomTimeRange();
      result = result.filter(a => a.timestamp >= range.start && a.timestamp <= range.end);
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [adjustments, dateRange, customStart, customEnd]);

  const stats = useMemo(() => {
    let revenue = 0, cogs = 0, tax = 0, discount = 0;
    filteredSales.forEach(sale => {
      revenue += sale.total;
      tax += (sale.tax || 0);
      discount += (sale.discount || 0);
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        cogs += (prod?.costPrice || 0) * item.quantity;
      });
    });
    return { revenue, cogs, profit: revenue - cogs, transactions: filteredSales.length, tax, discount };
  }, [filteredSales, products]);

  const exportExcel = () => {
    const data = activeTab === 'FINANCIAL' 
      ? filteredSales.map(s => ({
          'Invoice ID': `ORD-${s.id.slice(-6)}`,
          'Date': new Date(s.timestamp).toLocaleDateString(),
          'Time': new Date(s.timestamp).toLocaleTimeString(),
          'Revenue': s.total,
          'Cost': s.items.reduce((acc, i) => acc + ((products.find(p => p.id === i.id)?.costPrice || 0) * i.quantity), 0),
          'Profit': s.total - s.items.reduce((acc, i) => acc + ((products.find(p => p.id === i.id)?.costPrice || 0) * i.quantity), 0),
          'Method': s.paymentMethod
        }))
      : filteredAdjustments.map(a => ({
          'Date': new Date(a.timestamp).toLocaleDateString(),
          'Time': new Date(a.timestamp).toLocaleTimeString(),
          'Product': a.name,
          'SKU': a.sku,
          'Old Stock': a.oldStock,
          'New Stock': a.newStock,
          'Variance': a.variance
        }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "easyPOS_Report");
    XLSX.writeFile(wb, `easyPOS_${activeTab}_${dateRange}_${new Date().getTime()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`easyPOS ${activeTab} Audit Report`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.toUpperCase()}`, 14, 28);
    
    const body = activeTab === 'FINANCIAL'
      ? filteredSales.map(s => [
          new Date(s.timestamp).toLocaleString(),
          `ORD-${s.id.slice(-6)}`,
          formatCurrency(s.total, language, CURRENCY),
          formatCurrency(s.total - s.items.reduce((acc, i) => acc + ((products.find(p => p.id === i.id)?.costPrice || 0) * i.quantity), 0), language, CURRENCY)
        ])
      : filteredAdjustments.map(a => [
          new Date(a.timestamp).toLocaleString(),
          a.name,
          a.oldStock,
          a.newStock,
          a.variance
        ]);

    autoTable(doc, {
      head: [activeTab === 'FINANCIAL' ? ['Timestamp', 'Ref', 'Revenue', 'Profit'] : ['Timestamp', 'Product', 'Prev', 'New', 'Var']],
      body: body,
      startY: 35
    });
    doc.save(`easyPOS_${activeTab}_Audit.pdf`);
  };

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const text = await generateBusinessInsight(sales, products);
    setInsight(text);
    setLoadingAi(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-colors duration-500">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">BI Console</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Audit Ledger & Intelligence</p>
                </div>
            </div>
            <div className="flex bg-white dark:bg-slate-900 rounded-[1.8rem] p-1.5 shadow-xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setActiveTab('FINANCIAL')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FINANCIAL' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Financials</button>
                <button onClick={() => setActiveTab('ADJUSTMENTS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADJUSTMENTS' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Stock Audit</button>
            </div>
        </div>

        {/* Date Filters & Range Picker */}
        <div className="flex flex-col xl:flex-row gap-4">
            <div className="flex bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                {['today', 'yesterday', 'last7', 'month', 'custom', 'all'].map(r => (
                    <button key={r} onClick={() => setDateRange(r as DateRange)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${dateRange === r ? 'bg-slate-900 dark:bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-900'}`}>{r}</button>
                ))}
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-[1.5rem] shadow-sm border border-brand-500/30 animate-fade-in-left">
                  <div className="flex items-center gap-2 px-3">
                    <CalendarIcon size={14} className="text-brand-500" />
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none dark:text-white" />
                  </div>
                  <ArrowRight size={14} className="text-slate-300" />
                  <div className="flex items-center gap-2 px-3">
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none dark:text-white" />
                  </div>
              </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pb-10">
        {activeTab === 'FINANCIAL' ? (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl flex flex-col justify-center min-h-[300px]">
                    <div className="absolute top-0 right-0 p-12 opacity-5"><Activity size={240} /></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
                        <div className="space-y-3"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Total Revenue</span><span className="text-3xl font-black text-white">{formatCurrency(stats.revenue, language, CURRENCY)}</span></div>
                        <div className="space-y-3"><span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block">Net Profit</span><span className="text-3xl font-black text-brand-500">{formatCurrency(stats.profit, language, CURRENCY)}</span></div>
                        <div className="space-y-3"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Total Tax</span><span className="text-3xl font-black text-white">{formatCurrency(stats.tax, language, CURRENCY)}</span></div>
                        <div className="space-y-3"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Invoices</span><span className="text-3xl font-black text-white">{stats.transactions}</span></div>
                    </div>
                </div>
                <div className="lg:col-span-4 bg-brand-600 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between group">
                    <div>
                        <div className="flex items-center gap-3 mb-8"><PieChart size={24}/><h3 className="text-[11px] font-black uppercase tracking-widest text-brand-100">AI Intelligence Node</h3></div>
                        <p className="text-lg font-medium italic opacity-95 leading-relaxed line-clamp-4">{insight || "Analyze your terminal velocity and stock movement. Request a real-time audit via the AI core."}</p>
                    </div>
                    <button onClick={handleGenerateInsight} disabled={loadingAi} className="bg-white text-brand-600 w-full py-6 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 mt-12 flex items-center justify-center gap-3 italic">
                        {loadingAi ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={18}/>} {loadingAi ? 'Aggregating...' : 'Request Insight Audit'}
                    </button>
                </div>
            </div>

            {/* Data Ledger Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/10">
                    <div>
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Transaction Performance Ledger</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit of sales generated in selected period</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={exportExcel} className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={16}/> Excel Export</button>
                      <button onClick={exportPDF} className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"><FileText size={16}/> PDF Audit</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10">
                        <tr>
                          <th className="p-10">Timestamp</th>
                          <th className="p-10">Invoice Ref</th>
                          <th className="p-10 text-right">Revenue</th>
                          <th className="p-10 text-right text-brand-600">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {filteredSales.map(s => {
                            const cost = s.items.reduce((acc, i) => acc + ((products.find(p => p.id === i.id)?.costPrice || 0) * i.quantity), 0);
                            return (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                    <td className="p-10"><div className="font-black text-slate-900 dark:text-white text-base">{new Date(s.timestamp).toLocaleDateString()}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(s.timestamp).toLocaleTimeString()}</div></td>
                                    <td className="p-10 font-mono text-xs text-slate-400 uppercase font-black">#ORD-{s.id.slice(-6)}</td>
                                    <td className="p-10 text-right font-black text-slate-900 dark:text-white text-xl">{formatCurrency(s.total, language, CURRENCY)}</td>
                                    <td className="p-10 text-right font-black text-brand-600 text-xl">+{formatCurrency(s.total - cost, language, CURRENCY)}</td>
                                </tr>
                            );
                          })}
                          {filteredSales.length === 0 && (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-20">No matching sales records found</td></tr>
                          )}
                      </tbody>
                  </table>
                </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in-up">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/10">
                  <div>
                    <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Date-Wise Adjustment Audit</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual overrides and physical count adjustments</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={exportExcel} className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={16}/> Excel Export</button>
                    <button className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3.5 rounded-2xl text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><ClipboardList size={16} /> Accountability Mode</button>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-separate border-spacing-0">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10">
                          <tr><th className="p-10">Date & Time</th><th className="p-10">Product / SKU</th><th className="p-10 text-center">Previous</th><th className="p-10 text-center">Corrected</th><th className="p-10 text-right">Net Variance</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {filteredAdjustments.map(adj => (
                              <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                  <td className="p-10"><div className="font-black text-slate-900 dark:text-white text-base">{new Date(adj.timestamp).toLocaleDateString()}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(adj.timestamp).toLocaleTimeString()}</div></td>
                                  <td className="p-10"><div className="font-black text-slate-800 dark:text-slate-100">{adj.name}</div><div className="text-[10px] font-mono text-slate-400 tracking-widest mt-1">SKU: {adj.sku}</div></td>
                                  <td className="p-10 text-center font-bold text-slate-400">{adj.oldStock}</td>
                                  <td className="p-10 text-center font-black text-slate-900 dark:text-white">{adj.newStock}</td>
                                  <td className={`p-10 text-right font-black text-xl ${adj.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{adj.variance > 0 ? '+' : ''}{adj.variance}</td>
                              </tr>
                          ))}
                          {filteredAdjustments.length === 0 && (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-20">No matching adjustment records found</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
