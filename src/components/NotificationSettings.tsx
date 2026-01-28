import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  checkNotificationSupport,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getSubscriptionStatus,
  testNotification
} from '../lib/pushNotifications';

export function NotificationSettings() {
  const { user, isAdmin } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [supported, setSupported] = useState(true);
  const [supportError, setSupportError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user && isAdmin) {
      checkSupport();
      loadSubscriptionStatus();
    }
  }, [user, isAdmin]);

  const checkSupport = async () => {
    const result = await checkNotificationSupport();
    setSupported(result.supported);
    if (!result.supported) {
      setSupportError(result.error || 'Notifications not supported');
    }
  };

  const loadSubscriptionStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const status = await getSubscriptionStatus(user.id);
      setIsSubscribed(status.subscribed);
      setSubscription(status.subscription);
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) return;

    setUpdating(true);
    setMessage(null);

    try {
      if (isSubscribed) {
        const result = await unsubscribeFromPushNotifications(user.id);
        if (result.success) {
          setIsSubscribed(false);
          setSubscription(null);
          setMessage({ type: 'success', text: 'Push notifications disabled successfully' });
        } else {
          console.error('Unsubscribe error:', result.error);
          setMessage({ type: 'error', text: result.error || 'Failed to disable notifications' });
        }
      } else {
        console.log('Attempting to subscribe user:', user.id);
        const result = await subscribeToPushNotifications(user.id);
        console.log('Subscribe result:', result);
        if (result.success) {
          setIsSubscribed(true);
          await loadSubscriptionStatus();
          setMessage({ type: 'success', text: 'Push notifications enabled successfully!' });
        } else {
          console.error('Subscribe error:', result.error);
          const errorMsg = result.error || 'Failed to enable notifications';
          setMessage({
            type: 'error',
            text: errorMsg.includes('permission')
              ? 'Please allow notifications in your browser settings and try again.'
              : errorMsg.includes('denied')
              ? 'Please allow notifications in your browser settings and try again.'
              : `Error: ${errorMsg}. Check browser console for details.`
          });
        }
      }
    } catch (error: any) {
      console.error('Toggle notifications error:', error);
      setMessage({ type: 'error', text: error.message || 'An error occurred. Check browser console for details.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleTestNotification = async () => {
    const result = await testNotification();
    if (result.success) {
      setMessage({ type: 'success', text: 'Test notification sent' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to send test notification' });
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (!supported) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <BellOff className="w-6 h-6 text-gray-400" />
          <h2 className="text-xl font-semibold">Push Notifications</h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Notifications Not Available</p>
              <p className="text-yellow-700 text-sm mt-1">{supportError}</p>
              <div className="mt-3 text-xs text-yellow-700 space-y-1">
                <p><strong>Browser Info:</strong></p>
                <p>• Service Worker: {('serviceWorker' in navigator) ? '✓ Supported' : '✗ Not Supported'}</p>
                <p>• Push Manager: {('PushManager' in window) ? '✓ Supported' : '✗ Not Supported'}</p>
                <p>• Notifications: {('Notification' in window) ? '✓ Supported' : '✗ Not Supported'}</p>
                <p>• Secure Context: {window.isSecureContext ? '✓ HTTPS/Localhost' : '✗ Requires HTTPS'}</p>
                <p>• VAPID Key: {import.meta.env.VITE_VAPID_PUBLIC_KEY ? '✓ Configured' : '✗ Missing'}</p>
              </div>
              <p className="text-yellow-700 text-sm mt-3">
                Try using Chrome, Firefox, or Edge on HTTPS or localhost for push notification support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Push Notifications</h2>
      </div>

      <p className="text-gray-600 mb-6">
        Receive real-time push notifications when new reservations are created. Only administrators will receive these notifications.
      </p>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-gray-400'}`} />
              <div>
                <p className="font-medium text-gray-900">
                  {isSubscribed ? 'Notifications Enabled' : 'Notifications Disabled'}
                </p>
                <p className="text-sm text-gray-600">
                  {isSubscribed
                    ? 'You will receive notifications for new reservations'
                    : 'Enable to receive notifications for new reservations'
                  }
                </p>
              </div>
            </div>
            <label className={`relative inline-flex items-center ${updating ? 'cursor-wait' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={isSubscribed}
                onChange={handleToggleNotifications}
                disabled={updating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
              {updating && (
                <div className="ml-3 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Processing...</span>
                </div>
              )}
            </label>
          </div>

          {isSubscribed && subscription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-blue-900 font-medium mb-1">Active Subscription</p>
                  <p className="text-blue-700 text-sm break-all">
                    Device: {subscription.user_agent?.split('(')[1]?.split(')')[0] || 'Unknown'}
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    Last updated: {new Date(subscription.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSubscribed && (
            <button
              onClick={handleTestNotification}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Send Test Notification
            </button>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">How it works</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Notifications appear instantly when customers create reservations</li>
              <li>• Only administrators receive these notifications</li>
              <li>• Click a notification to open the crew dashboard</li>
              <li>• Notifications work even when the browser is closed</li>
              <li>• You can disable notifications at any time</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
