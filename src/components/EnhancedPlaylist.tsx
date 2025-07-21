
'use client';

import { useState, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  MessageSquare, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Clock,
  User,
  X,
  Play,
  Pause,
  ListMusic
} from 'lucide-react';
import type { PlaylistItem } from '@/lib/types';

interface EnhancedPlaylistProps {
  playlist: PlaylistItem[];
  currentTrackIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  onTrackSelect: (index: number) => void;
}

type SortField = 'addedAt' | 'title' | 'artist' | 'type';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'music' | 'message';

export function EnhancedPlaylist({ 
  playlist, 
  currentTrackIndex, 
  isPlaying, 
  isLoading, 
  onTrackSelect 
}: EnhancedPlaylistProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('addedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Statistiques de la playlist
  const playlistStats = useMemo(() => {
    const musicCount = playlist.filter(item => item.type === 'music').length;
    const messageCount = playlist.filter(item => item.type === 'message').length;
    const totalDuration = playlist.reduce((sum, item) => sum + (item.duration || 180), 0);
    
    return {
      total: playlist.length,
      music: musicCount,
      messages: messageCount,
      totalDuration: Math.round(totalDuration / 60)
    };
  }, [playlist]);

  // Filtrage et tri de la playlist
  const filteredAndSortedPlaylist = useMemo(() => {
    let filtered = playlist.map((item, index) => ({ ...item, originalIndex: index }));

    // Filtrage par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        (item.artist && item.artist.toLowerCase().includes(query))
      );
    }

    // Filtrage par type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'addedAt':
          comparison = new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = (a.artist || '').localeCompare(b.artist || '');
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [playlist, searchQuery, filterType, sortField, sortOrder]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType('all');
    setSortField('addedAt');
    setSortOrder('desc');
  }, []);

  const formatDuration = (minutes: number) => {
    if (isNaN(minutes)) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <ListMusic className="h-5 w-5 text-orange-400" />
          <h3 className="font-headline text-xl text-orange-100 tracking-wider">Playlist</h3>
        </div>
        <div className="bg-black/70 border border-orange-500/40 rounded-lg p-4 backdrop-blur-sm shadow-lg shadow-orange-500/10 flex-1">
          <div className="space-y-3">
            <Skeleton className="w-full h-10 bg-orange-400/20" />
            <Skeleton className="w-full h-10 bg-orange-400/20" />
            <Skeleton className="w-full h-10 bg-orange-400/20" />
            <Skeleton className="w-full h-10 bg-orange-400/20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(90vh-12rem)]">
      {/* En-tête avec statistiques */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ListMusic className="h-5 w-5 text-orange-400" />
          <h3 className="font-headline text-xl text-orange-100 tracking-wider">Playlist</h3>
          {playlist.length > 0 && (
            <Badge variant="outline" className="border-orange-500/40 text-orange-300 bg-orange-900/20">
              {playlistStats.total}
            </Badge>
          )}
        </div>
        
        {playlist.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 hover:text-orange-100"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtres
          </Button>
        )}
      </div>

      {/* Statistiques rapides */}
      {playlist.length > 0 && (
        <div className="flex gap-2 mb-3 text-xs flex-wrap">
          <Badge variant="secondary" className="bg-orange-900/20 border-orange-500/20 text-orange-300"><Music className="h-3 w-3 mr-1" /> {playlistStats.music}</Badge>
          <Badge variant="secondary" className="bg-orange-900/20 border-orange-500/20 text-orange-300"><MessageSquare className="h-3 w-3 mr-1" /> {playlistStats.messages}</Badge>
          <Badge variant="secondary" className="bg-orange-900/20 border-orange-500/20 text-orange-300"><Clock className="h-3 w-3 mr-1" /> ~{formatDuration(playlistStats.totalDuration)}</Badge>
        </div>
      )}

      {/* Contrôles de filtrage */}
      {showFilters && playlist.length > 0 && (
        <div className="space-y-3 mb-4 p-3 bg-black/80 border border-orange-500/30 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400/60" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/60 border-orange-500/30 text-orange-100 placeholder:text-orange-400/60 h-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
             <div className="flex gap-1">
              {(['all', 'music', 'message'] as FilterType[]).map((type) => (
                <Button key={type} variant={filterType === type ? "default" : "outline"} size="sm" onClick={() => setFilterType(type)} className="text-xs h-8">
                  {type === 'all' ? 'Tout' : type === 'music' ? 'Musique' : 'Messages'}
                </Button>
              ))}
            </div>
            
            {(searchQuery || filterType !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8"><X className="h-3 w-3 mr-1" />Effacer</Button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 bg-black/70 border border-orange-500/40 rounded-lg backdrop-blur-sm shadow-lg shadow-orange-500/10 overflow-hidden">
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-orange-300/60 p-4">
            <ListMusic className="h-8 w-8 mb-2 opacity-50" />
            <p>Playlist vide</p>
          </div>
        ) : filteredAndSortedPlaylist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-orange-300/60 p-4">
            <Search className="h-8 w-8 mb-2 opacity-50" />
            <p>Aucun résultat</p>
          </div>
        ) : (
          <ScrollArea className="h-full p-2">
            <ul className="space-y-1">
              {filteredAndSortedPlaylist.map((item) => {
                const isCurrentTrack = item.originalIndex === currentTrackIndex;
                const isCurrentlyPlaying = isCurrentTrack && isPlaying;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onTrackSelect(item.originalIndex)}
                      className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all duration-200 group ${
                        isCurrentTrack 
                          ? 'bg-orange-500/50 border border-orange-400/50 shadow-md shadow-orange-500/20' 
                          : 'hover:bg-orange-500/20 hover:border hover:border-orange-500/30'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {item.type === 'music' ? 
                          <Music className="h-4 w-4 text-orange-400" /> : 
                          <MessageSquare className="h-4 w-4 text-orange-400" />
                        }
                      </div>

                      <div className="flex-grow overflow-hidden">
                        <p className="truncate text-sm text-orange-100 font-medium">
                          {item.title}
                        </p>
                        {item.artist && (
                          <p className="text-xs text-orange-300/70 truncate">
                            {item.artist}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        {isCurrentTrack ? (
                           isCurrentlyPlaying ? (
                              <Pause className="h-4 w-4 text-orange-100" />
                            ) : (
                              <Play className="h-4 w-4 text-orange-100" />
                            )
                        ) : (
                          <Play className="h-4 w-4 text-orange-300/50 group-hover:text-orange-100 transition-colors" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>

    </div>
  );
}
