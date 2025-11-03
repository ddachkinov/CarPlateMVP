/* eslint-disable no-restricted-globals */
// Service Worker for Push Notifications

// Listen for push notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'New Message',
    body: 'You have a new message',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'default',
    data: { url: '/?tab=inbox' }
  };

  // Parse notification data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || notificationData.data,
        actions: payload.actions || []
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: false,
      vibrate: [200, 100, 200]
    }
  );

  event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Handle action button clicks
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/?tab=inbox')
    );
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/?tab=inbox');
        }
      })
    );
  }
});

// Service worker activation
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activated');
  event.waitUntil(self.clients.claim());
});

// Service worker installation
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});
