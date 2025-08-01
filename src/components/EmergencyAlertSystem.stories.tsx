import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { EmergencyAlertSystem } from './EmergencyAlertSystem';

interface EmergencyAlertSystemProps {
  isRadioActive: boolean;
  currentFrequency: number;
}

const meta: Meta<EmergencyAlertSystemProps> = {
  title: 'Components/EmergencyAlertSystem',
  component: EmergencyAlertSystem,
  argTypes: {
    isRadioActive: {
      control: 'boolean',
      description: 'Indicates if the radio is active, affecting alert triggering.'
    },
    currentFrequency: {
      control: { type: 'range', min: 88, max: 108, step: 0.1 },
      description: 'The current radio frequency, which can influence alert probability.'
    },
  },
};

export default meta;

const Template: StoryFn<EmergencyAlertSystemProps> = (args) => <EmergencyAlertSystem {...args} />;

export const Default = Template.bind({});
Default.args = {
  isRadioActive: true,
  currentFrequency: 98.5,
};

export const RadioInactive = Template.bind({});
RadioInactive.args = {
  isRadioActive: false,
  currentFrequency: 98.5,
};

export const HighFrequency = Template.bind({});
HighFrequency.args = {
  isRadioActive: true,
  currentFrequency: 105.7,
};