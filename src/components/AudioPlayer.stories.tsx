import React, { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AudioPlayer } from './AudioPlayer';
import { createMockMusic } from '@/lib/playlistUtils';

const meta: Meta<typeof AudioPlayer> = {
  title: 'Components/AudioPlayer',
  component: AudioPlayer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isPlaying: { control: 'boolean' },
    isLoading: { control: 'boolean' },
    ttsMessage: { control: 'text' },
    errorMessage: { control: 'text' },
  },
} satisfies Meta<typeof AudioPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTrack = createMockMusic({
  title: 'Welcome to the Wasteland',
  artist: 'DJ Wanderer',
  url: '/test.mp3',
});

const Template = (args: any) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  return (
    <>
      <AudioPlayer
        {...args}
        audioRef={audioRef}
      />
      <audio ref={audioRef} src="/test.mp3" />
    </>
  );
};

export const Default: Story = {
  render: Template,
  args: {
    track: sampleTrack,
    isPlaying: false,
    isLoading: false,
    ttsMessage: null,
    errorMessage: null,
  },
};

export const Playing: Story = {
  render: Template,
  args: {
    ...Default.args,
    isPlaying: true,
  },
};

export const Loading: Story = {
  render: Template,
  args: {
    ...Default.args,
    isLoading: true,
  },
};

export const WithTTSMessage: Story = {
  render: Template,
  args: {
    ...Default.args,
    ttsMessage: "Bienvenue dans les Terres Désolées, survivants!",
  },
};

export const WithError: Story = {
  render: Template,
  args: {
    ...Default.args,
    errorMessage: "Impossible de charger la piste audio",
  },
};

export const NoTrack: Story = {
  render: Template,
  args: {
    ...Default.args,
    track: null,
  },
};
