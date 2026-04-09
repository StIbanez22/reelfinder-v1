import { Movie } from "../types";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

export const GENRE_MAP: { [key: number]: string } = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

export const TV_GENRE_MAP: { [key: number]: string } = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
  10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
};

export class MovieService {
  private static async fetchFromTMDB(endpoint: string, params: string = '') {
    if (!TMDB_API_KEY || TMDB_API_KEY === 'MY_TMDB_API_KEY') {
      console.error('TMDB API Key is missing or invalid. Please add VITE_TMDB_API_KEY to your secrets in the Settings menu.');
      return null;
    }
    const url = `${BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US${params}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TMDB API Error: ${response.status} ${response.statusText} - ${errorData.status_message || 'No message'}`);
      }
      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error fetching from TMDB. This may be due to a CORS issue or a blocked request. URL:', url);
      }
      throw error;
    }
  }

  private static mapMovie(tmdbMovie: any, type?: 'movie' | 'tv'): Movie {
    return {
      id: tmdbMovie.id.toString(),
      title: tmdbMovie.title || tmdbMovie.name,
      year: (tmdbMovie.release_date || tmdbMovie.first_air_date || '').split('-')[0],
      rating: parseFloat(tmdbMovie.vote_average?.toFixed(1) || '0'),
      mediaType: type || tmdbMovie.media_type,
      overview: tmdbMovie.overview,
      posterUrl: tmdbMovie.poster_path ? `${IMAGE_BASE_URL}${tmdbMovie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: tmdbMovie.backdrop_path ? `${BACKDROP_BASE_URL}${tmdbMovie.backdrop_path}` : 'https://via.placeholder.com/1920x1080?text=No+Backdrop',
      genres: (tmdbMovie.genre_ids || []).map((id: number) => GENRE_MAP[id] || 'Other'),
    };
  }

  static async searchMovies(query: string): Promise<Movie[]> {
    const data = await this.fetchFromTMDB('/search/movie', `&query=${encodeURIComponent(query)}`);
    return (data?.results || []).map((m: any) => this.mapMovie(m, 'movie'));
  }

  static async discoverMedia(type: 'movie' | 'tv', filters: { genre?: string; year?: string; minRating?: number }): Promise<Movie[]> {
    const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
    const map = type === 'movie' ? GENRE_MAP : TV_GENRE_MAP;
    let params = '&sort_by=popularity.desc';
    
    if (filters.genre) {
      const genreId = Object.keys(map).find(key => map[parseInt(key)] === filters.genre);
      if (genreId) params += `&with_genres=${genreId}`;
    }
    
    if (filters.year) {
      const yearParam = type === 'movie' ? 'primary_release_year' : 'first_air_date_year';
      params += `&${yearParam}=${filters.year}`;
    }
    
    if (filters.minRating) {
      params += `&vote_average.gte=${filters.minRating}`;
    }

    const data = await this.fetchFromTMDB(endpoint, params);
    return (data?.results || []).map((m: any) => this.mapMovie(m, type));
  }

  static async getTrendingMovies(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB('/trending/movie/week');
    return (data?.results || []).map((m: any) => this.mapMovie(m, 'movie'));
  }

  static async getLatestMovies(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB('/discover/movie', '&sort_by=primary_release_date.desc&vote_count.gte=50');
    return (data?.results || []).map((m: any) => this.mapMovie(m, 'movie'));
  }

  static async getTrendingTVShows(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB('/trending/tv/week');
    return (data?.results || []).map((m: any) => this.mapMovie(m, 'tv'));
  }

  static async getLatestTVShows(): Promise<Movie[]> {
    const data = await this.fetchFromTMDB('/discover/tv', '&sort_by=first_air_date.desc&vote_count.gte=50');
    return (data?.results || []).map((m: any) => this.mapMovie(m, 'tv'));
  }

  static async getMoviesByCategory(category: string): Promise<Movie[]> {
    // Map category name to TMDB genre ID
    const genreId = Object.keys(GENRE_MAP).find(key => GENRE_MAP[parseInt(key)] === category);
    if (!genreId) return [];
    
    const data = await this.fetchFromTMDB('/discover/movie', `&with_genres=${genreId}&sort_by=popularity.desc`);
    return (data?.results || []).map((m: any) => this.mapMovie(m, 'movie'));
  }

  static async getMediaByGenre(type: 'movie' | 'tv', genreId: number): Promise<Movie[]> {
    const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
    const data = await this.fetchFromTMDB(endpoint, `&with_genres=${genreId}&sort_by=popularity.desc`);
    return (data?.results || []).map((m: any) => this.mapMovie(m, type));
  }

  static async getMediaDetails(id: string, type: 'movie' | 'tv'): Promise<Movie | null> {
    const endpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
    const data = await this.fetchFromTMDB(endpoint, '&append_to_response=credits,videos,watch/providers,similar');
    if (!data) return null;
    
    const movie = this.mapMovie(data, type);
    movie.genres = (data.genres || []).map((g: any) => g.name);
    movie.duration = type === 'movie' 
      ? (data.runtime ? `${data.runtime} min` : undefined)
      : (data.episode_run_time?.[0] ? `${data.episode_run_time[0]} min` : undefined);
    
    movie.director = type === 'movie'
      ? data.credits?.crew?.find((c: any) => c.job === 'Director')?.name
      : data.created_by?.[0]?.name;
    
    movie.cast = data.credits?.cast?.slice(0, 5).map((c: any) => c.name);
    
    // Extract trailer
    const trailer = data.videos?.results?.find(
      (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
    );
    movie.trailerKey = trailer?.key;

    // Extract similar movies/TV shows
    movie.similar = (data.similar?.results || []).slice(0, 6).map((m: any) => this.mapMovie(m, type));

    // Extract watch providers (US as default)
    const providers = data['watch/providers']?.results?.US;
    if (providers) {
      movie.watchProviders = {
        flatrate: (providers.flatrate || []).map((p: any) => ({
          logoPath: `${IMAGE_BASE_URL}${p.logo_path}`,
          providerName: p.provider_name
        })),
        rent: (providers.rent || []).map((p: any) => ({
          logoPath: `${IMAGE_BASE_URL}${p.logo_path}`,
          providerName: p.provider_name
        })),
        buy: (providers.buy || []).map((p: any) => ({
          logoPath: `${IMAGE_BASE_URL}${p.logo_path}`,
          providerName: p.provider_name
        })),
      };
    }

    // Check if in theaters (only for movies)
    if (type === 'movie' && data.release_date) {
      const releaseDate = new Date(data.release_date);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays <= 60) {
        if (!movie.watchProviders) movie.watchProviders = {};
        movie.watchProviders.theaters = true;
      }
    }
    
    return movie;
  }

  static async getMovieDetails(movieId: string): Promise<Movie | null> {
    return this.getMediaDetails(movieId, 'movie');
  }
}
