import React from 'react';

export default {
  title: 'Components/OndeSpectraleRadio',
  parameters: {
    layout: 'fullscreen',
  },
};

// Mock component for Storybook to avoid server-side dependencies
const MockOndeSpectraleRadio = () => (
  <div className="min-h-screen bg-black text-green-400 p-8">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-center">Radio Onde Spectrale</h1>
      <div className="border border-green-400 p-6 rounded-lg">
        <p className="text-lg mb-4">Interface radio post-apocalyptique</p>
        <p className="text-gray-400">
          Cette story affiche une version mockée du composant principal pour éviter les dépendances serveur.
        </p>
      </div>
    </div>
  </div>
);

export const Default = () => (
  <MockOndeSpectraleRadio />
);

export const DarkTheme = () => (
  <div className="dark">
    <MockOndeSpectraleRadio />
  </div>
);