/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Search as SearchIcon, Play, Info, Plus, X, Star, TrendingUp, Film, Tv, Clock, User, LogIn, LogOut, Bookmark, Check, ChevronLeft, ChevronRight, Filter, SlidersHorizontal, Clapperboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MovieService, GENRE_MAP, TV_GENRE_MAP } from './services/movieService';
import { Movie } from './types';
import { cn } from './lib/utils';
import { auth, db, googleProvider, signInWithPopup, signOut, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from './firebase';

type View = 'home' | 'movies' | 'tv';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistMovies, setWatchlistMovies] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [trendingTV, setTrendingTV] = useState<Movie[]>([]);
  const [latestTV, setLatestTV] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playingTrailerKey, setPlayingTrailerKey] = useState<string | null>(null);

  // View State
  const [currentView, setCurrentView] = useState<View>('home');
  const [genreData, setGenreData] = useState<{ name: string; movies: Movie[] }[]>([]);
  const [isGenreLoading, setIsGenreLoading] = useState(false);

  // Live Suggestions State
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    genre: '',
    year: '',
    minRating: 0
  });

  const genres = Array.from(new Set(Object.values(currentView === 'tv' ? TV_GENRE_MAP : GENRE_MAP))).sort();
  const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());

  // Debounced Search for Suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const results = await MovieService.searchMovies(searchQuery);
          setSuggestions(results.slice(0, 6));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Suggestions error:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Genre-based data for Movies/TV views
  useEffect(() => {
    if (currentView === 'home') return;

    const fetchGenreData = async () => {
      setIsGenreLoading(true);
      const map = currentView === 'movies' ? GENRE_MAP : TV_GENRE_MAP;
      const type = currentView === 'movies' ? 'movie' : 'tv';
      
      // Select 5-6 popular genres to show
      const selectedGenreIds = Object.keys(map).slice(0, 6).map(Number);
      
      try {
        const results = await Promise.all(
          selectedGenreIds.map(async (id) => ({
            name: map[id],
            movies: await MovieService.getMediaByGenre(type, id)
          }))
        );
        setGenreData(results);
      } catch (error) {
        console.error('Error fetching genre data:', error);
      } finally {
        setIsGenreLoading(false);
      }
    };

    fetchGenreData();
  }, [currentView]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        // Listen to user's watchlist in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const unsubWatchlist = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setWatchlist(doc.data().watchlist || []);
          } else {
            // Create user document if it doesn't exist
            setDoc(userDocRef, { watchlist: [], email: user.email, displayName: user.displayName });
          }
        });
        return () => unsubWatchlist();
      } else {
        setWatchlist([]);
        setWatchlistMovies([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Watchlist Movies
  useEffect(() => {
    const fetchWatchlist = async () => {
      if (watchlist.length > 0) {
        const movies = await Promise.all(watchlist.map(id => MovieService.getMovieDetails(id)));
        setWatchlistMovies(movies.filter(m => m !== null) as Movie[]);
      } else {
        setWatchlistMovies([]);
      }
    };
    fetchWatchlist();
  }, [watchlist]);

  useEffect(() => {
    if (!import.meta.env.VITE_TMDB_API_KEY || import.meta.env.VITE_TMDB_API_KEY === 'MY_TMDB_API_KEY') {
      console.error('CRITICAL: TMDB API Key is missing or using placeholder value. Please set VITE_TMDB_API_KEY in the Secrets panel.');
    }

    const fetchData = async () => {
      try {
        const [trendingMovies, latestRelease, trendingTVShows, latestTVShows] = await Promise.all([
          MovieService.getTrendingMovies(),
          MovieService.getLatestMovies(),
          MovieService.getTrendingTVShows(),
          MovieService.getLatestTVShows(),
        ]);
        setTrending(trendingMovies);
        setLatestMovies(latestRelease);
        setTrendingTV(trendingTVShows);
        setLatestTV(latestTVShows);
      } catch (error) {
        console.error('Error fetching movies:', error);
        if (error instanceof Error && error.message === 'Failed to fetch') {
          console.error('Detailed Debug: The fetch request failed completely. Check if TMDB API is accessible from your network and that your API key is correctly configured in the Secrets panel.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogin = async () => {
    // Sign-in function is currently disabled
    console.info('Sign-in is currently disabled.');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleWatchlist = async (movieId: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    const userDocRef = doc(db, 'users', user.uid);
    const isAdded = watchlist.includes(movieId);
    try {
      await updateDoc(userDocRef, {
        watchlist: isAdded ? arrayRemove(movieId) : arrayUnion(movieId)
      });
    } catch (error) {
      console.error('Watchlist update error:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() && !filters.genre && !filters.year && !filters.minRating) return;
    
    setIsSearching(true);
    try {
      let results: Movie[] = [];
      if (searchQuery.trim()) {
        results = await MovieService.searchMovies(searchQuery);
        // Apply client-side filters if they exist since TMDB search endpoint is limited
        if (filters.genre || filters.year || filters.minRating) {
          results = results.filter(m => {
            const matchesGenre = !filters.genre || m.genres.includes(filters.genre);
            const matchesYear = !filters.year || m.year === filters.year;
            const matchesRating = m.rating >= filters.minRating;
            return matchesGenre && matchesYear && matchesRating;
          });
        }
      } else {
        // Use discover endpoint for pure filtered search
        const type = currentView === 'tv' ? 'tv' : 'movie';
        results = await MovieService.discoverMedia(type, filters);
      }
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = () => {
    setFilters({ genre: '', year: '', minRating: 0 });
    if (!searchQuery) {
      setSearchResults([]);
    } else {
      // Re-trigger search without filters
      handleSearch({ preventDefault: () => {} } as any);
    }
  };

  const handlePlayTrailer = async (movie: Movie) => {
    if (movie.trailerKey) {
      setPlayingTrailerKey(movie.trailerKey);
      return;
    }

    try {
      const details = await MovieService.getMediaDetails(movie.id, movie.mediaType || 'movie');
      if (details?.trailerKey) {
        setPlayingTrailerKey(details.trailerKey);
      } else {
        console.warn('Trailer not available for this title.');
      }
    } catch (error) {
      console.error('Error playing trailer:', error);
    }
  };

  const featuredMovie = trending[0];

  return (
    <div className="min-h-screen bg-background-dark text-white font-sans selection:bg-primary selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-background-dark/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => {
              setCurrentView('home');
              setSearchQuery('');
              clearFilters();
            }}
            className="text-2xl font-bold tracking-tighter text-primary uppercase"
          >
            ReelFinder
          </button>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
            <button 
              onClick={() => {
                setCurrentView('home');
                setSearchQuery('');
                clearFilters();
              }}
              className={cn("hover:text-white transition-colors", currentView === 'home' && "text-white font-bold underline underline-offset-4 decoration-primary")}
            >
              Home
            </button>
            <button 
              onClick={() => {
                setCurrentView('movies');
                setSearchQuery('');
                clearFilters();
              }}
              className={cn("hover:text-white transition-colors", currentView === 'movies' && "text-white font-bold underline underline-offset-4 decoration-primary")}
            >
              Movies
            </button>
            <button 
              onClick={() => {
                setCurrentView('tv');
                setSearchQuery('');
                clearFilters();
              }}
              className={cn("hover:text-white transition-colors", currentView === 'tv' && "text-white font-bold underline underline-offset-4 decoration-primary")}
            >
              TV Shows
            </button>
            <a href="#" className="hover:text-white transition-colors">New & Popular</a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 relative">
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowSuggestions(false);
              handleSearch(e);
            }} className="relative group">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                className="bg-black/40 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-40 md:w-64 transition-all group-hover:bg-black/60"
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </form>

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 left-0 w-full md:w-80 bg-background-dark/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]"
                >
                  <div className="p-2">
                    {suggestions.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => {
                          setSelectedMovie(movie);
                          setShowSuggestions(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-left group"
                      >
                        <img 
                          src={movie.posterUrl} 
                          alt={movie.title} 
                          className="w-10 h-14 object-cover rounded shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{movie.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="flex items-center gap-0.5 text-accent">
                              <Star className="w-3 h-3 fill-current" /> {movie.rating}
                            </span>
                            <span>{movie.year}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                    <button 
                      onClick={(e) => {
                        setShowSuggestions(false);
                        handleSearch(e as any);
                      }}
                      className="w-full text-center py-2 text-xs font-bold text-primary hover:underline border-t border-white/5 mt-1"
                    >
                      View all results
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-full transition-colors",
                showFilters || filters.genre || filters.year || filters.minRating > 0 ? "bg-primary text-white" : "bg-white/10 text-gray-400 hover:bg-white/20"
              )}
              title="Advanced Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-white">{user.displayName}</p>
                <button onClick={handleLogout} className="text-[10px] text-gray-400 hover:text-primary transition-colors">Sign Out</button>
              </div>
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-white/20" />
            </div>
          ) : null}
        </div>
      </nav>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-[72px] w-full z-40 bg-background-dark/95 backdrop-blur-md border-b border-white/10 overflow-hidden"
          >
            <div className="px-6 md:px-16 py-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Genre</label>
                <select 
                  value={filters.genre}
                  onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Genres</option>
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Year</label>
                <select 
                  value={filters.year}
                  onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Min Rating: {filters.minRating}</label>
                <input 
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSearch}
                  className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold hover:bg-primary/80 transition-colors"
                >
                  Apply Filters
                </button>
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-bold hover:bg-white/20 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 animate-pulse">Curating your cinema experience...</p>
          </div>
        </div>
      ) : (
        <main className="pb-20">
          {/* Header Section */}
          <header className="relative w-full pt-32 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute inset-0 -z-10">
              <img 
                src="https://picsum.photos/seed/cinema/1920/1080?blur=10" 
                alt="Hero Banner" 
                className="w-full h-full object-cover opacity-30"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background-dark/0 via-background-dark/50 to-background-dark" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl"
            >
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center shadow-2xl backdrop-blur-md">
                <Clapperboard className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-tight">
                Find the <span className="text-gradient">Perfect Movie</span> for Any Mood
              </h1>
              
              <Search 
                searchTerm={searchQuery} 
                setSearchTerm={setSearchQuery} 
                onSearch={handleSearch} 
              />
            </motion.div>
          </header>

          {/* Hero Section (Featured Movie) */}
          {featuredMovie && !searchQuery && (
            <section className="relative h-[70vh] w-full overflow-hidden px-6 md:px-16 mb-12">
              <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={featuredMovie.backdropUrl}
                  alt={featuredMovie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-widest text-accent">Trending Now</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter leading-none">
                    {featuredMovie.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm font-medium text-gray-300 mb-6">
                    <span className="flex items-center gap-1 text-accent">
                      <Star className="w-4 h-4 fill-current" /> {featuredMovie.rating}
                    </span>
                    <span>{featuredMovie.year}</span>
                    <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] uppercase tracking-widest">4K Ultra HD</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handlePlayTrailer(featuredMovie)}
                      className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/80 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                    >
                      <Play className="w-5 h-5 fill-current" /> Play Now
                    </button>
                    <button 
                      onClick={() => setSelectedMovie(featuredMovie)}
                      className="bg-white/10 backdrop-blur-md text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
                    >
                      <Info className="w-5 h-5" /> More Info
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Search Results */}
          {(searchQuery || filters.genre || filters.year || filters.minRating > 0) && (
            <section className={cn("px-6 md:px-16", showFilters ? "pt-48" : "pt-28")}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold tracking-tight">
                  {searchQuery ? `Search results for "${searchQuery}"` : "Filtered Results"}
                </h3>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    clearFilters();
                  }} 
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {isSearching ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {searchResults.map((movie) => (
                    <div key={movie.id}>
                      <MovieCard movie={movie} onClick={() => setSelectedMovie(movie)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  No movies found. Try different filters or search terms.
                </div>
              )}
            </section>
          )}

          {/* Movie Rows */}
          {(!searchQuery && !filters.genre && !filters.year && !filters.minRating) && (
            <div className="px-6 md:px-16 -mt-20 relative z-10 space-y-12">
              {currentView === 'home' ? (
                <>
                  {watchlistMovies.length > 0 && (
                    <MovieRow title="My Watchlist" movies={watchlistMovies} onMovieClick={setSelectedMovie} />
                  )}
                  <MovieRow title="Trending Now" movies={trending} onMovieClick={setSelectedMovie} />
                  <MovieRow title="Latest Release" movies={latestMovies} onMovieClick={setSelectedMovie} />
                  <MovieRow title="Trending TV Shows" movies={trendingTV} onMovieClick={setSelectedMovie} />
                  <MovieRow title="Latest TV Shows" movies={latestTV} onMovieClick={setSelectedMovie} />
                </>
              ) : (
                <div className="pt-20 space-y-12">
                  <h2 className="text-4xl font-black tracking-tighter mb-8 capitalize">
                    {currentView === 'movies' ? 'Movies' : 'TV Shows'}
                  </h2>
                  {isGenreLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    genreData.map((genre) => (
                      <MovieRow 
                        key={genre.name} 
                        title={genre.name} 
                        movies={genre.movies} 
                        onMovieClick={setSelectedMovie} 
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* Movie Detail Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetail 
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)} 
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            onPlayTrailer={handlePlayTrailer}
            onMovieClick={setSelectedMovie}
          />
        )}
      </AnimatePresence>

      {/* Trailer Modal */}
      <AnimatePresence>
        {playingTrailerKey && (
          <TrailerModal 
            trailerKey={playingTrailerKey} 
            onClose={() => setPlayingTrailerKey(null)} 
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 md:px-16 text-gray-500 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Platform</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Browse</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Trending</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Categories</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 ReelFinder. All cinematic rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">Letterboxd</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onMovieClick: (m: Movie) => void;
}

function Search({ searchTerm, setSearchTerm, onSearch }: { searchTerm: string; setSearchTerm: (s: string) => void; onSearch: (e: React.FormEvent) => void }) {
  return (
    <div className="relative w-full max-w-2xl mx-auto mt-8">
      <form onSubmit={onSearch} className="relative group">
        <input
          type="text"
          placeholder="Search through thousands of movies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-xl transition-all group-hover:bg-black/60 shadow-2xl"
        />
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
      </form>
    </div>
  );
}

const MovieRow: React.FC<MovieRowProps> = ({ title, movies, onMovieClick }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-4 relative group/row">
      <h3 className="text-xl font-bold tracking-tight text-gray-200">{title}</h3>
      
      <div className="relative">
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 p-2 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary text-white -ml-4"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x"
        >
          {movies.map((movie) => (
            <div key={movie.id} className="snap-start">
              <MovieCard movie={movie} onClick={() => onMovieClick(movie)} />
            </div>
          ))}
        </div>

        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/50 p-2 rounded-full opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary text-white -mr-4"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}

function MovieCard({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, zIndex: 20 }}
      onClick={onClick}
      className="relative w-40 md:w-56 aspect-[2/3] rounded-lg overflow-hidden cursor-pointer group shadow-2xl border border-white/5"
    >
      <img
        src={movie.posterUrl}
        alt={movie.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-background-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <h4 className="font-bold text-sm mb-1">{movie.title}</h4>
        <div className="flex items-center gap-2 text-[10px] text-gray-300">
          <span className="flex items-center gap-0.5 text-accent">
            <Star className="w-3 h-3 fill-current" /> {movie.rating}
          </span>
          <span>{movie.year}</span>
        </div>
      </div>
    </motion.div>
  );
}

function MovieDetail({ movie, onClose, watchlist, onToggleWatchlist, onPlayTrailer, onMovieClick }: { movie: Movie; onClose: () => void; watchlist: string[]; onToggleWatchlist: (id: string) => void; onPlayTrailer: (m: Movie) => void; onMovieClick: (m: Movie) => void }) {
  const [fullMovie, setFullMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const isInWatchlist = watchlist.includes(movie.id);

  useEffect(() => {
    const fetchDetails = async () => {
      const details = await MovieService.getMediaDetails(movie.id, movie.mediaType || 'movie');
      setFullMovie(details);
      setLoading(false);
    };
    fetchDetails();
  }, [movie.id, movie.mediaType]);

  const displayMovie = fullMovie || movie;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-background-dark/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-background-dark rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="grid md:grid-cols-5 h-full">
          <div className="md:col-span-3 relative h-64 md:h-auto">
            <img
              src={displayMovie.backdropUrl}
              alt={displayMovie.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">{displayMovie.title}</h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => onPlayTrailer(displayMovie)}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-md font-bold hover:bg-primary/80 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" /> Play
                </button>
                <button 
                  onClick={() => onToggleWatchlist(displayMovie.id)}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                    isInWatchlist ? "bg-primary border-primary text-white" : "border-white/50 text-white hover:border-white"
                  )}
                >
                  {isInWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 p-8 space-y-6 overflow-y-auto max-h-[60vh] md:max-h-[80vh]">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="text-accent font-bold">98% Match</span>
              <span className="text-gray-400">{displayMovie.year}</span>
              {displayMovie.duration && <span className="text-gray-400">{displayMovie.duration}</span>}
              <span className="border border-gray-500 px-1 text-[10px] rounded uppercase">HD</span>
            </div>

            <p className="text-gray-300 leading-relaxed">
              {displayMovie.overview}
            </p>

            {/* Where to Watch Section */}
            {(displayMovie.watchProviders?.flatrate?.length || displayMovie.watchProviders?.theaters) && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Where to Watch</h4>
                <div className="flex flex-wrap gap-4 items-center">
                  {displayMovie.watchProviders?.theaters && (
                    <div className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-bold border border-primary/30">
                      <Film className="w-4 h-4" /> In Theaters
                    </div>
                  )}
                  {displayMovie.watchProviders?.flatrate?.map((provider) => (
                    <div key={provider.providerName} className="group relative">
                      <img 
                        src={provider.logoPath} 
                        alt={provider.providerName} 
                        className="w-10 h-10 rounded-lg shadow-lg border border-white/10 hover:scale-110 transition-transform cursor-help"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {provider.providerName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500">Cast:</span>
                <span className="text-gray-300">{displayMovie.cast?.join(', ') || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500">{displayMovie.mediaType === 'tv' ? 'Created By:' : 'Director:'}</span>
                <span className="text-gray-300">{displayMovie.director || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500">Genres:</span>
                <span className="text-gray-300">{displayMovie.genres.join(', ')}</span>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div className="pt-6 border-t border-white/10">
              <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-200">
                <Film className="w-4 h-4" /> More Like This
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {displayMovie.similar && displayMovie.similar.length > 0 ? (
                  displayMovie.similar.map((similarMovie) => (
                    <motion.div
                      key={similarMovie.id}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => onMovieClick(similarMovie)}
                      className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group shadow-lg border border-white/5"
                    >
                      <img
                        src={similarMovie.posterUrl}
                        alt={similarMovie.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                        <p className="text-[10px] font-bold line-clamp-2">{similarMovie.title}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="aspect-[2/3] bg-white/5 rounded-md animate-pulse" />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TrailerModal({ trailerKey, onClose }: { trailerKey: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/80 transition-colors text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
          title="Movie Trailer"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </motion.div>
    </motion.div>
  );
}
