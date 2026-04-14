// Banjo Fitness — Service Worker
// Handles background rest timer notifications

let pendingTimerId = null;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'scheduleTimer') {
    // Clear any existing pending timer
    if (pendingTimerId !== null) {
      clearTimeout(pendingTimerId);
      pendingTimerId = null;
    }
    const { delay, title, body } = event.data;
    if (delay > 0) {
      pendingTimerId = setTimeout(() => {
        self.registration.showNotification(title || 'Rest over — next set!', {
          body: body || 'Your rest timer has finished.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: 'rest-timer',
          requireInteraction: false,
          silent: false,
          data: { url: '/' },
        });
        pendingTimerId = null;
      }, delay);
    }
  }

  if (event.data.type === 'cancelTimer') {
    if (pendingTimerId !== null) {
      clearTimeout(pendingTimerId);
      pendingTimerId = null;
    }
    // Also dismiss any existing timer notification
    self.registration.getNotifications({ tag: 'rest-timer' }).then(notes => {
      notes.forEach(n => n.close());
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('/') && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// Keep SW alive when a timer is pending by responding to fetches normally
self.addEventListener('fetch', () => {});
