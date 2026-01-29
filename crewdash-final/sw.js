self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'New Reservation';
      const options = {
        body: data.body || 'You have a new reservation',
        icon: data.icon || '/crew-icon-180.png',
        badge: '/crew-icon-180.png',
        tag: data.tag || 'reservation-notification',
        data: {
          url: data.url || '/crew.html',
          reservationId: data.reservationId
        },
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Details'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (error) {
      console.error('Error parsing push notification data:', error);
      event.waitUntil(
        self.registration.showNotification('New Reservation', {
          body: 'You have a new reservation',
          icon: '/crew-icon-180.png',
          badge: '/crew-icon-180.png'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/crew.html';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes('/crew.html') && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});

self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});
