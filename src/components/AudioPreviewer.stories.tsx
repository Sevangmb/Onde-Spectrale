import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { AudioPreviewer } from './AudioPreviewer';
import type { AudioPreviewerProps } from './AudioPreviewer';

const meta: Meta<AudioPreviewerProps> = {
  title: 'Components/AudioPreviewer',
  component: AudioPreviewer,
  argTypes: {
    character: {
      control: 'object',
      description: 'The character object with voice settings.'
    },
  },
};

export default meta;

const Template: StoryFn<AudioPreviewerProps> = (args: AudioPreviewerProps) => <AudioPreviewer {...args} />;

export const Default = Template.bind({});
Default.args = {
  character: {
    id: 'test-character',
    name: 'Personnage de Test',
    description: 'Un personnage de test pour la démonstration',
    isCustom: true,
    voice: {
      gender: 'male',
      tone: 'friendly',
      style: 'casual',
    },
    ownerId: 'test-owner',
    createdAt: new Date().toISOString(),
  },
};