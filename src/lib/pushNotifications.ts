import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkNotificationSupport(): Promise<{
  supported: boolean;
  error?: string;
}> {
  // Check if running on HTTPS or localhost
  const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  if (!isSecureContext) {
    return {
      supported: false,
      error: 'Push notifications require HTTPS or localhost'
    };
  }

  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      error: 'Service Workers are not supported in this browser'
    };
  }

  if (!('PushManager' in window)) {
    return {
      supported: false,
      error: 'Push notifications are not supported in this browser'
    };
  }

  if (!('Notification' in window)) {
    return {
      supported: false,
      error: 'Notifications are not supported in this browser'
    };
  }

  if (!VAPID_PUBLIC_KEY) {
    return {
      supported: false,
      error: 'VAPID public key not configured'
    };
  }

  return { supported: true };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPushNotifications(adminUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const support = await checkNotificationSupport();
    if (!support.supported) {
      return { success: false, error: support.error };
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission denied' };
    }

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const subscriptionJson = subscription.toJSON();

    const { error } = await supabase
      .from('admin_push_subscriptions')
      .upsert({
        admin_user_id: adminUserId,
        endpoint: subscription.endpoint,
        p256dh_key: subscriptionJson.keys?.p256dh || '',
        auth_key: subscriptionJson.keys?.auth || '',
        user_agent: navigator.userAgent,
        is_active: true
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Error saving subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false, error: error.message || 'Failed to subscribe' };
  }
}

export async function unsubscribeFromPushNotifications(adminUserId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    const { error } = await supabase
      .from('admin_push_subscriptions')
      .delete()
      .eq('admin_user_id', adminUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error unsubscribing from push notifications:', error);
    return { success: false, error: error.message || 'Failed to unsubscribe' };
  }
}

export async function getSubscriptionStatus(adminUserId: string): Promise<{
  subscribed: boolean;
  subscription?: any;
}> {
  try {
    const { data, error } = await supabase
      .from('admin_push_subscriptions')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error getting subscription status:', error);
      return { subscribed: false };
    }

    return {
      subscribed: !!data,
      subscription: data
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { subscribed: false };
  }
}

export async function testNotification(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const support = await checkNotificationSupport();
    if (!support.supported) {
      return { success: false, error: support.error };
    }

    if (Notification.permission !== 'granted') {
      return { success: false, error: 'Notification permission not granted' };
    }

    new Notification('Test Notification', {
      body: 'This is a test notification from Patschi Admin',
      icon: '/crew-icon-180.png',
      badge: '/crew-icon-180.png'
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error showing test notification:', error);
    return { success: false, error: error.message || 'Failed to show notification' };
  }
}
