import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: 'div',
  Pause: 'div',
  AlertTriangle: 'div',
  Music: 'div',
  Loader2: 'div',
  Settings: 'div',
  Trash2: 'div',
  GripVertical: 'div',
  MoreVertical: 'div',
  Plus: 'div',
  Edit: 'div',
  Save: 'div',
  X: 'div',
  Wrench: 'div',
  Copy: 'div',
  Upload: 'div',
  Download: 'div',
  Search: 'div',
  ChevronDown: 'div',
  Volume2: 'div',
  VolumeX: 'div',
  Volume1: 'div',
  Radio: 'div',
  MessageSquare: 'div',
  Users: 'div',
  Clock: 'div',
  Activity: 'div',
  Wifi: 'div',
  WifiOff: 'div',
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: jest.fn(({ children, onClick, disabled, ...props }) => {
    const React = require('react');
    return React.createElement('button', { onClick, disabled, ...props }, children);
  }),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: jest.fn(({ value, onValueChange, min, max, step, ...props }) => {
    const React = require('react');
    return React.createElement('input', {
      type: 'range',
      role: 'slider',
      min,
      max,
      step,
      value: value?.[0] || 0,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onValueChange?.([Number(e.target.value)]),
      ...props
    });
  }),
}));

// Mock LoadingSkeleton
jest.mock('@/components/LoadingSkeleton', () => ({
  AudioPlayerSkeleton: jest.fn(() => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'audio-player-skeleton' }, 'Loading...');
  }),
}));
