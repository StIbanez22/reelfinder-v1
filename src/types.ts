export interface Movie {
  id: string;
  title: string;
  year: string;
  rating: number;
  mediaType?: 'movie' | 'tv';
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  genres: string[];
  duration?: string;
  director?: string;
  cast?: string[];
  trailerKey?: string;
  watchProviders?: {
    flatrate?: { logoPath: string; providerName: string }[];
    rent?: { logoPath: string; providerName: string }[];
    buy?: { logoPath: string; providerName: string }[];
    theaters?: boolean;
  };
  similar?: Movie[];
}

export interface MovieCategory {
  id: string;
  title: string;
  movies: Movie[];
}
