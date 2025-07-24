import React from 'react';
import { StationStatusCard } from './StationStatusCard';

export default {
  title: 'Components/StationStatusCard',
  component: StationStatusCard,
};

export const ActiveStation = () => (
  <StationStatusCard
    station={{
      id: '1',
      name: 'Radio Onde Spectrale',
      frequency: '108.5 FM',
      description: 'La voix du wasteland',
      isActive: true,
      lastUpdate: new Date().toISOString(),
      listeners: 42
    }}
    onSelect={(station) => console.log('Selected:', station)}
    isSelected={true}
  />
);

export const InactiveStation = () => (
  <StationStatusCard
    station={{
      id: '2',
      name: 'Enclave Radio',
      frequency: '101.7 FM',
      description: 'Transmissions gouvernementales',
      isActive: false,
      lastUpdate: new Date(Date.now() - 86400000).toISOString(),
      listeners: 0
    }}
    onSelect={(station) => console.log('Selected:', station)}
    isSelected={false}
  />
);

export const HighTrafficStation = () => (
  <StationStatusCard
    station={{
      id: '3',
      name: 'Diamond City Radio',
      frequency: '98.3 FM',
      description: 'Musique et nouvelles du Commonwealth',
      isActive: true,
      lastUpdate: new Date().toISOString(),
      listeners: 156
    }}
    onSelect={(station) => console.log('Selected:', station)}
    isSelected={false}
  />
);