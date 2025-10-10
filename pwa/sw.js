/**
 * Service Worker for Interviews.tv PWA
 * 
 * Handles:
 * - Offline functionality and caching
 * - Background sync for data synchronization
 * - Push notifications
 * - App updates and cache management
 * - Network-first and cache-first strategies
 * - Background fetch for large downloads
 */

const CACHE_NAME = 'interviews-tv-v1.0.0';
const RUNTIME_CACHE = 'interviews-tv-runtime';
const OFFLINE_PAGE = '/offline.html';
const OFFLINE_FALLBACK_IMAGE = '/images/offline-placeholder.png';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/css/app.css',
  '/js/app.js',
  '/js/platform-adapter.js',
  '/images/logo.png',
  '/images/offline-placeholder.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.interviews\.tv\/streams\/featured/,
  /^https:\/\/api\.interviews\.tv\/users\/profile/,
  /^https:\/\/api\.interviews\.tv\/categories/
];

// Assets that should use network-first strategy
const NETWORK_FIRST_PATTERNS = [
  /^https:\/\/api\.interviews\.tv\/streams\/live/,
  /^https:\/\/api\.interviews\.tv\/chat/,
  /^https:\/\/api\.interviews\.tv\/notifications/
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    event.respondWith(handleStaticAsset(request));
  } else if (url.pathname.match(/\.(mp4|webm|m3u8|ts)$/)) {
    event.respondWith(handleMediaRequest(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Check if this should use network-first strategy
    const isNetworkFirst = NETWORK_FIRST_PATTERNS.some(pattern => 
      pattern.test(request.url)
    );

    if (isNetworkFirst) {
      return await networkFirstStrategy(request);
    } else {
      return await cacheFirstStrategy(request);
    }
  } catch (error) {
    console.error('API request failed:', error);
    
    // Return cached response if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature is not available offline' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    return await cacheFirstStrategy(request);
  } catch (error) {
    console.error('Static asset request failed:', error);
    
    // Return placeholder for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      const fallbackResponse = await caches.match(OFFLINE_FALLBACK_IMAGE);
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

// Handle media requests (videos, audio)
async function handleMediaRequest(request) {
  try {
    // Media files should always be fetched from network
    // but we can cache them for offline viewing
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful media responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Media request failed:', error);
    
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    return await networkFirstStrategy(request);
  } catch (error) {
    console.error('Page request failed:', error);
    
    // Return cached page if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await caches.match(OFFLINE_PAGE);
    if (offlineResponse) {
      return offlineResponse;
    }
    
    throw error;
  }
}

// Network-first strategy
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache-first strategy
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then(response => {
        if (response.ok) {
          const cache = caches.open(RUNTIME_CACHE);
          cache.then(c => c.put(request, response));
        }
      })
      .catch(() => {
        // Ignore background update failures
      });
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  const response = await fetch(request);
  
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  
  return response;
}

// Push notification event
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  let notificationData = {
    title: 'Interviews.tv',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    requireInteraction: false,
    actions: []
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: notificationData.data
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  let url = '/';
  
  if (action === 'view') {
    url = data.url || '/';
  } else if (action === 'reply') {
    url = data.replyUrl || '/chat';
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync event
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-streams') {
    event.waitUntil(syncStreams());
  } else if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'background-sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

// Sync streams data
async function syncStreams() {
  try {
    console.log('Syncing streams data...');
    
    // Get pending stream data from IndexedDB
    const pendingData = await getPendingData('streams');
    
    for (const data of pendingData) {
      try {
        const response = await fetch('/api/streams/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          await removePendingData('streams', data.id);
        }
      } catch (error) {
        console.error('Failed to sync stream data:', error);
      }
    }
    
    console.log('Streams sync completed');
  } catch (error) {
    console.error('Streams sync failed:', error);
  }
}

// Sync messages data
async function syncMessages() {
  try {
    console.log('Syncing messages data...');
    
    const pendingData = await getPendingData('messages');
    
    for (const data of pendingData) {
      try {
        const response = await fetch('/api/chat/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          await removePendingData('messages', data.id);
        }
      } catch (error) {
        console.error('Failed to sync message data:', error);
      }
    }
    
    console.log('Messages sync completed');
  } catch (error) {
    console.error('Messages sync failed:', error);
  }
}

// Sync analytics data
async function syncAnalytics() {
  try {
    console.log('Syncing analytics data...');
    
    const pendingData = await getPendingData('analytics');
    
    if (pendingData.length > 0) {
      const response = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: pendingData })
      });
      
      if (response.ok) {
        await clearPendingData('analytics');
      }
    }
    
    console.log('Analytics sync completed');
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingData(store) {
  // Implementation would use IndexedDB to get pending data
  // This is a placeholder
  return [];
}

async function removePendingData(store, id) {
  // Implementation would remove specific item from IndexedDB
  console.log(`Removing pending data from ${store}:`, id);
}

async function clearPendingData(store) {
  // Implementation would clear all pending data from store
  console.log(`Clearing pending data from ${store}`);
}

// Background fetch event (for large downloads)
self.addEventListener('backgroundfetch', event => {
  console.log('Background fetch triggered:', event.tag);
  
  if (event.tag === 'download-video') {
    event.waitUntil(handleVideoDownload(event));
  }
});

// Handle video download in background
async function handleVideoDownload(event) {
  try {
    console.log('Downloading video in background...');
    
    // Show progress notification
    await self.registration.showNotification('Download Started', {
      body: 'Video download has started in the background',
      icon: '/icons/icon-192x192.png',
      tag: 'download-progress'
    });
    
    // The actual download is handled by the browser
    // We just need to handle the completion
    
  } catch (error) {
    console.error('Background video download failed:', error);
    
    await self.registration.showNotification('Download Failed', {
      body: 'Video download failed. Please try again.',
      icon: '/icons/icon-192x192.png',
      tag: 'download-error'
    });
  }
}

// Message event for communication with main thread
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}

console.log('Service Worker loaded successfully');
