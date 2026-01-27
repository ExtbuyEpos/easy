import { messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';

const VAPID_KEY = 'BFeTByrez7Bxga9Y5IQqTjRRW8je0ucL6rZHa_yFvjyncDRXvjK98m4Uo5TLQkekPikSRTuX16WKixYaQcPDvi8';

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        console.log('FCM Token Generated:', token);
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

export const listenForMessages = () => {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('Foreground Message received:', payload);
    // You can handle a custom UI notification here if needed
    if (payload.notification) {
      new Notification(payload.notification.title || 'easyPOS Alert', {
        body: payload.notification.body,
        icon: '/favicon.ico'
      });
    }
  });
};