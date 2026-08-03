self.addEventListener('push', event => {
    let payload = { title: 'Cosmos1562', body: 'A tracked satellite pass is starting soon.' };
    if (event.data) {
        try {
            payload = event.data.json();
        } catch {
            payload.body = event.data.text();
        }
    }
    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: '/static/favicon.svg',
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/tracker'));
});
