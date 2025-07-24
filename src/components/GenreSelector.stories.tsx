import React from 'react';
import { GenreSelector } from './GenreSelector';

export default {
  title: 'Components/GenreSelector',
  component: GenreSelector,
};

export const Default = () => (
  <GenreSelector
    onGenreSelect={(genre, tracks) => {
      console.log(`Genre sélectionné: ${genre}`, tracks);
      alert(`Playlist "${genre}" générée avec ${tracks.length} pistes`);
    }}
  />
);

export const Loading = () => (
  <GenreSelector
    onGenreSelect={(genre, tracks) => console.log(genre, tracks)}
    isLoading={true}
  />
);