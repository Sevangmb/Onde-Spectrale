// Service Worker for Onde Spectrale - Offline Support
const CACHE_NAME = 'onde-spectrale-v1';
const STATIC_CACHE = 'static-v1';
const AUDIO_CACHE = 'audio-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/',
  // Core audio processing libraries
  '/lib/audio-processor.js'
];

// Audio file patterns that can be cached
const AUDIO_PATTERNS = [
  /\.mp3$/,
  /\.wav$/,
  /\.ogg$/,
  /\.m4a$/,
  /\.webm$/
];

// TTS audio caching strategy
const TTS_PATTERNS = [
  /text-to-speech/,
  /tts-audio/,
  /speech-synthesis/
];

self.addEventListener('install', (event) => {
  console.log('🎵 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS.filter(asset => !asset.endsWith('/')));
      }),
      // Initialize audio cache
      caches.open(AUDIO_CACHE)
    ]).then(() => {
      console.log('📻 Onde Spectrale caches initialized');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🎵 Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== AUDIO_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('📻 Service Worker activated');
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (isAudioRequest(url)) {
    event.respondWith(handleAudioRequest(request));
  } else if (isTTSRequest(url)) {
    event.respondWith(handleTTSRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticRequest(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    // Default network-first strategy for pages
    event.respondWith(handlePageRequest(request));
  }
});

// Audio file caching with streaming support
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  
  try {
    // Check cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('🎵 Serving audio from cache:', request.url);
      return cachedResponse;
    }
    
    // Fetch from network with streaming
    const response = await fetch(request);
    
    if (response.status === 200 && response.headers.get('content-type')?.includes('audio')) {
      // Cache successful audio responses
      // Use clone for caching while returning original for streaming
      cache.put(request, response.clone());
      console.log('🎵 Cached new audio:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('🚨 Audio request failed:', error);
    
    // Try to serve from cache if network fails
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('🎵 Fallback to cached audio:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// TTS audio with priority caching
async function handleTTSRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  
  try {
    // TTS is frequently reused, check cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('🗣️ Serving TTS from cache:', request.url);
      return cachedResponse;
    }
    
    const response = await fetch(request);
    
    if (response.status === 200) {
      // Always cache TTS responses for offline use
      cache.put(request, response.clone());
      console.log('🗣️ Cached TTS audio:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('🚨 TTS request failed:', error);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline TTS fallback
    return new Response('TTS unavailable offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('🚨 Static asset failed:', error);
    throw error;
  }
}

// API requests with network-first + cache fallback
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful API responses temporarily
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      // Set a shorter cache time for API responses
      const clonedResponse = response.clone();
      cache.put(request, clonedResponse);
    }
    
    return response;
  } catch (error) {
    console.error('🚨 API request failed, trying cache:', error);
    
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📡 Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // For navigation requests, try to serve the main page from cache
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      const cachedRoot = await cache.match('/');
      if (cachedRoot) {
        return cachedRoot;
      }
    }
    throw error;
  }
}

// Helper functions
function isAudioRequest(url) {
  return AUDIO_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
         url.pathname.includes('/audio/') ||
         url.searchParams.has('audio');
}

function isTTSRequest(url) {
  return TTS_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
         url.pathname.includes('/tts/') ||
         url.searchParams.has('tts');
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/static/') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.js') ||
         url.pathname.includes('.woff');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/_next/') ||
         url.host !== location.host;
}

// Handle background sync for failed audio uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'audio-sync') {
    event.waitUntil(syncFailedAudio());
  }
});

async function syncFailedAudio() {
  // Implement background sync for failed audio requests
  console.log('🔄 Syncing failed audio requests...');
}

// Clean up audio cache periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_AUDIO_CACHE') {
    event.waitUntil(cleanAudioCache());
  }
});

async function cleanAudioCache() {
  const cache = await caches.open(AUDIO_CACHE);
  const requests = await cache.keys();
  
  // Remove cached audio older than 1 hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response?.headers.get('date');
    
    if (dateHeader && new Date(dateHeader).getTime() < oneHourAgo) {
      await cache.delete(request);
      console.log('🗑️ Cleaned old audio cache:', request.url);
    }
  }
}