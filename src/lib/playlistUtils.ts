import type { PlaylistItem } from '@/lib/types';

/**
 * Create a properly typed mock PlaylistItem for testing and stories
 */
export function createMockPlaylistItem(override?: Partial<PlaylistItem>): PlaylistItem {
  return {
    id: Math.random().toString(36).substring(7),
    type: 'music',
    title: 'Test Track',
    content: 'Test content for playlist item',
    artist: 'Test Artist',
    album: 'Test Album',
    year: 2024,
    genre: 'Test',
    url: 'https://example.com/test.mp3',
    duration: 180, // 3 minutes
    addedAt: new Date().toISOString(),
    ...override
  };
}

/**
 * Create a mock message PlaylistItem
 */
export function createMockMessage(override?: Partial<PlaylistItem>): PlaylistItem {
  return createMockPlaylistItem({
    type: 'message',
    title: 'DJ Message',
    content: 'Welcome to the wasteland radio, survivors!',
    artist: 'DJ Three Dog',
    duration: 10, // Short message
    ...override
  });
}

/**
 * Create a mock music PlaylistItem
 */
export function createMockMusic(override?: Partial<PlaylistItem>): PlaylistItem {
  return createMockPlaylistItem({
    type: 'music',
    title: 'Atomic Love',
    content: 'A classic wasteland tune about love in the atomic age',
    artist: 'The Fallout Boys',
    album: 'Nuclear Hits',
    year: 2077,
    genre: 'Post-Apocalyptic Rock',
    duration: 240, // 4 minutes
    ...override
  });
}

/**
 * Create a complete test playlist
 */
export function createMockPlaylist(length: number = 5): PlaylistItem[] {
  const playlist: PlaylistItem[] = [];
  
  for (let i = 0; i < length; i++) {
    if (i % 3 === 0) {
      // Every 3rd item is a message
      playlist.push(createMockMessage({
        id: `msg-${i}`,
        title: `DJ Message ${i + 1}`,
        content: `This is message number ${i + 1} from your favorite wasteland DJ!`
      }));
    } else {
      // Others are music
      playlist.push(createMockMusic({
        id: `track-${i}`,
        title: `Track ${i + 1}`,
        artist: `Artist ${i + 1}`,
        duration: 180 + (i * 30) // Varying durations
      }));
    }
  }
  
  return playlist;
}

/**
 * Validate PlaylistItem structure
 */
export function validatePlaylistItem(item: any): item is PlaylistItem {
  if (!item || typeof item !== 'object') {
    return false;
  }
  
  const required = ['id', 'type', 'title', 'content', 'url', 'duration'];
  const hasRequired = required.every(field => 
    field in item && item[field] !== undefined && item[field] !== null
  );
  
  if (!hasRequired) {
    return false;
  }
  
  // Type validation
  if (!['music', 'message'].includes(item.type)) {
    return false;
  }
  
  // Duration should be positive number
  if (typeof item.duration !== 'number' || item.duration <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Fix malformed PlaylistItem by adding missing required fields
 */
export function fixPlaylistItem(item: Partial<PlaylistItem>): PlaylistItem {
  const defaults = createMockPlaylistItem();
  
  return {
    ...defaults,
    ...item,
    // Ensure required fields are present
    id: item.id || defaults.id,
    type: item.type || defaults.type,
    title: item.title || defaults.title,
    content: item.content || defaults.content,
    url: item.url || defaults.url,
    duration: item.duration || defaults.duration,
  };
}

/**
 * Create a PlaylistItem from minimal data (for stories/tests)
 */
export function createSimplePlaylistItem(
  title: string, 
  type: 'music' | 'message' = 'music',
  additionalData?: Partial<PlaylistItem>
): PlaylistItem {
  return createMockPlaylistItem({
    title,
    type,
    content: type === 'message' 
      ? `Message content: ${title}`
      : `Music content for ${title}`,
    ...additionalData
  });
}

/**
 * Playlist utilities for testing error conditions
 */
export function createFailedTrack(override?: Partial<PlaylistItem>): PlaylistItem {
  return createMockPlaylistItem({
    title: 'Failed Track',
    url: 'invalid-url',
    error: 'Failed to load audio',
    ...override
  });
}

export function createLoadingTrack(override?: Partial<PlaylistItem>): PlaylistItem {
  return createMockPlaylistItem({
    title: 'Loading Track',
    isLoading: true,
    ...override
  });
}