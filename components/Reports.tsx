import React, { useState, useMemo } from 'react';
import { Sale, Product } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, DollarSign, Package, Calendar, Sparkles, PieChart, FileText, FileSpreadsheet, Filter, X, ArrowRight, Download } from 'lucide-react';
import { generateBusinessInsight } from '../services/geminiService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportsProps {
  sales: Sale[];
  products: Product[];
}

type DateRange = 'today' | 'yesterday' | 'last7' | 'week' | 'month' | 'all' | 'custom';
type ReportTab = 'dashboard' | 'inventory';

export const Reports: React.FC<ReportsProps> = ({ sales, products }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Filter States
  const [activeTab, setActiveTab] = useState<ReportTab>('dashboard');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Derived Options
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category))).sort()], [products]);

  // Filter Sales
  const filteredSales = useMemo(() => {
    let result = sales;

    // 1. Date Filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
    
    // Last 7 days (including today)
    const last7Days = new Date(now);
    last7Days.setDate(now.getDate() - 6);
    last7Days.setHours(0,0,0,0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday start
    weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (dateRange === 'today') {
      result = result.filter(s => s.timestamp >= today);
    } else if (dateRange === 'yesterday') {
      result = result.filter(s => s.timestamp >= yesterday && s.timestamp < today);
    } else if (dateRange === 'last7') {
      result = result.filter(s => s.timestamp >= last7Days.getTime());
    } else if (dateRange === 'week') {
      result = result.filter(s => s.timestamp >= weekStart.getTime());
    } else if (dateRange === 'month') {
      result = result.filter(s => s.timestamp >= monthStart);
    } else if (dateRange === 'custom' && customStart && customEnd) {
      const start = new Date(customStart).getTime();
      const end = new Date(customEnd).setHours(23, 59, 59, 999);
      result = result.filter(s => s.timestamp >= start && s.timestamp <= end);
    }

    // 2. Payment Filter
    if (paymentFilter !== 'All') {
      result = result.filter(s => s.paymentMethod === paymentFilter);
    }

    // 3. Category Filter (Keep sales that have at least one item in category)
    if (categoryFilter !== 'All') {
      result = result.filter(s => s.items.some(i => i.category === categoryFilter));
    }

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [sales, dateRange, customStart, customEnd, paymentFilter, categoryFilter]);

  // Filter Inventory (for Inventory Tab)
  const filteredInventory = useMemo(() => {
    if (categoryFilter === 'All') return products;
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

  // Calculate Dashboard Stats (Revenue, Profit, etc.)
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

    return {
      revenue,
      cogs,
      grossProfit,
      margin,
      transactions: transactionCount
    };
  }, [filteredSales, categoryFilter]);

  // Calculate Inventory Value Stats
  const inventoryStats = useMemo(() => {
    const totalStock = filteredInventory.reduce((acc, p) => acc + p.stock, 0);
    const totalCostValue = filteredInventory.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
    const totalRetailValue = filteredInventory.reduce((acc, p) => acc + (p.sellPrice * p.stock), 0);
    const potentialProfit = totalRetailValue - totalCostValue;
    
    return { totalStock, totalCostValue, totalRetailValue, potentialProfit };
  }, [filteredInventory]);

  // Top Selling Items (Approximate based on filtered sales)
  const topSelling = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(s => {
      s.items.forEach(i => {
         if (categoryFilter === 'All' || i.category === categoryFilter) {
           map.set(i.name, (map.get(i.name) || 0) + i.quantity);
         }
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredSales, categoryFilter]);


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
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    if (activeTab === 'dashboard') {
        doc.text(`Period: ${dateRange.toUpperCase()}`, 14, 27);
    }
    
    if (activeTab === 'dashboard') {
        const tableData = filteredSales.map(s => [
        new Date(s.timestamp).toLocaleDateString(),
        s.id.slice(-6),
        s.items.map(i => `${i.name} (${i.quantity})`).join(', '),
        s.paymentMethod,
        `${CURRENCY}${s.total.toFixed(2)}`
        ]);

        autoTable(doc, {
        head: [['Date', 'ID', 'Items', 'Payment', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 35;
        
        doc.setFontSize(12);
        doc.text(`Total Revenue: ${CURRENCY}${stats.revenue.toFixed(2)}`, 14, finalY + 10);
        doc.text(`Total Transactions: ${stats.transactions}`, 14, finalY + 16);
    } else {
        // Inventory Report
        const tableData = filteredInventory.map(p => [
            p.name,
            p.category,
            p.stock.toString(),
            `${CURRENCY}${p.costPrice.toFixed(2)}`,
            `${CURRENCY}${p.sellPrice.toFixed(2)}`,
            `${CURRENCY}${(p.sellPrice * p.stock).toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [['Product', 'Category', 'Stock', 'Cost', 'Price', 'Total Value']],
            body: tableData,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 30;
        doc.setFontSize(12);
        doc.text(`Total Retail Value: ${CURRENCY}${inventoryStats.totalRetailValue.toFixed(2)}`, 14, finalY + 10);
    }

    doc.save(`${activeTab}_report.pdf`);
  };

  const exportExcel = () => {
    if (activeTab === 'dashboard') {
        const ws = XLSX.utils.json_to_sheet(filteredSales.map(s => ({
        ID: s.id,
        Date: new Date(s.timestamp).toLocaleDateString(),
        Time: new Date(s.timestamp).toLocaleTimeString(),
        Total: s.total,
        PaymentMethod: s.paymentMethod,
        Items: s.items.map(i => `${i.name} (x${i.quantity})`).join(', ')
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales");
        XLSX.writeFile(wb, `sales_report_${dateRange}.xlsx`);
    } else {
        const ws = XLSX.utils.json_to_sheet(filteredInventory.map(p => ({
            Name: p.name,
            Category: p.category,
            Stock: p.stock,
            Cost: p.costPrice,
            Price: p.sellPrice,
            TotalValue: p.stock * p.sellPrice
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, `inventory_report.xlsx`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports & Analytics</h2>
          <p className="text-slate-500">Track performance and gain AI-powered insights.</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
          <button 
             onClick={() => setActiveTab('dashboard')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
          >
             Sales Dashboard
          </button>
          <button 
             onClick={() => setActiveTab('inventory')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'inventory' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
          >
             Inventory Valuation
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center shrink-0">
         <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Filters</span>
         </div>

         {activeTab === 'dashboard' && (
           <>
             {/* Date Range Pills */}
             <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
               {['today', 'yesterday', 'last7', 'month', 'all', 'custom'].map((range) => (
                 <button
                    key={range}
                    onClick={() => setDateRange(range as DateRange)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${dateRange === range ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   {range === 'last7' ? 'Last 7 Days' : range}
                 </button>
               ))}
             </div>

             {dateRange === 'custom' && (
               <div className="flex items-center gap-2 animate-fade-in">
                 <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="p-1.5 text-xs border border-slate-200 rounded-md outline-none focus:border-brand-500" />
                 <span className="text-slate-400 text-xs">to</span>
                 <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="p-1.5 text-xs border border-slate-200 rounded-md outline-none focus:border-brand-500" />
               </div>
             )}
             
             <div className="h-6 w-px bg-slate-200 mx-2"></div>
           </>
         )}

         <select 
           value={categoryFilter}
           onChange={(e) => setCategoryFilter(e.target.value)}
           className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2 outline-none"
         >
           {categories.map(c => <option key={c} value={c}>Category: {c}</option>)}
         </select>

         {activeTab === 'dashboard' && (
             <select 
             value={paymentFilter}
             onChange={(e) => setPaymentFilter(e.target.value)}
             className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2 outline-none"
             >
             <option value="All">Payment: All</option>
             <option value="CASH">Cash</option>
             <option value="CARD">Card</option>
             </select>
         )}
         
         <div className="flex-1"></div>
         
         {/* Export Actions */}
         <div className="flex gap-2">
            <button onClick={exportPDF} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Export PDF">
              <FileText size={20} />
            </button>
            <button onClick={exportExcel} className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Export Excel">
              <FileSpreadsheet size={20} />
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                 <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-slate-900">{CURRENCY}{stats.revenue.toFixed(2)}</h3>
                 </div>
                 <div className="bg-green-100 p-3 rounded-full text-green-600"><DollarSign size={24} /></div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                 <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Gross Profit</p>
                    <h3 className="text-2xl font-bold text-slate-900">{CURRENCY}{stats.grossProfit.toFixed(2)}</h3>
                 </div>
                 <div className="bg-blue-100 p-3 rounded-full text-blue-600"><TrendingUp size={24} /></div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                 <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Transactions</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.transactions}</h3>
                 </div>
                 <div className="bg-purple-100 p-3 rounded-full text-purple-600"><FileText size={24} /></div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                 <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Avg Margin</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.margin.toFixed(1)}%</h3>
                 </div>
                 <div className="bg-orange-100 p-3 rounded-full text-orange-600"><PieChart size={24} /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* AI INSIGHTS */}
               <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10"><Sparkles size={120} /></div>
                  <div className="relative z-10">
                     <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                       <Sparkles className="text-yellow-400" /> AI Business Analyst
                     </h3>
                     {insight ? (
                       <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm text-sm leading-relaxed whitespace-pre-line border border-white/10">
                         {insight}
                       </div>
                     ) : (
                       <div className="text-slate-300 text-sm italic">
                         Generate intelligent insights based on your current sales data to optimize your business.
                       </div>
                     )}
                     <div className="mt-4 flex gap-2">
                        <button 
                          onClick={handleGenerateInsight}
                          disabled={loadingAi}
                          className="bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          {loadingAi ? 'Analyzing Data...' : 'Generate New Insights'}
                        </button>
                        {insight && <button onClick={() => setInsight(null)} className="text-slate-400 hover:text-white px-3 py-2 text-sm">Clear</button>}
                     </div>
                  </div>
               </div>

               {/* TOP PRODUCTS */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package size={18} className="text-brand-600"/> Top Selling Items</h3>
                  <div className="space-y-4">
                     {topSelling.length > 0 ? topSelling.map(([name, qty], i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">{i+1}</span>
                              <span className="text-slate-700 truncate max-w-[120px]" title={name}>{name}</span>
                           </div>
                           <span className="font-bold text-slate-900">{qty} Sold</span>
                        </div>
                     )) : (
                       <div className="text-center text-slate-400 text-xs py-4">No sales data for this period</div>
                     )}
                  </div>
               </div>
            </div>

            {/* RECENT TRANSACTIONS TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Recent Transactions</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-600 font-semibold">
                     <tr>
                       <th className="p-4 border-b">Date</th>
                       <th className="p-4 border-b">ID</th>
                       <th className="p-4 border-b">Items</th>
                       <th className="p-4 border-b">Payment</th>
                       <th className="p-4 border-b text-right">Total</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredSales.length > 0 ? filteredSales.slice(0, 10).map(s => (
                       <tr key={s.id} className="hover:bg-slate-50">
                         <td className="p-4 text-slate-500">{new Date(s.timestamp).toLocaleDateString()} <span className="text-xs">{new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                         <td className="p-4 font-mono text-xs text-slate-400">#{s.id.slice(-6)}</td>
                         <td className="p-4 text-slate-700 truncate max-w-xs">{s.items.map(i => i.name).join(', ')}</td>
                         <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{s.paymentMethod}</span></td>
                         <td className="p-4 text-right font-bold text-slate-900">{CURRENCY}{s.total.toFixed(2)}</td>
                       </tr>
                     )) : (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No transactions found for the selected period.</td></tr>
                     )}
                   </tbody>
                 </table>
                 {filteredSales.length > 10 && (
                   <div className="p-3 text-center border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                     Showing 10 most recent of {filteredSales.length} transactions
                   </div>
                 )}
               </div>
            </div>
          </div>
        ) : (
          /* INVENTORY VALUATION TAB */
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="text-slate-500 text-sm font-medium mb-2">Total Inventory Cost</h3>
                   <div className="text-3xl font-bold text-slate-800">{CURRENCY}{inventoryStats.totalCostValue.toFixed(2)}</div>
                   <p className="text-xs text-slate-400 mt-1">Capital invested in stock</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="text-slate-500 text-sm font-medium mb-2">Total Retail Value</h3>
                   <div className="text-3xl font-bold text-brand-600">{CURRENCY}{inventoryStats.totalRetailValue.toFixed(2)}</div>
                   <p className="text-xs text-slate-400 mt-1">Projected revenue from stock</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="text-slate-500 text-sm font-medium mb-2">Potential Profit</h3>
                   <div className="text-3xl font-bold text-green-600">{CURRENCY}{inventoryStats.potentialProfit.toFixed(2)}</div>
                   <p className="text-xs text-slate-400 mt-1">Projected gross profit</p>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Stock Value by Product</h3>
                  <div className="text-xs text-slate-500">Total Items: {inventoryStats.totalStock}</div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-4 border-b">Product</th>
                        <th className="p-4 border-b">Category</th>
                        <th className="p-4 border-b text-right">Stock</th>
                        <th className="p-4 border-b text-right">Cost (Unit)</th>
                        <th className="p-4 border-b text-right">Price (Unit)</th>
                        <th className="p-4 border-b text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInventory.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-800">{p.name}</td>
                          <td className="p-4 text-slate-500">{p.category}</td>
                          <td className={`p-4 text-right font-bold ${p.stock < 10 ? 'text-red-500' : 'text-slate-600'}`}>{p.stock}</td>
                          <td className="p-4 text-right text-slate-500">{CURRENCY}{p.costPrice.toFixed(2)}</td>
                          <td className="p-4 text-right text-slate-500">{CURRENCY}{p.sellPrice.toFixed(2)}</td>
                          <td className="p-4 text-right font-mono font-bold text-brand-600">{CURRENCY}{(p.sellPrice * p.stock).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};