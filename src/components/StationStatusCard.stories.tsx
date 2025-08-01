import type { Meta, StoryObj } from '@storybook/nextjs';
import { StationStatusCard } from './StationStatusCard';

const meta: Meta<typeof StationStatusCard> = {
  title: 'Components/StationStatusCard',
  component: StationStatusCard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stationId: 'station-1',
    name: 'Radio Onde Spectrale',
    frequency: 101.5
  }
};

export const Playing: Story = {
  args: {
    stationId: 'station-playing',
    name: 'Radio Active',
    frequency: 88.3
  }
};

export const Error: Story = {
  args: {
    stationId: 'station-error',
    name: 'Radio Broken',
    frequency: 99.9
  }
};