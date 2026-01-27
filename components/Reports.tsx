
import React, { useState, useMemo, useEffect } from 'react';
import { Sale, Product, Language, StockAdjustment, CartItem, User } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, Sparkles, PieChart, FileText, ChevronLeft, Activity, Target, History, ClipboardList, Loader2, FileSpreadsheet, Calendar as CalendarIcon, ArrowRight, Download, Package, ShoppingBag, BarChart3, Users, Zap, CalendarDays, Wallet, ReceiptText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  users?: User[];
}

type DateRange = 'today' | 'yesterday' | 'last7' | 'month' | 'custom' | 'all';
type ReportTab = 'FINANCIAL' | 'PRODUCTS' | 'OPERATORS';

export const Reports: React.FC<ReportsProps> = ({ sales, products, onGoBack, language, users = [] }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('FINANCIAL');
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const filtered = sales.filter(s => {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      const last7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      if (dateRange === 'today') return s.timestamp >= todayTimestamp;
      if (dateRange === 'yesterday') return s.timestamp >= yesterday && s.timestamp < todayTimestamp;
      if (dateRange === 'last7') return s.timestamp >= last7;
      if (dateRange === 'month') return s.timestamp >= monthStart;
      if (dateRange === 'custom') {
        const start = new Date(customStart).setHours(0,0,0,0);
        const end = new Date(customEnd).setHours(23,59,59,999);
        return s.timestamp >= start && s.timestamp <= end;
      }
      return true;
    });

    let revenue = 0, cogs = 0, tax = 0, discount = 0, cashTotal = 0, cardTotal = 0;
    const productPerformance: Record<string, { name: string, qty: number, revenue: number, profit: number }> = {};
    const categoryPerformance: Record<string, { revenue: number, profit: number }> = {};
    const operatorPerformance: Record<string, { name: string, sales: number, count: number }> = {};

    filtered.forEach(sale => {
      revenue += sale.total;
      tax += (sale.tax || 0);
      discount += (sale.discount || 0);
      
      if (sale.paymentMethod === 'CASH') cashTotal += sale.total;
      else cardTotal += sale.total;

      const opId = sale.processedBy || 'unknown';
      if (!operatorPerformance[opId]) {
        const user = users.find(u => u.id === opId);
        operatorPerformance[opId] = { name: user?.name || 'System', sales: 0, count: 0 };
      }
      operatorPerformance[opId].sales += sale.total;
      operatorPerformance[opId].count += 1;

      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        const itemCost = (prod?.costPrice || 0) * item.quantity;
        const itemRevenue = item.sellPrice * item.quantity;
        const itemProfit = itemRevenue - itemCost;
        
        cogs += itemCost;

        if (!productPerformance[item.id]) {
          productPerformance[item.id] = { name: item.name, qty: 0, revenue: 0, profit: 0 };
        }
        productPerformance[item.id].qty += item.quantity;
        productPerformance[item.id].revenue += itemRevenue;
        productPerformance[item.id].profit += itemProfit;

        const category = prod?.category || 'General';
        if (!categoryPerformance[category]) {
          categoryPerformance[category] = { revenue: 0, profit: 0 };
        }
        categoryPerformance[category].revenue += itemRevenue;
        categoryPerformance[category].profit += itemProfit;
      });
    });

    const topProducts = Object.values(productPerformance).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const categoryBreakdown = Object.entries(categoryPerformance).map(([name, data]) => ({ name, ...data }));
    const operators = Object.values(operatorPerformance).sort((a, b) => b.sales - a.sales);

    // Specifically for TODAY'S QUICK SUMMARY
    const todaySales = sales.filter(s => s.timestamp >= todayTimestamp);
    const todayRevenue = todaySales.reduce((a, s) => a + s.total, 0);

    return { 
      revenue, cogs, profit: revenue - cogs, transactions: filtered.length, tax, discount,
      cashTotal, cardTotal, topProducts, categoryBreakdown, operators, filteredSales: filtered,
      todayRevenue, todayCount: todaySales.length
    };
  }, [sales, products, dateRange, customStart, customEnd, users]);

  const handleExportZReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(`Z-REPORT: ${dateRange.toUpperCase()}`, 14, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    
    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Gross Revenue', formatCurrency(stats.revenue, language, CURRENCY)],
        ['Total Net Profit', formatCurrency(stats.profit, language, CURRENCY)],
        ['Total Tax Collected', formatCurrency(stats.tax, language, CURRENCY)],
        ['Discounts Applied', formatCurrency(stats.discount, language, CURRENCY)],
        ['---', '---'],
        ['Cash Revenue', formatCurrency(stats.cashTotal, language, CURRENCY)],
        ['Card Revenue', formatCurrency(stats.cardTotal, language, CURRENCY)],
        ['Transaction Count', stats.transactions.toString()]
      ],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Operator', 'Sales Count', 'Total Sales']],
      body: stats.operators.map(op => [op.name, op.count, formatCurrency(op.sales, language, CURRENCY)]),
      headStyles: { fillColor: [14, 165, 233] }
    });

    doc.save(`Z_REPORT_${dateRange}_${Date.now()}.pdf`);
  };

  const handleExportProcurementList = () => {
    const lowStock = products.filter(p => p.stock < 10);
    const data = lowStock.map(p => ({
        'SKU': p.sku,
        'Product Name': p.name,
        'Category': p.category,
        'Current Stock': p.stock,
        'Target Stock': 50,
        'Required Order': 50 - p.stock,
        'Approx Cost': (50 - p.stock) * p.costPrice
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Procurement");
    XLSX.writeFile(workbook, `RESTOCK_GUIDE_${Date.now()}.xlsx`);
  };

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    try {
      const res = await generateBusinessInsight(sales, products);
      setInsight(res);
    } catch (e) {
      setInsight("AI engine sync failure. Retry in 60s.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-all">
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div className="flex items-center gap-4">
                <button 
                  onClick={onGoBack} 
                  className="p-3 -ml-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-90 hover:text-brand-600" 
                  title="Go Back"
                >
                  <ChevronLeft size={28} className="rtl:rotate-180" />
                </button>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">BI Intelligence</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Audit Control & Data Analytics</p>
                </div>
            </div>
            <div className="flex bg-white dark:bg-slate-900 rounded-[1.8rem] p-1.5 shadow-xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setActiveTab('FINANCIAL')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'FINANCIAL' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Ledger</button>
                <button onClick={() => setActiveTab('PRODUCTS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PRODUCTS' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Stock Performance</button>
                <button onClick={() => setActiveTab('OPERATORS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'OPERATORS' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400'}`}>Personnel</button>
            </div>
        </div>

        <div className="flex flex-col xl:flex-row justify-between gap-4 items-start md:items-center">
            <div className="flex bg-white dark:bg-slate-900 rounded-[1.5rem] p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                {['today', 'yesterday', 'last7', 'month', 'all', 'custom'].map(r => (
                    <button key={r} onClick={() => setDateRange(r as DateRange)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${dateRange === r ? 'bg-slate-900 dark:bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-900'}`}>{r}</button>
                ))}
            </div>
            
            <div className="flex gap-3">
               <button onClick={handleExportZReport} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"><FileText size={16}/> Download PDF</button>
               <button onClick={handleExportProcurementList} className="px-6 py-3 bg-brand-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Package size={16}/> Restock Sheet</button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pb-10">
        {activeTab === 'FINANCIAL' ? (
          <div className="space-y-8 animate-fade-in">
            {/* Daily Sale Prominent Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><CalendarDays size={80} className="text-brand-500" /></div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Today's Revenue</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency(stats.todayRevenue, language, CURRENCY)}</span>
                            <span className="text-[10px] font-black text-emerald-500 mb-0.5 flex items-center gap-1"><ArrowUpRight size={10}/> Live</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><ReceiptText size={80} className="text-amber-500" /></div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Today's Orders</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{stats.todayCount}</span>
                            <span className="text-[10px] font-black text-slate-400 mb-0.5 uppercase">Checkouts</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={80} className="text-emerald-500" /></div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Today's Cash Flow</span>
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-400 uppercase">Cash:</span><span className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(stats.cashTotal, language, CURRENCY)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-400 uppercase">Card:</span><span className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(stats.cardTotal, language, CURRENCY)}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl flex flex-col justify-center min-h-[300px] group border border-white/5">
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:rotate-12 transition-transform duration-1000"><TrendingUp size={240} /></div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Period Revenue</span>
                            <span className="text-4xl font-black text-white">{formatCurrency(stats.revenue, language, CURRENCY)}</span>
                        </div>
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block">Net Profit</span>
                            <span className="text-4xl font-black text-brand-500">{formatCurrency(stats.profit, language, CURRENCY)}</span>
                        </div>
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Period Tax</span>
                            <span className="text-4xl font-black text-white">{formatCurrency(stats.tax, language, CURRENCY)}</span>
                        </div>
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Discounts</span>
                            <span className="text-4xl font-black text-rose-500">{formatCurrency(stats.discount, language, CURRENCY)}</span>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-4 bg-brand-600 rounded-[3.5rem] p-10 md:p-12 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between group">
                    <div>
                        <div className="flex items-center gap-3 mb-6"><Sparkles size={24}/><h3 className="text-[11px] font-black uppercase tracking-widest text-brand-100">Intelligent Insights</h3></div>
                        <p className="text-base font-medium italic opacity-95 leading-relaxed line-clamp-4">{insight || "Perform a deep-logic scan to identify sales anomalies and high-converting categories for this specific period."}</p>
                    </div>
                    <button onClick={handleGenerateInsight} disabled={loadingAi} className="bg-white text-brand-600 w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 mt-10 flex items-center justify-center gap-3 italic transition-all">
                        {loadingAi ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18}/>} {loadingAi ? 'Processing...' : 'Generate BI Insight'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-900/10">
                    <div>
                      <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Transactional Ledger</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed operational log for {dateRange}</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="p-10">Timestamp</th>
                          <th className="p-10">Client Detail</th>
                          <th className="p-10">Invoice ID</th>
                          <th className="p-10 text-right">Revenue</th>
                          <th className="p-10 text-right text-brand-600">Net Contribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {stats.filteredSales.map(s => {
                            const cost = s.items.reduce((acc, i) => acc + ((products.find(p => p.id === i.id)?.costPrice || 0) * i.quantity), 0);
                            return (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                    <td className="p-10"><div className="font-black text-slate-900 dark:text-white text-base">{new Date(s.timestamp).toLocaleDateString()}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(s.timestamp).toLocaleTimeString()}</div></td>
                                    <td className="p-10">
                                        {s.customerName ? (
                                            <div><div className="font-black text-slate-800 dark:text-slate-100 uppercase italic text-xs">{s.customerName}</div><div className="text-[9px] font-bold text-slate-400 mt-1">{s.customerPhone || 'NO PHONE'}</div></div>
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-200 uppercase italic">Walking Customer</span>
                                        )}
                                    </td>
                                    <td className="p-10 font-mono text-xs text-slate-400 uppercase font-black tracking-widest">#ORD-{s.id.slice(-6)}</td>
                                    <td className="p-10 text-right font-black text-slate-900 dark:text-white text-xl">{formatCurrency(s.total, language, CURRENCY)}</td>
                                    <td className="p-10 text-right font-black text-brand-600 text-xl">+{formatCurrency(s.total - cost, language, CURRENCY)}</td>
                                </tr>
                            );
                          })}
                      </tbody>
                  </table>
                </div>
            </div>
          </div>
        ) : activeTab === 'PRODUCTS' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl">
                  <div className="flex items-center gap-3 mb-10"><ShoppingBag size={24} className="text-brand-500"/><h3 className="text-xl font-black italic uppercase tracking-tighter dark:text-white">Velocity Top 10</h3></div>
                  <div className="space-y-6">
                      {stats.topProducts.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem] group hover:bg-brand-600 hover:text-white transition-all">
                              <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xs shadow-sm">{i+1}</div>
                                  <div>
                                      <p className="font-black text-sm uppercase truncate max-w-[140px]">{p.name}</p>
                                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">Volume: {p.qty} units</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="font-black text-lg">{formatCurrency(p.revenue, language, CURRENCY)}</p>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 group-hover:text-white">+{formatCurrency(p.profit, language, CURRENCY)} Net</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl">
                  <div className="flex items-center gap-3 mb-10"><PieChart size={24} className="text-brand-500"/><h3 className="text-xl font-black italic uppercase tracking-tighter dark:text-white">Portfolio Contribution</h3></div>
                  <div className="space-y-8">
                      {stats.categoryBreakdown.map((c, i) => (
                          <div key={i} className="space-y-3">
                              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                                  <span className="dark:text-white">{c.name}</span>
                                  <span className="text-brand-500">{formatCurrency(c.revenue, language, CURRENCY)}</span>
                              </div>
                              <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                                  <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: `${stats.revenue > 0 ? (c.revenue / stats.revenue) * 100 : 0}%` }}></div>
                              </div>
                              <div className="text-[9px] text-emerald-500 font-black uppercase text-right tracking-widest">Margin Weight: {formatCurrency(c.profit, language, CURRENCY)}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in-left">
              <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <Users className="text-brand-600" size={32} />
                      <div>
                          <h4 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Personnel Audit Matrix</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Transaction accountability & performance tracking</p>
                      </div>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-widest sticky top-0 z-10">
                          <tr>
                              <th className="p-10">Operator Node</th>
                              <th className="p-10 text-center">Checkout Count</th>
                              <th className="p-10 text-right">Revenue Dispatch</th>
                              <th className="p-10 text-right">Portfolio Share</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {stats.operators.map((op, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                  <td className="p-10">
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-xl uppercase">{op.name.charAt(0)}</div>
                                          <div className="font-black text-slate-900 dark:text-white uppercase italic">{op.name}</div>
                                      </div>
                                  </td>
                                  <td className="p-10 text-center font-black text-slate-400 text-xl">{op.count}</td>
                                  <td className="p-10 text-right font-black text-slate-900 dark:text-white text-2xl">{formatCurrency(op.sales, language, CURRENCY)}</td>
                                  <td className="p-10 text-right">
                                      <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-500">
                                          {formatNumber((op.sales / stats.revenue) * 100, language)}% Total Gross
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
