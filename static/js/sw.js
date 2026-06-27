/* Cosmos1562 chat service worker — Web Push */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) {}

    const title = data.title || 'Cosmos1562';
    const body = data.body || 'New message';
    const url = data.url || '/chat';
    const tag = 'conv_' + (data.conv_id || 'chat');

    event.waitUntil((async () => {
        // If a chat window is open AND focused, skip the notification
        // (the in-page ping handles it). Otherwise show it.
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const focused = clientList.some(c => c.focused && c.visibilityState === 'visible');
        if (focused) return;

        await self.registration.showNotification(title, {
            body,
            tag,
            renotify: true,
            icon: '/static/favicon.svg',
            badge: '/static/favicon.svg',
            data: { url },
        });
    })());
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/chat';
    event.waitUntil((async () => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of clientList) {
            if (c.url.includes('/chat') && 'focus' in c) return c.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
    })());
});
