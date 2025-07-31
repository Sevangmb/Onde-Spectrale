import type { Meta, StoryObj } from '@storybook/react';
import { PlayerStatusCard } from './PlayerStatusCard';

const meta: Meta<typeof PlayerStatusCard> = {
  title: 'Components/PlayerStatusCard',
  component: PlayerStatusCard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stationId: 'station-1'
  }
};

export const Loading: Story = {
  args: {
    stationId: 'station-loading'
  }
};

export const Error: Story = {
  args: {
    stationId: 'station-error'
  }
};

export const NoPlayer: Story = {
  args: {
    stationId: 'station-no-player'
  }
};