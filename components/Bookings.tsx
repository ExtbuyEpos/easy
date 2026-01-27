
import React, { useState, useMemo } from 'react';
import { Booking, Language } from '../types';
import { Plus, Search, Calendar, Phone, MapPin, CheckCircle, Clock, X, ChevronLeft, MoreVertical, Edit2, Trash2, Check, User as UserIcon, StickyNote } from 'lucide-react';
import { formatNumber } from '../utils/format';

interface BookingsProps {
  bookings: Booking[];
  onAddBooking: (b: Booking) => void;
  onUpdateBooking: (b: Booking) => void;
  onDeleteBooking: (id: string) => void;
  onGoBack: () => void;
  language: Language;
  t: (key: string) => string;
}

export const Bookings: React.FC<BookingsProps> = ({ 
  bookings, onAddBooking, onUpdateBooking, onDeleteBooking, onGoBack, language, t 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState<Partial<Booking>>({
    customerName: '', customerMobile: '', customerAddress: '', bookingDate: new Date().toISOString().slice(0, 16), status: 'PENDING', notes: ''
  });

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.customerMobile.includes(searchTerm);
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [bookings, searchTerm, statusFilter]);

  const handleOpenModal = (booking?: Booking) => {
    if (booking) {
      setEditingBooking(booking);
      setFormData(booking);
    } else {
      setEditingBooking(null);
      setFormData({ customerName: '', customerMobile: '', customerAddress: '', bookingDate: new Date().toISOString().slice(0, 16), status: 'PENDING', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.customerName || !formData.customerMobile) {
      alert("Name and Mobile are required");
      return;
    }
    const data = {
      id: editingBooking ? editingBooking.id : Date.now().toString(),
      timestamp: editingBooking ? editingBooking.timestamp : Date.now(),
      customerName: formData.customerName!,
      customerMobile: formData.customerMobile!,
      customerAddress: formData.customerAddress || '',
      bookingDate: formData.bookingDate || new Date().toISOString(),
      status: formData.status || 'PENDING',
      notes: formData.notes || ''
    } as Booking;

    if (editingBooking) onUpdateBooking(data);
    else onAddBooking(data);
    setIsModalOpen(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'CANCELLED': return 'bg-rose-100 text-rose-600 border-rose-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 overflow-hidden transition-colors">
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
               <button onClick={onGoBack} className="p-3 -ml-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                   <ChevronLeft size={28} className="rtl:rotate-180" />
               </button>
               <div>
                   <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">{t('bookings')}</h2>
                   <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">Reservation & Service Queue</p>
               </div>
           </div>
           <button onClick={() => handleOpenModal()} className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-4 rounded-2xl flex items-center gap-2 shadow-xl shadow-brand-500/20 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest italic">
               <Plus size={18} strokeWidth={3} /> {t('addBooking')}
           </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
             <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                 <input type="text" placeholder={t('search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] outline-none shadow-sm font-bold dark:text-white" />
             </div>
             <div className="flex bg-white dark:bg-slate-900 rounded-[1.8rem] p-1.5 shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === s ? 'bg-slate-900 dark:bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-900'}`}>{s}</button>
                ))}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
              {filteredBookings.map(b => (
                  <div key={b.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${getStatusStyle(b.status)}`}>
                              {b.status}
                          </span>
                          <div className="flex gap-2">
                             <button onClick={() => handleOpenModal(b)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-brand-600 transition-all"><Edit2 size={16}/></button>
                             <button onClick={() => onDeleteBooking(b.id)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-rose-600 transition-all"><Trash2 size={16}/></button>
                          </div>
                      </div>

                      <div className="space-y-4 flex-1">
                          <div>
                              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{b.customerName}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ref ID: #{b.id.slice(-6)}</p>
                          </div>

                          <div className="space-y-2">
                              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                  <Phone size={14} className="text-brand-500" />
                                  <span className="text-sm font-bold">{b.customerMobile}</span>
                              </div>
                              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                  <Calendar size={14} className="text-brand-500" />
                                  <span className="text-sm font-bold">{new Date(b.bookingDate).toLocaleString()}</span>
                              </div>
                              {b.customerAddress && (
                                <div className="flex items-start gap-3 text-slate-500 dark:text-slate-400">
                                    <MapPin size={14} className="text-brand-500 mt-1" />
                                    <span className="text-xs font-bold leading-relaxed">{b.customerAddress}</span>
                                </div>
                              )}
                          </div>

                          {b.notes && (
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><StickyNote size={10}/> Notes</p>
                                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">{b.notes}</p>
                              </div>
                          )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Created {new Date(b.timestamp).toLocaleDateString()}</span>
                          {b.status === 'PENDING' && (
                             <button onClick={() => onUpdateBooking({...b, status: 'CONFIRMED'})} className="flex items-center gap-2 text-brand-600 hover:text-brand-500 transition-all">
                                 <Check size={12}/> Confirm Now
                             </button>
                          )}
                      </div>
                  </div>
              ))}
              {filteredBookings.length === 0 && (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-20 text-slate-400 space-y-4">
                      <Calendar size={80} strokeWidth={1} />
                      <p className="font-black text-[10px] uppercase tracking-[0.4em]">{t('noBookings')}</p>
                  </div>
              )}
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[110] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-fade-in-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{editingBooking ? t('editBooking') : t('addBooking')}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Customer Service Intake</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={24}/></button>
                </div>
                
                <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('customerName')}</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500" placeholder="John Doe" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('mobileNumber')}</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="tel" value={formData.customerMobile} onChange={e => setFormData({...formData, customerMobile: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500" placeholder="050 000 0000" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('bookingDate')}</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="datetime-local" value={formData.bookingDate} onChange={e => setFormData({...formData, bookingDate: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('status')}</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest dark:text-white outline-none focus:border-brand-500">
                                <option value="PENDING">Pending</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('address')}</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                            <textarea value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} className="w-full p-4 pl-12 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500 resize-none" placeholder="Delivery or service address..." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('notes')}</label>
                        <div className="relative">
                            <StickyNote className="absolute left-4 top-4 text-slate-300" size={18} />
                            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-4 pl-12 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:border-brand-500 resize-none" placeholder="Additional requirements..." />
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                    <button onClick={handleSave} className="flex-[2] py-5 bg-brand-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[2rem] shadow-xl hover:bg-brand-500 transition-all italic flex items-center justify-center gap-2">
                        <CheckCircle size={18} /> {t('saveBooking')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
