'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlaylistItem } from '@/lib/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// Icons
import {
  GripVertical,
  Trash2,
  PlayCircle,
  MessageSquare,
  Clock,
  User
} from 'lucide-react';

interface SortablePlaylistProps {
  playlist: PlaylistItem[];
  selectedTrackIds: Set<string>;
  onReorder: (newOrder: string[]) => Promise<void>;
  onTrackSelect: (trackId: string) => void;
  onTrackRemove: (trackId: string) => Promise<void>;
  isReordering?: boolean;
  isDeletingTracks?: boolean;
}

interface SortableTrackItemProps {
  track: PlaylistItem;
  isSelected: boolean;
  onSelect: (trackId: string) => void;
  onRemove: (trackId: string) => Promise<void>;
  isDeletingTracks: boolean;
}

function SortableTrackItem({ 
  track, 
  isSelected, 
  onSelect, 
  onRemove, 
  isDeletingTracks 
}: SortableTrackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 border rounded-lg transition-all
        ${isSelected ? 'bg-primary/10 border-primary shadow-sm' : 'bg-background hover:bg-muted/50'}
        ${isDragging ? 'shadow-lg z-10' : ''}
      `}
    >
      {/* Selection Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect(track.id)}
        className="flex-shrink-0"
      />

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Track Type Icon */}
      <div className="flex-shrink-0">
        {track.type === 'music' ? (
          <PlayCircle className="h-5 w-5 text-primary" />
        ) : (
          <MessageSquare className="h-5 w-5 text-blue-500" />
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{track.title}</h4>
          {track.type === 'message' && (
            <Badge variant="secondary" className="text-xs">Message</Badge>
          )}
        </div>
        
        {track.artist && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{track.artist}</span>
          </div>
        )}
        
        {track.album && (
          <div className="text-xs text-muted-foreground truncate">
            Album: {track.album}
          </div>
        )}
        
        {track.genre && (
          <div className="flex flex-wrap gap-1 mt-1">
            {track.genre.split(',').map((genre, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {genre.trim()}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="flex-shrink-0 flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatDuration(track.duration)}</span>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(track.id)}
          disabled={isDeletingTracks}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SortablePlaylist({
  playlist,
  selectedTrackIds,
  onReorder,
  onTrackSelect,
  onTrackRemove,
  isReordering = false,
  isDeletingTracks = false
}: SortablePlaylistProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = playlist.findIndex(item => item.id === active.id);
      const newIndex = playlist.findIndex(item => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Créer le nouvel ordre
        const reorderedItems = arrayMove(playlist, oldIndex, newIndex);
        const newOrder = reorderedItems.map(item => item.id);
        
        // Appliquer la réorganisation
        await onReorder(newOrder);
      }
    }
  };

  if (playlist.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Playlist vide</p>
        <p className="text-sm">Ajoutez des pistes pour commencer</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Loading State */}
      {isReordering && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4 animate-pulse" />
          Réorganisation en cours...
        </div>
      )}

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={playlist.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {playlist.map((track) => (
              <SortableTrackItem
                key={track.id}
                track={track}
                isSelected={selectedTrackIds.has(track.id)}
                onSelect={onTrackSelect}
                onRemove={onTrackRemove}
                isDeletingTracks={isDeletingTracks}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Summary */}
      <div className="flex justify-between items-center pt-4 border-t text-sm text-muted-foreground">
        <span>{playlist.length} piste(s) au total</span>
        <span>
          {selectedTrackIds.size > 0 && `${selectedTrackIds.size} sélectionnée(s)`}
        </span>
      </div>
    </div>
  );
}
