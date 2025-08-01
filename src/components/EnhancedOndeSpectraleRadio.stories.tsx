import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { EnhancedOndeSpectraleRadio } from './EnhancedOndeSpectraleRadio';

const meta: Meta = {
  title: 'Components/EnhancedOndeSpectraleRadio',
  component: EnhancedOndeSpectraleRadio,
};

export default meta;

const Template: StoryFn = (args: any) => <EnhancedOndeSpectraleRadio {...args} />;

export const Default = Template.bind({});
Default.args = {};