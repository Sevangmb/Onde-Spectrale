import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { OndeSpectraleLogo } from './icons';

const meta: Meta = {
  title: 'Components/Icons/OndeSpectraleLogo',
  component: OndeSpectraleLogo,
  argTypes: {
    className: {
      control: 'text',
      description: 'CSS classes to apply to the SVG element.'
    },
  },
};

export default meta;

const Template: StoryFn = (args: any) => <OndeSpectraleLogo {...args} />;

export const Default = Template.bind({});
Default.args = {
  className: 'h-16 w-16 text-primary',
};

export const Small = Template.bind({});
Small.args = {
  className: 'h-8 w-8 text-destructive',
};