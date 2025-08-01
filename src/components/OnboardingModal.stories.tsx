import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { OnboardingModal } from './OnboardingModal';

const meta: Meta = {
  title: 'Components/OnboardingModal',
  component: OnboardingModal,
};

export default meta;

const Template: StoryFn = (args: any) => <OnboardingModal {...args} />;

export const Default = Template.bind({});
Default.args = {};