import React, { useState, useMemo } from 'react';
import { Sale, Product } from '../types';
import { CURRENCY } from '../constants';
import { TrendingUp, DollarSign, Package, Calendar, Sparkles, PieChart, FileText, FileSpreadsheet, Filter, X } from 'lucide-react';
import { generateBusinessInsight } from '../services/geminiService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportsProps {
  sales: Sale[];
  products: Product[];
}

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';
type ReportTab = 'dashboard' | 'profit_loss' | 'inventory';

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
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday start
    weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (dateRange === 'today') {
      result = result.filter(s => s.timestamp >= today);
    } else if (dateRange === 'yesterday') {
      result = result.filter(s => s.timestamp >= yesterday && s.timestamp < today);
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

    return result;
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

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    // Pass filtered data to AI
    const result = await generateBusinessInsight(filteredSales, filteredInventory);
    setInsight(result);
    setLoadingAi(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    const filterText = `Range: ${dateRange.toUpperCase()} | Cat: ${categoryFilter} | Pay: ${paymentFilter}`;

    if (activeTab === 'dashboard') {
        doc.setFontSize(20);
        doc.text("Sales Dashboard Report", 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${timestamp}`, 14, 30);
        doc.text(filterText, 14, 35);
        
        doc.setFontSize(12);
        doc.text(`Total Revenue: ${CURRENCY}${stats.revenue.toFixed(2)}`, 14, 45);
        doc.text(`Net Profit: ${CURRENCY}${stats.grossProfit.toFixed(2)}`, 14, 51);
        doc.text(`Transactions: ${stats.transactions}`, 100, 45);
        doc.text(`Margin: ${stats.margin.toFixed(2)}%`, 100, 51);

        const tableBody = filteredSales.map(s => {
          // If category filter is active, show relevant amount, otherwise total
          const relevantAmount = categoryFilter === 'All' ? s.total : s.items.reduce((acc, i) => i.category === categoryFilter ? acc + (i.sellPrice * i.quantity) : acc, 0);
          
          return [
            s.id.slice(-6),
            new Date(s.timestamp).toLocaleString(),
            s.items.map(i => `${i.name} (${i.quantity})`).join(', '),
            relevantAmount.toFixed(2)
          ];
        });

        autoTable(doc, {
            head: [['Order ID', 'Date', 'Items', 'Filtered Amount']],
            body: tableBody,
            startY: 60,
        });

        doc.save(`Sales_Report_${dateRange}.pdf`);
    } else if (activeTab === 'profit_loss') {
        doc.setFontSize(20);
        doc.text("Profit & Loss Statement", 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${timestamp}`, 14, 30);
        doc.text(filterText, 14, 35);

        autoTable(doc, {
            head: [['Category', 'Amount']],
            body: [
                ['Total Revenue (Sales)', `${CURRENCY}${stats.revenue.toFixed(2)}`],
                ['Cost of Goods Sold (COGS)', `(${CURRENCY}${stats.cogs.toFixed(2)})`],
                ['Gross Profit', `${CURRENCY}${stats.grossProfit.toFixed(2)}`],
                ['Profit Margin', `${stats.margin.toFixed(2)}%`]
            ],
            startY: 45,
        });
        doc.save(`Profit_Loss_${dateRange}.pdf`);
    } else if (activeTab === 'inventory') {
        doc.setFontSize(20);
        doc.text("Inventory Valuation Report", 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${timestamp}`, 14, 30);
        doc.text(`Category Filter: ${categoryFilter}`, 14, 35);

        doc.setFontSize(12);
        doc.text(`Total Stock Count: ${inventoryStats.totalStock}`, 14, 45);
        doc.text(`Total Asset Value: ${CURRENCY}${inventoryStats.totalCostValue.toFixed(2)}`, 14, 51);

        const tableBody = filteredInventory.map(p => [
            p.name,
            p.sku,
            p.stock,
            (p.costPrice * p.stock).toFixed(2),
            (p.sellPrice * p.stock).toFixed(2)
        ]);

        autoTable(doc, {
            head: [['Product', 'SKU', 'Stock', 'Asset Value', 'Retail Value']],
            body: tableBody,
            startY: 60,
        });
        doc.save(`Inventory_Report.pdf`);
    }
  };

  const generateExcel = () => {
    if (activeTab === 'dashboard') {
        const data = filteredSales.map(s => {
             const relevantAmount = categoryFilter === 'All' ? s.total : s.items.reduce((acc, i) => i.category === categoryFilter ? acc + (i.sellPrice * i.quantity) : acc, 0);
             return {
                ID: s.id,
                Date: new Date(s.timestamp).toLocaleString(),
                Items: s.items.map(i => `${i.name} x${i.quantity}`).join('; '),
                Total: relevantAmount,
                Payment: s.paymentMethod
             };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sales");
        XLSX.writeFile(wb, `Sales_${dateRange}.xlsx`);
    } else if (activeTab === 'profit_loss') {
        const data = [
            { Category: 'Revenue', Amount: stats.revenue },
            { Category: 'COGS', Amount: stats.cogs },
            { Category: 'Gross Profit', Amount: stats.grossProfit },
            { Category: 'Margin %', Amount: stats.margin }
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PnL");
        XLSX.writeFile(wb, `PnL_${dateRange}.xlsx`);
    } else if (activeTab === 'inventory') {
        const data = filteredInventory.map(p => ({
            Name: p.name,
            SKU: p.sku,
            Category: p.category,
            Stock: p.stock,
            CostPrice: p.costPrice,
            SellPrice: p.sellPrice,
            TotalAssetValue: p.costPrice * p.stock,
            TotalRetailValue: p.sellPrice * p.stock
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, "Inventory.xlsx");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header & Controls */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm z-10 space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
             <h2 className="text-2xl font-bold text-slate-800">Financial Reports</h2>
             <p className="text-slate-500 text-sm">Track sales, profit, and inventory value.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
             <button 
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-100 font-medium text-sm"
             >
                <FileText size={16} /> PDF
             </button>
             <button 
                onClick={generateExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors border border-green-100 font-medium text-sm"
             >
                <FileSpreadsheet size={16} /> Excel
             </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex overflow-x-auto pb-2 border-b border-slate-100">
             {(['dashboard', 'profit_loss', 'inventory'] as ReportTab[]).map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`mr-4 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                   activeTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                 }`}
               >
                 {tab === 'dashboard' && 'Dashboard'}
                 {tab === 'profit_loss' && 'Profit & Loss'}
                 {tab === 'inventory' && 'Inventory Valuation'}
               </button>
             ))}
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
           
           {/* 1. Date Filter */}
           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={12}/> Date Range</label>
             <select 
               value={dateRange} 
               onChange={(e) => setDateRange(e.target.value as DateRange)}
               className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
               disabled={activeTab === 'inventory'}
             >
               <option value="today">Today</option>
               <option value="yesterday">Yesterday</option>
               <option value="week">This Week</option>
               <option value="month">This Month</option>
               <option value="all">All Time</option>
               <option value="custom">Custom Range</option>
             </select>
           </div>

           {/* 2. Custom Date Inputs (Only visible if 'custom') */}
           {dateRange === 'custom' && activeTab !== 'inventory' && (
             <div className="space-y-1 md:col-span-2 flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">End</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                </div>
             </div>
           )}

           {/* 3. Category Filter */}
           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Filter size={12}/> Category</label>
             <select 
               value={categoryFilter}
               onChange={(e) => setCategoryFilter(e.target.value)}
               className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
             >
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>

           {/* 4. Payment Filter (Hidden for Inventory) */}
           {activeTab !== 'inventory' && (
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><DollarSign size={12}/> Payment</label>
               <select 
                 value={paymentFilter}
                 onChange={(e) => setPaymentFilter(e.target.value)}
                 className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
               >
                 <option value="All">All Methods</option>
                 <option value="CASH">Cash</option>
                 <option value="CARD">Card</option>
               </select>
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign size={24} /></div>
                   <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">REVENUE</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{CURRENCY}{stats.revenue.toFixed(2)}</h3>
                <p className="text-slate-400 text-sm mt-1">{categoryFilter !== 'All' ? `Sales from ${categoryFilter}` : 'Total Sales Revenue'}</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={24} /></div>
                   <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">PROFIT</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{CURRENCY}{stats.grossProfit.toFixed(2)}</h3>
                <p className="text-slate-400 text-sm mt-1">Net Income</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Package size={24} /></div>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{stats.transactions}</h3>
                <p className="text-slate-400 text-sm mt-1">Transactions</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                 <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><PieChart size={24} /></div>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{stats.margin.toFixed(1)}%</h3>
                <p className="text-slate-400 text-sm mt-1">Profit Margin</p>
              </div>
            </div>

            {/* AI Insight Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="text-yellow-300" />
                    <h3 className="text-xl font-bold">Smart Analysis</h3>
                  </div>
                  <p className="text-indigo-100 mb-6 max-w-2xl">
                    Get AI-powered insights on your currently filtered sales performance.
                  </p>
                  
                  {!insight && (
                    <button 
                      onClick={handleGenerateInsight}
                      disabled={loadingAi}
                      className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors disabled:opacity-70 flex items-center gap-2"
                    >
                      {loadingAi ? 'Analyzing...' : 'Generate Report'}
                    </button>
                  )}

                  {insight && (
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 animate-fade-in">
                      <h4 className="font-semibold mb-2 text-yellow-300">Analysis Result:</h4>
                      <div className="whitespace-pre-line text-sm leading-relaxed text-indigo-50">
                        {insight}
                      </div>
                      <button onClick={() => setInsight(null)} className="mt-4 text-xs text-indigo-200 hover:text-white underline">Clear</button>
                    </div>
                  )}
                </div>
                 <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Transaction History</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {filteredSales.length} records found
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-4 border-b">Order ID</th>
                    <th className="p-4 border-b">Date & Time</th>
                    <th className="p-4 border-b">Items</th>
                    <th className="p-4 border-b">Payment</th>
                    <th className="p-4 border-b text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.slice().reverse().map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-slate-500">#{sale.id.slice(-6)}</td>
                      <td className="p-4 text-slate-600">{new Date(sale.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-slate-800 max-w-md truncate">
                        {sale.items.map(i => {
                          const isMatch = categoryFilter === 'All' || i.category === categoryFilter;
                          return (
                             <span key={i.id} className={isMatch ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                               {i.name} ({i.quantity})
                               {sale.items.indexOf(i) !== sale.items.length -1 ? ', ' : ''}
                             </span>
                          )
                        })}
                      </td>
                      <td className="p-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${sale.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                           {sale.paymentMethod}
                         </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">{CURRENCY}{sale.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSales.length === 0 && (
                <div className="p-12 text-center text-slate-400">No sales found for this period.</div>
              )}
            </div>
          </div>
        )}

        {/* PROFIT & LOSS TAB */}
        {activeTab === 'profit_loss' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-slate-200">
              <div className="bg-slate-900 p-8 text-white">
                 <h2 className="text-2xl font-bold">Profit & Loss Statement</h2>
                 <p className="text-slate-400 mt-1 capitalize">Period: {dateRange === 'custom' ? `${customStart} to ${customEnd}` : dateRange}</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Revenue</h3>
                  <div className="flex justify-between items-center">
                     <span className="text-lg text-slate-700">Gross Sales</span>
                     <span className="text-lg font-bold text-slate-900">{CURRENCY}{stats.revenue.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Cost of Goods Sold</h3>
                  <div className="flex justify-between items-center text-red-600">
                     <span className="text-lg">Cost of Inventory</span>
                     <span className="text-lg font-bold">({CURRENCY}{stats.cogs.toFixed(2)})</span>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-slate-100">
                   <div className="flex justify-between items-center">
                     <span className="text-2xl font-bold text-slate-800">Gross Profit</span>
                     <span className={`text-2xl font-bold ${stats.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                       {CURRENCY}{stats.grossProfit.toFixed(2)}
                     </span>
                   </div>
                   <p className="text-right text-sm text-slate-400 mt-2">
                     Margin: {stats.margin.toFixed(2)}%
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY VALUE TAB */}
        {activeTab === 'inventory' && (
          <div className="animate-fade-in space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Total Stock Asset (Cost)</h3>
                  <div className="text-3xl font-bold text-slate-800">{CURRENCY}{inventoryStats.totalCostValue.toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-2">Money invested in inventory</div>
               </div>
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Total Retail Value</h3>
                  <div className="text-3xl font-bold text-blue-600">{CURRENCY}{inventoryStats.totalRetailValue.toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-2">Projected revenue</div>
               </div>
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Potential Profit</h3>
                  <div className="text-3xl font-bold text-green-600">{CURRENCY}{inventoryStats.potentialProfit.toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-2">If all stock is sold</div>
               </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800">Stock Valuation Report</h3>
                 <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{filteredInventory.length} Products</span>
               </div>
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-600 font-semibold">
                   <tr>
                     <th className="p-4 border-b">Product</th>
                     <th className="p-4 border-b">Category</th>
                     <th className="p-4 border-b text-right">Stock</th>
                     <th className="p-4 border-b text-right">Asset Value (Cost)</th>
                     <th className="p-4 border-b text-right">Retail Value</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredInventory.map(product => (
                     <tr key={product.id} className="hover:bg-slate-50">
                       <td className="p-4">
                         <div className="font-medium text-slate-800">{product.name}</div>
                         <div className="text-xs text-slate-400">{product.sku}</div>
                       </td>
                       <td className="p-4 text-slate-500">
                         <span className="bg-slate-100 px-2 py-1 rounded text-xs">{product.category}</span>
                       </td>
                       <td className="p-4 text-right font-bold text-slate-700">{product.stock}</td>
                       <td className="p-4 text-right text-slate-600">{CURRENCY}{(product.costPrice * product.stock).toFixed(2)}</td>
                       <td className="p-4 text-right font-medium text-slate-900">{CURRENCY}{(product.sellPrice * product.stock).toFixed(2)}</td>
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