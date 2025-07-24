'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Shuffle, Play } from 'lucide-react';

interface GenreSelectorProps {
  onGenreSelect: (genre: string, tracks: any[]) => void;
  isLoading?: boolean;
}

const FALLBACK_GENRES = [
  'Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Hip Hop', 
  'Country', 'Blues', 'Alternative', 'Metal', 'Indie', 'R&B'
];

export function GenreSelector({ onGenreSelect, isLoading = false }: GenreSelectorProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [loadingGenre, setLoadingGenre] = useState<string | null>(null);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      const response = await fetch('/api/plex/genres');
      if (response.ok) {
        const plexGenres = await response.json();
        setGenres(plexGenres.length > 0 ? plexGenres : FALLBACK_GENRES);
      } else {
        setGenres(FALLBACK_GENRES);
      }
    } catch (error) {
      console.error('Erreur chargement genres:', error);
      setGenres(FALLBACK_GENRES);
    }
  };

  const handleGenreClick = async (genre: string) => {
    if (loadingGenre || isLoading) return;
    
    setLoadingGenre(genre);
    setSelectedGenre(genre);
    
    try {
      const response = await fetch(`/api/plex/tracks-by-genre?genre=${encodeURIComponent(genre)}&limit=20`);
      if (response.ok) {
        const tracks = await response.json();
        onGenreSelect(genre, tracks);
      } else {
        console.error('Erreur récupération pistes genre:', response.statusText);
      }
    } catch (error) {
      console.error('Erreur requête genre:', error);
    } finally {
      setLoadingGenre(null);
    }
  };

  const generateMixedPlaylist = async () => {
    if (loadingGenre || isLoading) return;
    
    setLoadingGenre('mixed');
    
    try {
      const selectedGenres = genres.slice(0, 5); // Top 5 genres
      const allTracks: any[] = [];
      
      for (const genre of selectedGenres) {
        const response = await fetch(`/api/plex/tracks-by-genre?genre=${encodeURIComponent(genre)}&limit=4`);
        if (response.ok) {
          const tracks = await response.json();
          allTracks.push(...tracks);
        }
      }
      
      // Mélange des pistes
      const shuffled = allTracks.sort(() => Math.random() - 0.5);
      onGenreSelect('Playlist Mixte', shuffled);
      setSelectedGenre('mixed');
    } catch (error) {
      console.error('Erreur génération playlist mixte:', error);
    } finally {
      setLoadingGenre(null);
    }
  };

  return (
    <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-orange-400 flex items-center gap-2">
          <Music className="h-5 w-5" />
          Playlists Intelligentes par Genre
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bouton playlist mixte */}
        <Button
          onClick={generateMixedPlaylist}
          disabled={loadingGenre === 'mixed' || isLoading}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          {loadingGenre === 'mixed' ? 'Génération...' : 'Playlist Mixte'}
        </Button>

        {/* Grille des genres */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {genres.map((genre) => (
            <Button
              key={genre}
              onClick={() => handleGenreClick(genre)}
              disabled={loadingGenre === genre || isLoading}
              variant={selectedGenre === genre ? "default" : "outline"}
              className={`
                h-auto p-3 flex flex-col items-center gap-2 text-sm
                ${selectedGenre === genre 
                  ? 'bg-orange-600 hover:bg-orange-700 border-orange-500' 
                  : 'border-orange-500/50 hover:border-orange-500 hover:bg-orange-900/20'
                }
              `}
            >
              <Play className="h-4 w-4" />
              <span className="text-center break-words">
                {loadingGenre === genre ? 'Chargement...' : genre}
              </span>
            </Button>
          ))}
        </div>

        {/* Info genre sélectionné */}
        {selectedGenre && selectedGenre !== 'mixed' && (
          <Badge variant="secondary" className="bg-orange-900/50 text-orange-200">
            Genre actuel: {selectedGenre}
          </Badge>
        )}
        
        {selectedGenre === 'mixed' && (
          <Badge variant="secondary" className="bg-orange-900/50 text-orange-200">
            Playlist mixte multi-genres active
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}