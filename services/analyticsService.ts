import { analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';
import { AppView, CartItem } from '../types';

export const logPageView = (viewName: AppView | string) => {
  if (!analytics) return;
  logEvent(analytics, 'screen_view', {
    firebase_screen: viewName,
    firebase_screen_class: 'AppView'
  });
};

export const logPurchase = (items: CartItem[], total: number, currency: string = 'USD') => {
  if (!analytics) return;
  logEvent(analytics, 'purchase', {
    transaction_id: `SALE_${Date.now()}`,
    value: total,
    currency: currency,
    items: items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.sellPrice,
      quantity: item.quantity
    }))
  });
};

export const logUserLogin = (method: string) => {
  if (!analytics) return;
  logEvent(analytics, 'login', { method });
};

export const logError = (errorMsg: string) => {
  if (!analytics) return;
  logEvent(analytics, 'exception', {
    description: errorMsg,
    fatal: false
  });
};