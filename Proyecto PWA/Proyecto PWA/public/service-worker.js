// Service Worker optimizado para Lighthouse
const CACHE_NAME = 'pwa-lighthouse-v2';
const OFFLINE_URL = '/offline.html';

// Recursos críticos para cache inmediato
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/js/app.js',
  '/js/db.js',
  '/js/api-handlers.js',
  '/js/push-manager.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// INSTALACIÓN - Cachear recursos críticos
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalándose...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('📦 Cache abierto, agregando recursos críticos...');
        
        // Cachear recursos críticos con manejo de errores
        await cache.addAll(CRITICAL_ASSETS).catch(error => {
          console.warn('⚠️ Algunos recursos no se pudieron cachear:', error);
        });
        
        console.log('✅ Instalación completada');
        await self.skipWaiting();
      } catch (error) {
        console.error('❌ Error durante instalación:', error);
        await self.skipWaiting();
      }
    })()
  );
});

// ACTIVACIÓN - Limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activado');
  
  event.waitUntil(
    (async () => {
      try {
        // Limpiar caches viejos
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Eliminando cache viejo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
        
        console.log('✅ Service Worker listo para controlar clientes');
        await self.clients.claim();
      } catch (error) {
        console.error('❌ Error durante activación:', error);
      }
    })()
  );
});

// FETCH - Estrategia inteligente de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Solo manejar solicitudes GET del mismo origen
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Ignorar solicitudes de desarrollo
  if (request.url.includes('chrome-extension') || request.url.includes('fiveserver')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Intentar cache primero para recursos críticos
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          console.log('📂 Sirviendo desde cache:', getUrlFilename(request.url));
          return cachedResponse;
        }

        // Intentar red para recursos no cacheados
        const networkResponse = await fetch(request);
        
        // Cachear respuesta exitosa (excepto para navegación)
        if (networkResponse.ok && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          // No cachear solicitudes de navegación para mantener frescura
          if (request.destination !== 'document') {
            cache.put(request, networkResponse.clone()).catch(error => {
              console.warn('⚠️ No se pudo cachear:', request.url, error);
            });
          }
        }
        
        return networkResponse;
      } catch (error) {
        console.log('🔌 Error de red:', getUrlFilename(request.url));
        
        // Fallback para páginas HTML
        if (request.destination === 'document') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }
        
        // Fallback genérico
        return new Response(
          JSON.stringify({
            error: 'Contenido no disponible offline',
            url: request.url,
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    })()
  );
});

// PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  console.log('📬 Evento push recibido');
  
  let notificationData = {
    title: 'Mi PWA Avanzada',
    body: '¡Tienes una nueva notificación! 🎉',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: 'pwa-push-notification'
  };

  // Procesar datos push
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      const text = event.data.text();
      if (text) notificationData.body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      actions: [
        { action: 'open', title: 'Abrir App' },
        { action: 'close', title: 'Cerrar' }
      ],
      data: {
        url: self.location.origin,
        timestamp: new Date().getTime()
      },
      requireInteraction: true
    })
  );
});

// CLICK EN NOTIFICACIONES
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notificación clickeada:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || self.location.origin;

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        // Buscar cliente existente
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Abrir nueva ventana
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// MANEJO DE MENSAJES
self.addEventListener('message', (event) => {
  console.log('📩 Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    event.ports[0].postMessage({
      cacheName: CACHE_NAME,
      version: 'v2'
    });
  }
});

// FUNCIÓN AUXILIAR
function getUrlFilename(url) {
  try {
    return new URL(url).pathname.split('/').pop() || url;
  } catch {
    return url;
  }
}

// BACKGROUND SYNC (para futuras implementaciones)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Lógica de sincronización aquí
  console.log('🔁 Ejecutando sincronización en background...');
  return Promise.resolve();
}

console.log('✅ Service Worker cargado - Optimizado para Lighthouse');