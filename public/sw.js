// Minimal Web Push service worker. Registered by components/push-toggle.tsx;
// the actual notification content comes from lib/push.ts's payload
// (JSON.stringify'd { title, body, url }).

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Ignore malformed payloads rather than crashing the worker.
  }

  const title = data.title || "Sasta Pathao";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon",
      badge: "/icon",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
