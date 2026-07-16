self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Canetta";
  const options = {
    body: payload.body || "Hora de registrar sua dose.",
    data: {
      url: payload.url || "/journey"
    },
    tag: payload.tag || "canetta-dose",
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/journey";
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const appUrl = new URL(targetUrl, self.location.origin).href;
    for (const client of allClients) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(appUrl);
        return;
      }
    }
    await clients.openWindow(appUrl);
  })());
});
