/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'HomeWork', body: event.data.text() };
  }

  const title = payload.title || 'HomeWork';
  const options = {
    body: payload.body || 'You have a new homework update.',
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => 'focus' in client);
      if (existingClient) {
        return existingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
