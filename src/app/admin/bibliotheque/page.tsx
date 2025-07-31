'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { testPlexConnectionAction, searchPlexMusicAction, getRandomPlexTracksAction } from '@/app/actions-plex';
import { PlaylistItem } from '@/lib/types';
import { Music, Search, Shuffle, Server, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function BibliothequePage() {
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    libraries: any[];
    error?: string;
  } | null>(null);
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaylistItem[]>([]);
  const [randomTracks, setRandomTracks] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testPlexConnectionAction();
      setConnectionStatus(result);
    } catch (error) {
      console.error('Erreur test connexion:', error);
      setConnectionStatus({
        connected: false,
        libraries: [],
        error: 'Erreur lors du test de connexion'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await searchPlexMusicAction(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomTracks = async () => {
    setIsLoading(true);
    try {
      const results = await getRandomPlexTracksAction(10);
      setRandomTracks(results);
    } catch (error) {
      console.error('Erreur pistes aléatoires:', error);
      setRandomTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const playTrack = (track: PlaylistItem) => {
    // Créer un élément audio temporaire pour tester la lecture
    const audio = new Audio(track.url);
    audio.play().catch(error => {
      console.error('Erreur lecture:', error);
      alert(`Impossible de lire: ${track.title}`);
    });
  };

  // Test automatique au chargement
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="space-y-6">
        
        {/* En-tête */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Server className="h-6 w-6" />
              Bibliothèque Plex
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Test de connexion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">État de la connexion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={testConnection} 
                disabled={isTestingConnection}
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <Server className="h-4 w-4 mr-2" />
                    Tester la connexion
                  </>
                )}
              </Button>

              {connectionStatus && (
                <div className="flex items-center gap-2">
                  {connectionStatus.connected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-400">Connecté</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-red-400">Déconnecté</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {connectionStatus?.error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                <p className="text-red-400 text-sm">{connectionStatus.error}</p>
              </div>
            )}

            {connectionStatus?.connected && connectionStatus.libraries.length > 0 && (
              <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-md">
                <p className="text-green-400 font-medium mb-2">
                  Bibliothèques musicales trouvées:
                </p>
                <ul className="text-green-300 text-sm space-y-1">
                  {connectionStatus.libraries && connectionStatus.libraries.map((lib: any, index: number) => (
                    <li key={index}>• {lib.title} ({lib.type})</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recherche */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Recherche musicale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Chercher artiste, titre, album..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isLoading || !searchQuery.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults && searchResults.map((track) => (
                  <div 
                    key={track.id} 
                    className="p-3 bg-slate-800/50 rounded-md flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-primary">{track.title}</p>
                      <p className="text-sm text-muted-foreground">{track.artist}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => playTrack(track)}
                    >
                      <Music className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {searchResults.length === 0 && searchQuery && !isLoading && (
                <p className="text-muted-foreground text-center py-4">
                  Aucun résultat trouvé pour "{searchQuery}"
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pistes aléatoires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                Pistes aléatoires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={getRandomTracks} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4 mr-2" />
                    Obtenir 10 pistes aléatoires
                  </>
                )}
              </Button>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {randomTracks.map((track) => (
                  <div 
                    key={track.id} 
                    className="p-3 bg-slate-800/50 rounded-md flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-primary">{track.title}</p>
                      <p className="text-sm text-muted-foreground">{track.artist}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => playTrack(track)}
                    >
                      <Music className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration actuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Serveur Plex:</p>
                <p className="font-mono text-primary">{process.env.NEXT_PUBLIC_PLEX_SERVER_URL || 'Non configuré'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Token:</p>
                <p className="font-mono text-primary">{process.env.NEXT_PUBLIC_PLEX_TOKEN ? 'Défini' : 'Non configuré'}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-md">
              <p className="text-blue-400 text-sm">
                ℹ️ Les informations sont lues depuis vos variables d'environnement.
              </p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
