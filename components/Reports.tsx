
import React, { useState, useMemo, useEffect } from 'react';
import { Sale, Product, Language, StockAdjustment } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, DollarSign, Package, Sparkles, PieChart, FileText, FileSpreadsheet, Filter, ChevronLeft, Calendar, ArrowUpRight, Briefcase, Activity, CheckCircle2, Loader2, Target, Users, BarChart3, ShoppingBag, ArrowRightLeft, History } from 'lucide-react';
import { generateBusinessInsight } from '../services/geminiService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNumber, formatCurrency } from '../utils/format';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  onGoBack?: () => void;
  language: Language;
}

type DateRange = 'today' | 'yesterday' | 'last7' | 'month' | 'all';
type ReportTab = 'FINANCIAL' | 'ADJUSTMENTS';

export const Reports: React.FC<ReportsProps> = ({ sales, products, onGoBack, language }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('FINANCIAL');
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);

  useEffect(() => {
    if (db) {
        const q = query(collection(db, 'stock_history'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            setAdjustments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockAdjustment)));
        });
    } else {
        const saved = localStorage.getItem('easyPOS_stockHistory');
        if(saved) setAdjustments(JSON.parse(saved));
    }
  }, []);

  const filteredSales = useMemo(() => {
    let result = [...sales];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    const last7Days = new Date(now); last7Days.setDate(now.getDate() - 6); last7Days.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (dateRange === 'today') result = result.filter(s => s.timestamp >= today);
    else if (dateRange === 'yesterday') result = result.filter(s => s.timestamp >= yesterday && s.timestamp < today);
    else if (dateRange === 'last7') result = result.filter(s => s.timestamp >= last7Days.getTime());
    else if (dateRange === 'month') result = result.filter(s => s.timestamp >= monthStart);

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [sales, dateRange]);

  const stats = useMemo(() => {
    let revenue = 0;
    let cogs = 0;
    let tax = 0;
    let discount = 0;
    const productStats: { [id: string]: { name: string, qty: number, revenue: number, profit: number } } = {};

    filteredSales.forEach(sale => {
      revenue += sale.total;
      tax += (sale.tax || 0);
      discount += (sale.discount || 0);
      
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        const costPrice = item.costPrice || prod?.costPrice || 0;
        const itemCost = costPrice * item.quantity;
        const itemRevenue = item.sellPrice * item.quantity;
        
        cogs += itemCost;

        if (!productStats[item.id]) {
          productStats[item.id] = { name: item.name, qty: 0, revenue: 0, profit: 0 };
        }
        productStats[item.id].qty += item.quantity;
        productStats[item.id].revenue += itemRevenue;
        productStats[item.id].profit += (itemRevenue - itemCost);
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return { revenue, cogs, profit: revenue - cogs, transactions: filteredSales.length, tax, discount, topProducts };
  }, [filteredSales, products]);

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const text = await generateBusinessInsight(sales, products);
    setInsight(text);
    setLoadingAi(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Business Performance Audit", 14, 20);
    autoTable(doc, { 
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatCurrency(stats.revenue, language, CURRENCY)],
        ['Cost of Goods', formatCurrency(stats.cogs, language, CURRENCY)],
        ['Net Profit', formatCurrency(stats.profit, language, CURRENCY)],
        ['Tax Collected', formatCurrency(stats.tax, language, CURRENCY)],
      ],
      startY: 35
    });
    doc.save(`Performance_Audit_${dateRange}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-colors duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-6 shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm transition-all active:scale-90">
                <ChevronLeft size={28} className="rtl:rotate-180" />
            </button>
            <div>
                <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">BI Terminal</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Audit Ledger & Intelligence</p>
            </div>
        </div>

        <div className="flex bg-white dark:bg-slate-900 rounded-[1.8rem] p-1.5 shadow-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab('FINANCIAL')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FINANCIAL' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Financials</button>
            <button onClick={() => setActiveTab('ADJUSTMENTS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADJUSTMENTS' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Stock Audit</button>
        </div>

        <div className="flex bg-white dark:bg-slate-900 rounded-[1.8rem] p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
            {['today', 'yesterday', 'last7', 'month', 'all'].map(r => (
                <button key={r} onClick={() => setDateRange(r as DateRange)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${dateRange === r ? 'bg-slate-900 dark:bg-brand-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>{r}</button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pb-10">
        {activeTab === 'FINANCIAL' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl flex flex-col justify-center min-h-[340px]">
                    <div className="absolute top-0 right-0 p-12 opacity-5"><Activity size={240} /></div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-14">
                            <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 mb-3">Core Financial Performance</h3>
                                <p className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">Global Revenue Audit</p>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-3xl text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Target size={16} /> Audit Period: {dateRange.toUpperCase()}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">Total Revenue</span>
                                <span className="text-3xl font-black text-white leading-none">{formatCurrency(stats.revenue, language, CURRENCY)}</span>
                            </div>
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400 block">Net Profit</span>
                                <span className="text-3xl font-black text-brand-500 leading-none">{formatCurrency(stats.profit, language, CURRENCY)}</span>
                            </div>
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">Tax Collected</span>
                                <span className="text-3xl font-black text-white leading-none">{formatCurrency(stats.tax, language, CURRENCY)}</span>
                            </div>
                            <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block">Accuracy</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-xl font-black uppercase italic tracking-tighter">Optimal</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-4 bg-brand-600 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between group">
                    <div className="absolute -bottom-10 -right-10 p-12 opacity-10 group-hover:scale-125 transition-transform duration-1000"><Sparkles size={200} /></div>
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-white/10 rounded-2xl"><PieChart size={24}/></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-100">AI Intelligence Node</h3>
                        </div>
                        <p className="text-lg font-medium leading-relaxed opacity-95 italic">
                            {insight || "Analyze your terminal velocity and stock movement. Request a real-time audit via the AI core below."}
                        </p>
                    </div>
                    <button onClick={handleGenerateInsight} disabled={loadingAi} className="bg-white text-brand-600 w-full py-6 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 mt-12 flex items-center justify-center gap-3 italic">
                        {loadingAi ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={18}/>}
                        {loadingAi ? 'Aggregating...' : 'Request Insight Audit'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/10">
                    <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Sale Performance Ledger</h4>
                    <button onClick={exportPDF} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all">
                        <FileText size={18} /> Export Audit PDF
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] sticky top-0 z-10">
                            <tr>
                                <th className="p-10">Timestamp</th>
                                <th className="p-10">Invoice ID</th>
                                <th className="p-10 text-right">Revenue</th>
                                <th className="p-10 text-right">Cost Basis</th>
                                <th className="p-10 text-right text-brand-600">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredSales.map(s => {
                                const cost = s.items.reduce((acc, i) => acc + ((i.costPrice || products.find(p => p.id === i.id)?.costPrice || 0) * i.quantity), 0);
                                const profit = s.total - cost;
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                        <td className="p-10">
                                            <div className="font-black text-slate-900 dark:text-white text-base">{new Date(s.timestamp).toLocaleDateString()}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(s.timestamp).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="p-10 font-mono text-xs text-slate-400 group-hover:text-brand-500 transition-colors">#ORD-{s.id.slice(-6)}</td>
                                        <td className="p-10 text-right font-black text-slate-900 dark:text-white text-xl">{formatCurrency(s.total, language, CURRENCY)}</td>
                                        <td className="p-10 text-right font-bold text-slate-400 dark:text-slate-500">{formatCurrency(cost, language, CURRENCY)}</td>
                                        <td className="p-10 text-right font-black text-brand-600 dark:text-brand-400 text-xl group-hover:scale-105 transition-transform origin-right">
                                            +{formatCurrency(profit, language, CURRENCY)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in">
              <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900/10">
                  <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Inventory Adjustment Audit</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 rounded-2xl text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                      <History size={16} /> Date-Wise Tracking
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-separate border-spacing-0">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] sticky top-0 z-10">
                          <tr>
                              <th className="p-10">Timestamp</th>
                              <th className="p-10">Product Info</th>
                              <th className="p-10 text-center">Prev Stock</th>
                              <th className="p-10 text-center">New Stock</th>
                              <th className="p-10 text-right">Variance</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {adjustments.map(adj => (
                              <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                  <td className="p-10">
                                      <div className="font-black text-slate-900 dark:text-white text-base">{new Date(adj.timestamp).toLocaleDateString()}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(adj.timestamp).toLocaleTimeString()}</div>
                                  </td>
                                  <td className="p-10">
                                      <div className="font-black text-slate-800 dark:text-slate-100">{adj.name}</div>
                                      <div className="text-[10px] font-mono text-slate-400 tracking-widest mt-1">SKU: {adj.sku}</div>
                                  </td>
                                  <td className="p-10 text-center font-bold text-slate-400">{adj.oldStock}</td>
                                  <td className="p-10 text-center font-black text-slate-900 dark:text-white">{adj.newStock}</td>
                                  <td className={`p-10 text-right font-black text-xl ${adj.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {adj.variance > 0 ? '+' : ''}{adj.variance}
                                  </td>
                              </tr>
                          ))}
                          {adjustments.length === 0 && (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-20">No stock adjustment history recorded</td></tr>
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
