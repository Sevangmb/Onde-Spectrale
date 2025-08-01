import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { LoadingSkeleton, AudioPlayerSkeleton, PlaylistSkeleton, StationSkeleton, SpectrumSkeleton } from './LoadingSkeleton';

const meta: Meta = {
  title: 'Components/LoadingSkeleton',
  component: LoadingSkeleton,
  argTypes: {
    variant: {
      control: { type: 'select', options: ['player', 'playlist', 'station', 'spectrum'] },
      description: 'The variant of the skeleton to display.'
    },
    className: {
      control: 'text',
      description: 'CSS classes to apply to the skeleton element.'
    },
  },
};

export default meta;

const Template: StoryFn = (args: any) => <LoadingSkeleton {...args} />;

export const Default = Template.bind({});
Default.args = {};

export const Player = () => <AudioPlayerSkeleton />;
export const Playlist = () => <PlaylistSkeleton />;
export const Station = () => <StationSkeleton />;
export const Spectrum = () => <SpectrumSkeleton />;