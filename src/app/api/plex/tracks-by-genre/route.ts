import { NextRequest, NextResponse } from 'next/server';
import { getPlexTracksByGenre } from '@/lib/plex';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!genre) {
      return NextResponse.json(
        { error: 'Paramètre genre requis' }, 
        { status: 400 }
      );
    }

    const tracks = await getPlexTracksByGenre(genre, limit);
    return NextResponse.json(tracks);
  } catch (error) {
    console.error('Erreur API pistes par genre:', error);
    return NextResponse.json(
      { error: 'Erreur récupération pistes' }, 
      { status: 500 }
    );
  }
}