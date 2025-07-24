import { NextResponse } from 'next/server';
import { getPlexGenres } from '@/lib/plex';

export async function GET() {
  try {
    const genres = await getPlexGenres();
    return NextResponse.json(genres);
  } catch (error) {
    console.error('Erreur API genres Plex:', error);
    return NextResponse.json(
      { error: 'Erreur récupération genres' }, 
      { status: 500 }
    );
  }
}