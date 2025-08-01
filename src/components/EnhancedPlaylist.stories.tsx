import type { Meta, StoryObj } from '@storybook/nextjs';
import { EnhancedPlaylist } from './EnhancedPlaylist';

const meta: Meta<typeof EnhancedPlaylist> = {
  title: 'Components/EnhancedPlaylist',
  component: EnhancedPlaylist,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const samplePlaylist: any[] = [
  {
    id: '1',
    title: 'Blue Moon',
    artist: 'Frank Sinatra',
    url: 'https://example.com/blue-moon.mp3',
    content: 'Blue Moon by Frank Sinatra',
    duration: 180,
    type: 'music'
  },
  {
    id: '2',
    title: 'I Don\'t Want to Set the World on Fire',
    artist: 'The Ink Spots',
    url: 'https://example.com/ink-spots.mp3',
    content: 'I Don\'t Want to Set the World on Fire by The Ink Spots',
    duration: 200,
    type: 'music'
  },
  {
    id: '3',
    title: 'News Update',
    artist: 'Radio Announcer',
    url: 'https://example.com/news.mp3',
    content: 'Latest news from the wasteland',
    duration: 60,
    type: 'message'
  },
  {
    id: '4',
    title: 'Atom Bomb Baby',
    artist: 'The Five Stars',
    url: 'https://example.com/atom-bomb.mp3',
    content: 'Atom Bomb Baby by The Five Stars',
    duration: 150,
    type: 'music'
  },
  {
    id: '5',
    title: 'Weather Report',
    artist: 'Weather Service',
    url: 'https://example.com/weather.mp3',
    content: 'Current weather conditions in the wasteland',
    duration: 45,
    type: 'message'
  }
];

export const Default: Story = {
  args: {
    playlist: samplePlaylist,
    isPlaying: false,
    isLoadingTrack: false,
    failedTracks: new Set(),
    canGoBack: true,
    onTrackSelect: async (trackId: string) => {
      console.log('Selected track:', trackId);
    },
    onPlayPause: async () => {
      console.log('Play/Pause toggled');
    },
    onNext: () => {
      console.log('Next track');
    },
    onPrevious: () => {
      console.log('Previous track');
    }
  }
};

export const Empty: Story = {
  args: {
    playlist: [],
    isPlaying: false,
    isLoadingTrack: false,
    failedTracks: new Set(),
    canGoBack: false,
    onTrackSelect: async (trackId: string) => {
      console.log('Selected track:', trackId);
    },
    onPlayPause: async () => {
      console.log('Play/Pause toggled');
    },
    onNext: () => {
      console.log('Next track');
    },
    onPrevious: () => {
      console.log('Previous track');
    }
  }
};

export const LongPlaylist: Story = {
  args: {
    playlist: Array.from({ length: 20 }, (_, i) => ({
      id: `track-${i + 1}`,
      title: `Track ${i + 1}`,
      artist: `Artist ${i + 1}`,
      url: `https://example.com/track-${i + 1}.mp3`,
      content: `Track ${i + 1} by Artist ${i + 1}`,
      duration: 180 + (i * 30),
      type: i % 3 === 0 ? 'message' as const : 'music' as const
    })),
    isPlaying: true,
    isLoadingTrack: false,
    failedTracks: new Set(['track-5', 'track-12']),
    canGoBack: true,
    currentTrackId: 'track-3',
    onTrackSelect: async (trackId: string) => {
      console.log('Selected track:', trackId);
    },
    onPlayPause: async () => {
      console.log('Play/Pause toggled');
    },
    onNext: () => {
      console.log('Next track');
    },
    onPrevious: () => {
      console.log('Previous track');
    }
  }
};