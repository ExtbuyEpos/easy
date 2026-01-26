
import React, { useState, useMemo, useEffect } from 'react';
import { Sale, Product, Language, StockAdjustment, CartItem } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, Sparkles, PieChart, FileText, ChevronLeft, Activity, Target, History, ClipboardList, Loader2, FileSpreadsheet, Calendar as CalendarIcon, ArrowRight, Download, Package, ShoppingBag, BarChart3 } from 'lucide-react';
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
type ReportTab = 'FINANCIAL' | 'ADJUSTMENTS' | 'PRODUCTS';

export const Reports: React.FC<ReportsProps> = ({ sales, products, onGoBack, language }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('FINANCIAL');
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  
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

  const stats = useMemo(() => {
    let revenue = 0, cogs = 0, tax = 0, discount = 0;
    const productPerformance: Record<string, { name: string, qty: number, revenue: number, profit: number }> = {};
    const categoryPerformance: Record<string, { revenue: number, profit: number }> = {};

    filteredSales.forEach(sale => {
      revenue += sale.total;
      tax += (sale.tax || 0);
      discount += (sale.discount || 0);

      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        const itemCost = (prod?.costPrice || 0) * item.quantity;
        const itemRevenue = item.sellPrice * item.quantity;
        const itemProfit = itemRevenue - itemCost;
        
        cogs += itemCost;

        // Product performance
        if (!productPerformance[item.id]) {
          productPerformance[item.id] = { name: item.name, qty: 0, revenue: 0, profit: 0 };
        }
        productPerformance[item.id].qty += item.quantity;
        productPerformance[item.id].revenue += itemRevenue;
        productPerformance[item.id].profit += itemProfit;

        // Category performance
        const category = prod?.category || 'General';
        if (!categoryPerformance[category]) {
          categoryPerformance[category] = { revenue: 0, profit: 0 };
        }
        categoryPerformance[category].revenue += itemRevenue;
        categoryPerformance[category].profit += itemProfit;
      });
    });

    const topProducts = Object.values(productPerformance).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const categoryBreakdown = Object.entries(categoryPerformance).map(([name, data]) => ({ name, ...data }));

    return { 
      revenue, 
      cogs, 
      profit: revenue - cogs, 
      transactions: filteredSales.length, 
      tax, 
      discount,
      topProducts,
      categoryBreakdown
    };
  }, [filteredSales, products]);

  const handleExportExcel = () => {
    const filename = `easyPOS_${activeTab}_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const worksheet = XLSX.utils.json_to_sheet(filteredSales.map(s => ({
      'Invoice ID': `ORD-${s.id.slice(-6)}`,
      'Date': new Date(s.timestamp).toLocaleDateString(),
      'Revenue': s.total,
      'Tax': s.tax || 0,
      'Payment': s.paymentMethod
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
    XLSX.writeFile(workbook, filename);
  };

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    try {
      const res = await generateBusinessInsight(sales, products);
      setInsight(res);
    } catch (e) {
      setInsight("AI engine busy. Please retry in a moment.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="flex items-center gap-4">
                <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90"><ChevronLeft size={28} className="rtl:rotate-180" /></button>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">BI Control</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Real-time Performance Metrics</p>
                </div>
            </div>
            <div className="flex bg-white dark:bg-slate-900 rounded-[1.8rem] p-1.5 shadow-xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setActiveTab('FINANCIAL')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FINANCIAL' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Financials</button>
                <button onClick={() => setActiveTab('PRODUCTS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PRODUCTS' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Product BI</button>
            </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 items-start md:items-center">
            <div className="flex bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                {['today', 'yesterday', 'last7', 'month', 'all', 'custom'].map(r => (
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats Cards */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform"><TrendingUp size={160} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Revenue</p>
                            <h3 className="text-5xl font-black italic">{formatCurrency(stats.revenue, language, CURRENCY)}</h3>
                        </div>
                        <div className="mt-8 flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full">LIVE FEED</span>
                        </div>
                    </div>
                    <div className="bg-brand-600 rounded-[3rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform"><BarChart3 size={160} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-100 mb-2">Net Profit</p>
                            <h3 className="text-5xl font-black italic">{formatCurrency(stats.profit, language, CURRENCY)}</h3>
                        </div>
                        <div className="mt-8 flex items-center gap-4">
                            <div className="text-[10px] font-bold opacity-70">Margin: {stats.revenue > 0 ? formatNumber((stats.profit / stats.revenue) * 100, language) : 0}%</div>
                        </div>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col justify-between group">
                    <div>
                        <div className="flex items-center gap-3 mb-8 text-brand-500"><Sparkles size={24}/><h3 className="text-[11px] font-black uppercase tracking-widest">AI Audit Insights</h3></div>
                        <p className="text-lg font-medium italic opacity-80 leading-relaxed dark:text-white">{insight || "Analyze current performance trends using the Gemini BI engine for predictive growth tips."}</p>
                    </div>
                    <button onClick={handleGenerateInsight} disabled={loadingAi} className="bg-slate-900 dark:bg-slate-800 text-white w-full py-6 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 mt-10 flex items-center justify-center gap-3 italic transition-all">
                        {loadingAi ? <Loader2 size={20} className="animate-spin" /> : <Activity size={18}/>} {loadingAi ? 'Analyzing...' : 'Execute AI Audit'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Transactions Table */}
              <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/10">
                      <div>
                        <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Financial Transaction Ledger</h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit trail for selected period</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={16}/> Excel Export</button>
                      </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10">
                          <tr>
                            <th className="p-8">Timestamp</th>
                            <th className="p-8">Ref ID</th>
                            <th className="p-8 text-right">Method</th>
                            <th className="p-8 text-right">Revenue</th>
                            <th className="p-8 text-right text-brand-600">Net Profit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredSales.map(s => {
                              const cost = s.items.reduce((acc, i) => acc + ((products.find(p => p.id === i.id)?.costPrice || 0) * i.quantity), 0);
                              return (
                                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                      <td className="p-8"><div className="font-black text-slate-900 dark:text-white">{new Date(s.timestamp).toLocaleDateString()}</div><div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(s.timestamp).toLocaleTimeString()}</div></td>
                                      <td className="p-8 font-mono text-xs text-slate-400 uppercase font-black">#ORD-{s.id.slice(-6)}</td>
                                      <td className="p-8 text-right"><span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-500">{s.paymentMethod}</span></td>
                                      <td className="p-8 text-right font-black text-slate-900 dark:text-white text-lg">{formatCurrency(s.total, language, CURRENCY)}</td>
                                      <td className="p-8 text-right font-black text-brand-600 text-lg">+{formatCurrency(s.total - cost, language, CURRENCY)}</td>
                                  </tr>
                              );
                            })}
                            {filteredSales.length === 0 && (
                              <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-20">No matching sales records found</td></tr>
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Selling Products */}
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl">
                    <div className="flex items-center gap-3 mb-10"><ShoppingBag size={24} className="text-brand-500"/><h3 className="text-xl font-black italic uppercase tracking-tighter dark:text-white">Top Performance Products</h3></div>
                    <div className="space-y-6">
                        {stats.topProducts.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] group hover:bg-brand-600 hover:text-white transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">{i+1}</div>
                                    <div>
                                        <p className="font-black text-sm uppercase truncate max-w-[140px]">{p.name}</p>
                                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">Sold: {p.qty} units</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-lg">{formatCurrency(p.revenue, language, CURRENCY)}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 group-hover:text-white">+{formatCurrency(p.profit, language, CURRENCY)} Profit</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category Analysis */}
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl">
                    <div className="flex items-center gap-3 mb-10"><PieChart size={24} className="text-brand-500"/><h3 className="text-xl font-black italic uppercase tracking-tighter dark:text-white">Category Profitability</h3></div>
                    <div className="space-y-6">
                        {stats.categoryBreakdown.map((c, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="dark:text-white">{c.name}</span>
                                    <span className="text-brand-500">{formatCurrency(c.revenue, language, CURRENCY)}</span>
                                </div>
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    <div 
                                        className="h-full bg-brand-500 rounded-full transition-all duration-1000" 
                                        style={{ width: `${stats.revenue > 0 ? (c.revenue / stats.revenue) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <div className="text-[8px] text-emerald-500 font-black uppercase text-right">Contribution: {formatCurrency(c.profit, language, CURRENCY)} Net</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
