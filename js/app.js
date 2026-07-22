
// ==========================================
// MOVIE MOOD MATCHER - MAIN APPLICATION
// ==========================================

// Wait for DOM to be fully loaded before initializing the app
document.addEventListener('DOMContentLoaded', function() {
  initApp();
});

// ==========================================
// GLOBAL VARIABLES & CONFIGURATION
// ==========================================

// Data storage arrays for different movie categories
let nowPlayingMovies = [];      // Movies currently in theaters
let trendingMovies = [];        // Weekly trending movies
let searchMoviesList = [];      // Results from search or mood queries
let watchlist = [];             // User's saved movies from localStorage
let currentMood = null;         // Currently selected mood filter
let currentFilter = 'all';      // Current watchlist filter (all/watched/unwatched)
let isSearching = false;        // Flag to prevent duplicate search requests
let searchTimeout;              // Timer ID for search debouncing

// TMDB API Configuration
const API_KEY = '1601e91f3aa11e0a5430e5509c7541b9'; // My Own API key 
const BASE_URL = 'https://api.themoviedb.org/3';    // TMDB API base endpoint

// Display limits for performance
const MAX_TRENDS = 8;           // Maximum trending movies to show
const MAX_NOW_PLAYING = 8;      // Maximum now playing movies to show

// Mood to Genre ID mapping - Maps emotional states to TMDB genre IDs
// This enables mood-based movie discovery
const moodMap = {
  'chill': "16,18,10402",      // Animation, Drama, Music
  'sad': "18,10749",           // Drama, Romance
  'scared': "27,53",           // Horror, Thriller
  'funny': "35",               // Comedy
  'intense': "28,53,80",       // Action, Thriller, Crime
  'romantic': "10749"          // Romance
};

// ==========================================
// 1. INITIALIZATION FUNCTIONS
// ==========================================

/**
 * Main initialization function - called when DOM is ready
 * Sets up the application by loading data and configuring UI
 */
function initApp() {
  console.log('Initializing Movie Mood Matcher...');
  
  // Load user's saved watchlist from browser storage
  loadWatchlist();
  
  // Attach all interactive event listeners
  setupEventListeners();
  
  // Fetch initial movie data from TMDB API
  getNowPlaying();
  getTrending();
  
  // Update UI with loaded data
  updateWatchlistCount();  // Show number of saved movies
  renderWatchlist();       // Display watchlist movies
  updateWatchlistStats();  // Calculate and show statistics
}

/**
 * Sets up all event listeners for user interactions
 * This includes search, mood selection, navigation, and form handling
 */
function setupEventListeners() {
  const searchInput = document.querySelector('#txtSearch');
  
  // Mood selection buttons - users can filter movies by emotional state
  document.querySelectorAll('.mood-btn').forEach(button => {
    button.addEventListener('click', handleMoodSelect);
  });

  // Search functionality with debouncing
  if (searchInput) {
    // Search-as-you-type with debouncing to prevent excessive API calls
    searchInput.addEventListener('input', function(e) {
      clearTimeout(searchTimeout);  // Clear any pending search
      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= 2) { // Minimum 2 characters to avoid premature searches
          searchMovies();
        } else if (query.length === 0) {
          // Clear results if search box is emptied
          clearSearchResults();
        }
      }, 1500); // Wait 1500ms after user stops typing before searching
    });
    
    // Allow immediate search with Enter key
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);  // Cancel debounce timer
        searchMovies();               // Execute search immediately
      }
    });
  }

  // Watchlist management buttons
  const clearButton = document.querySelector('#clearWatchlist');
  if (clearButton) {
    clearButton.addEventListener('click', clearWatchlist);
  }

  // Watchlist filtering buttons (All/Watched/To Watch)
  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', handleWatchlistFilter);
  });

  // Mobile navigation toggle
  const hamburger = document.querySelector('#hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', toggleMenu);
  }

  // Close mobile menu when clicking navigation links
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Lightbox (modal) controls
  document.querySelector('.close-btn').addEventListener('click', hideLightbox);
  document.querySelector('#lightbox').addEventListener('click', function(e) {
    if (e.target === this) hideLightbox(); // Close if clicking overlay
  });

  // Contact form submission
  const contactForm = document.querySelector('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
  }

  // Close lightbox with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideLightbox();
  });
}

// ==========================================
// 2. TMDB API FUNCTIONS
// ==========================================

/**
 * Fetches movies currently playing in theaters from TMDB API
 * Displays them in the "Now Playing" section
 */
async function getNowPlaying() {
  try {
    showLoading('#now-playing-grid', 'Loading now playing movies...');
    const url = `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Convert API data to Movie objects and limit display count
    nowPlayingMovies = data.results.slice(0, MAX_NOW_PLAYING).map(json => Movie.fromJson(json));
    displayNowPlaying();
    
  } catch (error) {
    console.error('Error fetching now playing movies:', error);
    showError('#now-playing-grid', 'Failed to load now playing movies. Please try again.');
  }
}

/**
 * Fetches weekly trending movies from TMDB API
 * Displays them in the "Trending" section
 */
async function getTrending() {
  try {
    showLoading('#trending-grid', 'Loading trending movies...');
    const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Convert API data to Movie objects and limit display count
    trendingMovies = data.results.slice(0, MAX_TRENDS).map(json => Movie.fromJson(json));
    displayTrending();
    
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    showError('#trending-grid', 'Failed to load trending movies. Please try again.');
  }
}

/**
 * Discovers movies based on user's selected mood
 * Maps mood to genre IDs and queries TMDB discover endpoint
 * User's selected emotional state
 */
async function getMoviesByMood(mood) {
  if (!moodMap[mood]) {
    showNotification('Invalid mood selection!', 'error');
    return;
  }
  
  currentMood = mood; // Store current mood for later reference
  const genreIds = moodMap[mood];
  
  // Update UI: highlight selected mood button
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mood === mood) {
      btn.classList.add('active');
    }
  });
  
  showLoading('#results-grid', `Finding ${mood} movies...`);
  
  try {
    // TMDB discover endpoint with genre filtering
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreIds}&sort_by=popularity.desc&vote_count.gte=100&page=1&include_adult=false`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Create Movie objects with mood metadata
    searchMoviesList = data.results.map(json => Movie.fromJson(json, mood));
    displaySearchResults();
    showNotification(`Found ${data.results.length} ${mood} movies!`, 'success');
    
  } catch (error) {
    console.error(`Error fetching ${mood} movies:`, error);
    showError('#results-grid', `Failed to load ${mood} movies. Please try again.`);
  }
}

/**
 * Performs text-based search for movies using TMDB search endpoint
 * Includes debouncing to prevent excessive API calls
 */
async function searchMovies() {
  if (isSearching) return; // Prevent concurrent searches
  
  isSearching = true;
  const query = document.querySelector('#txtSearch').value.trim();
  
  if (!query) {
    clearSearchResults();
    isSearching = false;
    return;
  }
  
  // Clear mood selection when searching
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  showLoading('#results-grid', `Searching for "${query}"...`);
  
  try {
    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    searchMoviesList = data.results.map(json => Movie.fromJson(json));
    
    if (searchMoviesList.length === 0) {
      showEmptyState('#results-grid', `No movies found for "${query}"`);
      showNotification('No movies found for your search!', 'warning');
    } else {
      displaySearchResults();
      showNotification(`Found ${searchMoviesList.length} movies for "${query}"`, 'success');
    }
    
  } catch (error) {
    console.error('Error searching movies:', error);
    showError('#results-grid', 'Search failed. Please check your connection and try again.');
    
  } finally {
    isSearching = false; // Reset search flag
  }
}

// ==========================================
// 3. DISPLAY FUNCTIONS
// ==========================================

/**
 * Displays "Now Playing" movies in their grid container
 * Creates movie card elements for each movie
 */
function displayNowPlaying() {
  const container = document.querySelector('#now-playing-grid');
  if (!container) return;
  
  container.innerHTML = ''; // Clear existing content
  
  if (nowPlayingMovies.length === 0) {
    showEmptyState('#now-playing-grid', 'No movies currently playing in theaters.');
    return;
  }
  
  // Create and append movie cards for each movie
  nowPlayingMovies.slice(0, MAX_NOW_PLAYING).forEach(movie => {
    const movieElement = createMovieElement(movie, 'now-playing');
    container.appendChild(movieElement);
  });
}

/**
 * Displays trending movies in their grid container
 * Creates movie card elements for each movie
 */
function displayTrending() {
  const container = document.querySelector('#trending-grid');
  if (!container) return;
  
  container.innerHTML = ''; // Clear existing content
  
  if (trendingMovies.length === 0) {
    showEmptyState('#trending-grid', 'No trending movies available.');
    return;
  }
  
  // Create and append movie cards for each movie
  trendingMovies.slice(0, MAX_TRENDS).forEach(movie => {
    const movieElement = createMovieElement(movie, 'trending');
    container.appendChild(movieElement);
  });
}

/**
 * Displays search or mood-based results in the results grid
 * Creates movie card elements for each result
 */
function displaySearchResults() {
  const container = document.querySelector('#results-grid');
  if (!container) return;
  
  container.innerHTML = ''; // Clear existing content
  
  if (searchMoviesList.length === 0) {
    showEmptyState('#results-grid', 'No movies found. Try a different search or mood.');
    return;
  }
  
  // Create and append movie cards for each result
  searchMoviesList.forEach(movie => {
    const movieElement = createMovieElement(movie, 'search');
    container.appendChild(movieElement);
  });
}

/**
 * Creates a movie card HTML element with interactive functionality
 * Uses ES6 template literals for clean, dynamic HTML generation
 */
function createMovieElement(movie, source) {
  const isInWatchlist = watchlist.some(item => item.id === movie.id);
  const vote = typeof movie.voteAverage === 'number' ? movie.voteAverage.toFixed(1) : 'N/A';
  
  const movieElement = document.createElement('div');
  movieElement.className = 'movie-card';
  movieElement.dataset.id = movie.id;
  movieElement.setAttribute('tabindex', '0');   // Make focusable for accessibility
  movieElement.setAttribute('role', 'button');  // ARIA role for screen readers

  // ==========================================
  // DYNAMIC HTML GENERATION WITH TEMPLATE LITERALS
  // ==========================================
  // Using ES6 template literals (backticks ``) for HTML generation
  // Benefits over string concatenation:
  // - Cleaner syntax with embedded expressions ${variable}
  // - Multi-line strings without escape characters
  // - Readable conditional rendering with ternary operators
  // - Maintains HTML structure and indentation
  // ==========================================
  
  movieElement.innerHTML = `
    <img src="${movie.getPosterUrl('w342')}" 
         alt="${movie.title}" 
         class="poster"
         onerror="this.onerror=null; this.src='assets/images/no_image_poster.png'">
    <div class="movie-info">
      <h3 class="movie-title">${movie.title}</h3>
      <p class="movie-year">${movie.releaseYear}</p>
      <div class="movie-rating">
        <span>${movie.ratingStars}</span>
        <span>(${vote})</span>
      </div>
    </div>
    <div class="watchlist-actions">
      <button class="add-watchlist-btn ${isInWatchlist ? 'added' : ''}" 
              data-movie-id="${movie.id}"
              ${isInWatchlist ? 'disabled' : ''}>
        ${isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
      </button>
    </div>
  `;

  // Click event for viewing movie details (excluding watchlist button)
  movieElement.addEventListener('click', (e) => {
    if (e.target.closest('.add-watchlist-btn')) return; // Don't trigger on button clicks
    showMovieDetails(movie.id, source);
  });

  // Keyboard navigation for accessibility
  movieElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showMovieDetails(movie.id, source);
    }
  });

  // Watchlist button click handler
  const addButton = movieElement.querySelector('.add-watchlist-btn');
  addButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering parent click event
    saveMovie(movie.id, source);
  });
  
  return movieElement;
}

// ==========================================
// 4. LIGHTBOX / MOVIE DETAILS FUNCTIONS
// ==========================================

/**
 * Displays detailed movie information in a modal lightbox
 * @param {number} movieId - TMDB movie ID
 * @param {string} source - Source category for finding the movie
 */
async function showMovieDetails(movieId, source) {
  let movie;
  
  // Find movie in appropriate data source
  switch(source) {
    case 'now-playing': movie = nowPlayingMovies.find(m => m.id === movieId); break;
    case 'trending': movie = trendingMovies.find(m => m.id === movieId); break;
    case 'search': movie = searchMoviesList.find(m => m.id === movieId); break;
    default:
      // Fallback search across all data sources
      movie = watchlist.find(m => m.id === movieId) || 
              nowPlayingMovies.find(m => m.id === movieId) || 
              searchMoviesList.find(m => m.id === movieId);
  }
  
  if (!movie) {
    showNotification('Movie not found!', 'error');
    return;
  }
  
  const isInWatchlist = watchlist.some(item => item.id === movie.id);
  const lightboxDetails = document.querySelector('#lightbox-details');
  
  // Generate and display modal content
  lightboxDetails.innerHTML = createLightboxContent(movie, isInWatchlist, null);
  
  // Add save functionality to modal button
  const saveButton = lightboxDetails.querySelector('.btn-save');
  if (saveButton) {
    saveButton.addEventListener('click', () => saveMovie(movieId, source));
  }
  
  // Fetch and update trailer information
  fetchTrailerAndUpdate(movieId);
  
  // Show the modal
  document.querySelector('#lightbox').classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Generates HTML content for the movie details lightbox
 * Uses template literals for clean, conditional HTML generation
 * @param {Movie} movie - Movie object to display
 * @param {boolean} isInWatchlist - Whether movie is in user's watchlist
 * @param {string|null} trailerKey - YouTube trailer key if available
 * @returns {string} HTML string for lightbox content
 */
function createLightboxContent(movie, isInWatchlist, trailerKey) {
  // Fallback YouTube search URL if no trailer key available
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer')}`;
  
  // Conditional trailer button - show embedded player or search link
  const trailerAction = trailerKey 
    ? `<button class="modal-btn btn-trailer" onclick="playTrailer('${trailerKey}')"><i class="fab fa-youtube"></i> Watch Trailer</button>`
    : `<a href="${searchUrl}" target="_blank" class="modal-btn btn-trailer" id="trailer-btn-container">
         <i class="fab fa-youtube"></i> Search Trailer
       </a>`;
  
  const vote = typeof movie.voteAverage === 'number' ? movie.voteAverage.toFixed(1) : 'N/A';
  
  // Return HTML template with embedded movie data
  return `
    <div class="modal-poster-container" id="media-container">
      <img src="${movie.getPosterUrl('original')}" alt="${movie.title}" class="modal-poster">
    </div>
    <div class="modal-info-container">
      <h2 class="modal-title">${movie.title}</h2>
      <p class="modal-meta">Released: ${movie.releaseYear}</p>
      <div class="modal-rating">
        <span>⭐ ${vote}/10</span>
      </div>
      <div class="modal-overview">
        <h3>Overview</h3>
        <p>${movie.overview || 'No overview available.'}</p>
      </div>
      <div class="modal-actions">
        <button class="modal-btn btn-save ${isInWatchlist ? 'added' : ''}" ${isInWatchlist ? 'disabled' : ''}>
          ${isInWatchlist ? '✓ In Watchlist' : '➕ Add to Watchlist'}
        </button>
        ${trailerAction}
      </div>
    </div>
  `;
}

/**
 * Fetches trailer information from TMDB and updates the modal
 * @param {number} movieId - TMDB movie ID to fetch trailers for
 */
async function fetchTrailerAndUpdate(movieId) {
  try {
    const videoUrl = `${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`;
    const response = await fetch(videoUrl);
    const data = await response.json();
    
    let trailerKey = null;
    if (data.results && data.results.length > 0) {
      // Filter for YouTube videos and find the best trailer
      const youtubeVideos = data.results.filter(v => v.site === "YouTube");
      const bestVideo = youtubeVideos.find(v => v.type === "Trailer") || 
                        youtubeVideos.find(v => v.type === "Teaser") || 
                        youtubeVideos.find(v => v.type === "Clip");
      
      if (bestVideo) trailerKey = bestVideo.key;
    }
    
    // Update modal button if trailer found
    if (trailerKey) {
      const btnContainer = document.querySelector('#trailer-btn-container');
      if (btnContainer) {
        const newBtn = document.createElement('button');
        newBtn.className = 'modal-btn btn-trailer';
        newBtn.innerHTML = '<i class="fab fa-youtube"></i> Watch Trailer';
        newBtn.onclick = () => playTrailer(trailerKey);
        btnContainer.replaceWith(newBtn);
      }
    }
    
  } catch (error) {
    console.error('Error fetching trailer:', error);
    // Fail silently - user can still use search link
  }
}

/**
 * Replaces movie poster with embedded YouTube trailer player
 * @param {string} trailerKey - YouTube video ID
 */
function playTrailer(trailerKey) {
  const mediaContainer = document.querySelector('#media-container');
  if (!mediaContainer) return;
  
  const origin = window.location.origin;
  mediaContainer.innerHTML = `
    <iframe class="video-frame" 
      src="https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&origin=${origin}&rel=0" 
      title="YouTube video player"
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>`;
  mediaContainer.className = 'video-container';
}

/**
 * Closes the movie details lightbox and cleans up
 */
function hideLightbox() {
  document.querySelector('#lightbox').classList.remove('active');
  document.body.style.overflow = 'auto'; // Restore scrolling
  document.querySelector('#lightbox-details').innerHTML = ''; // Clear content
}

// ==========================================
// 5. LOCAL STORAGE & WATCHLIST MANAGEMENT
// ==========================================

/**
 * Loads user's watchlist from browser's localStorage
 * Converts stored JSON back into Movie objects
 */
function loadWatchlist() {
  const savedData = localStorage.getItem('movieMoodWatchlist');
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      // Use Movie class factory method to restore full functionality
      watchlist = parsed.map(json => Movie.fromLocalStorage(json));
    } catch (error) {
      watchlist = []; // Reset on corrupted data
    }
  } else {
    watchlist = []; // Initialize empty watchlist
  }
}

/**
 * Saves current watchlist to browser's localStorage
 * Converts Movie objects to plain JSON for storage
 */
function saveWatchlist() {
  try {
    const data = watchlist.map(movie => movie.toLocalStorage());
    localStorage.setItem('movieMoodWatchlist', JSON.stringify(data));
  } catch (error) {
    showNotification('Failed to save watchlist!', 'error');
  }
}

/**
 * Updates "Add to Watchlist" button states across the entire UI
 * Ensures consistent visual feedback when movies are added/removed
 * @param {number} movieId - TMDB movie ID
 * @param {boolean} isAdded - Whether movie is in watchlist
 * @param {boolean} isNewAddition - Whether this was just added (for animation)
 */
function updateGlobalUIState(movieId, isAdded, isNewAddition = false) {
  // Update all buttons for this movie (may appear in multiple sections)
  const buttons = document.querySelectorAll(`.add-watchlist-btn[data-movie-id="${movieId}"]`);
  buttons.forEach(btn => {
    if (isAdded) {
      btn.textContent = '✓ In Watchlist';
      btn.classList.add('added');
      btn.disabled = true;
      
      // Visual feedback for new additions
      if (isNewAddition) {
        btn.classList.add('newly-added');
        setTimeout(() => btn.classList.remove('newly-added'), 800);
      }
    } else {
      btn.innerHTML = '+ Add to Watchlist';
      btn.classList.remove('added', 'newly-added');
      btn.disabled = false;
    }
  });

  // Also update button in lightbox if open
  const lightboxBtn = document.querySelector('.modal-btn.btn-save');
  if (lightboxBtn) {
    if (isAdded) {
      lightboxBtn.textContent = '✓ In Watchlist';
      lightboxBtn.classList.add('added');
      lightboxBtn.disabled = true;
      
      if (isNewAddition) {
        lightboxBtn.classList.add('newly-added');
        setTimeout(() => lightboxBtn.classList.remove('newly-added'), 800);
      }
    } else {
      lightboxBtn.innerHTML = '➕ Add to Watchlist';
      lightboxBtn.classList.remove('added', 'newly-added');
      lightboxBtn.disabled = false;
    }
  }
}

/**
 * Adds a movie to the user's watchlist
 * Includes validation and UI updates
 * movieId - TMDB movie ID to save
 * source - Source category for finding the movie
 */
function saveMovie(movieId, source) {
  let movie;
  
  // Find movie in appropriate data source
  switch(source) {
    case 'now-playing': movie = nowPlayingMovies.find(m => m.id === movieId); break;
    case 'trending': movie = trendingMovies.find(m => m.id === movieId); break;
    case 'search': movie = searchMoviesList.find(m => m.id === movieId); break;
    default:
      // Fallback search
      movie = trendingMovies.find(m => m.id === movieId) ||
              nowPlayingMovies.find(m => m.id === movieId) || 
              searchMoviesList.find(m => m.id === movieId);
  }
  
  if (!movie) {
    showNotification('Movie not found!', 'error');
    return;
  }
  
  // Prevent duplicates
  if (watchlist.some(item => item.id === movieId)) {
    showNotification('Already in watchlist!', 'info');
    return;
  }
  
  // Ensure we have a proper Movie object
  const movieToSave = movie instanceof Movie ? movie : Movie.fromJson(movie);
  
  // Store mood metadata if available
  if (currentMood) movieToSave.mood = currentMood;
  
  // Add to watchlist and persist
  watchlist.push(movieToSave);
  saveWatchlist();
  
  // Update UI
  updateGlobalUIState(movieId, true, true);
  updateWatchlistCount();
  renderWatchlist();
  updateWatchlistStats();
  
  showNotification(`"${movie.title}" added to watchlist!`, 'success');
}

/**
 * Removes a movie from the user's watchlist
 * movieId - TMDB movie ID to remove
 */
function removeFromWatchlist(movieId) {
  const movieIndex = watchlist.findIndex(m => m.id === movieId);
  if (movieIndex === -1) return;
  
  const movie = watchlist[movieIndex];
  watchlist.splice(movieIndex, 1);
  
  // Persist changes and update UI
  saveWatchlist();
  updateGlobalUIState(movieId, false);
  updateWatchlistCount();
  renderWatchlist();
  updateWatchlistStats();
  
  showNotification(`"${movie.title}" removed from watchlist`, 'success');
}

/**
 * Toggles the watched status of a movie in the watchlist
 * Updates timestamps and UI accordingly
 * movieId - TMDB movie ID to toggle
 */
function toggleWatchedStatus(movieId) {
  const movie = watchlist.find(m => m.id === movieId);
  if (!movie) return;
  
  movie.toggleWatched(); // Toggle status and update timestamp
  saveWatchlist();
  renderWatchlist();
  updateWatchlistStats();
  
  const status = movie.watched ? 'watched' : 'unwatched';
  showNotification(`Marked "${movie.title}" as ${status}`, 'info');
}

/**
 * Clears all movies from the watchlist after user confirmation
 * Uses browser's native confirm dialog for simplicity
 */
function clearWatchlist() {
  if (watchlist.length === 0) {
    showNotification('Watchlist is already empty!', 'info');
    return;
  }
  
  // Request user confirmation before clearing
  if (confirm(`Clear all ${watchlist.length} movies from your watchlist?`)) {
    // Update UI for all movies being removed
    watchlist.forEach(movie => updateGlobalUIState(movie.id, false));
    
    // Clear data
    watchlist = [];
    saveWatchlist();
    
    // Update UI
    updateWatchlistCount();
    renderWatchlist();
    updateWatchlistStats();
    
    showNotification('Watchlist cleared!', 'success');
  }
}

// ==========================================
// 6. WATCHLIST UI FUNCTIONS
// ==========================================

/**
 * Updates the watchlist counter in the UI header
 * Shows number of movies in parentheses: My Watchlist (x)
 */
function updateWatchlistCount() {
  const countElement = document.querySelector('#watchlist-count');
  if (countElement) countElement.textContent = `(${watchlist.length})`;
}

/**
 * Renders the watchlist with current filtering applied
 * Shows different empty states based on filter selection
 * filter - Current filter: 'all', 'watched', or 'unwatched'
 */
function renderWatchlist(filter = currentFilter) {
  const container = document.querySelector('#watchlist-grid');
  if (!container) return;
  
  container.innerHTML = ''; // Clear existing content
  
  // Apply filter to watchlist
  let filteredMovies = watchlist;
  if (filter === 'watched') filteredMovies = watchlist.filter(movie => movie.watched);
  if (filter === 'unwatched') filteredMovies = watchlist.filter(movie => !movie.watched);
  
  // Handle empty states
  if (filteredMovies.length === 0) {
    let message = 'Your watchlist is empty. Add some movies!';
    if (filter === 'watched') message = 'No watched movies yet.';
    if (filter === 'unwatched') message = 'No movies to watch.';
    
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bookmark"></i>
        <p>${message}</p>
        <button class="empty-state-btn" onclick="document.querySelector('#moods').scrollIntoView({behavior: 'smooth'})">
          <i class="fas fa-film"></i> Discover Movies
        </button>
      </div>
    `;
    return;
  }
  
  // Create and append watchlist items
  filteredMovies.forEach(movie => {
    container.appendChild(createWatchlistItem(movie));
  });
}

/**
 * Creates a specialized movie card for the watchlist view
 * Includes watched status badge and management buttons
 * movie - Movie object to display
 * Watchlist movie card element
 */
function createWatchlistItem(movie) {
  const isWatched = movie.watched;
  const vote = typeof movie.voteAverage === 'number' ? movie.voteAverage.toFixed(1) : 'N/A';
  
  const movieElement = document.createElement('div');
  movieElement.className = 'movie-card watchlist-item';
  movieElement.dataset.id = movie.id;
  
  // Generate HTML with watched status badge and management buttons
  movieElement.innerHTML = `
    <img src="${movie.getPosterUrl('w342')}" 
         alt="${movie.title}" 
         class="poster" 
         tabindex="0" role="button" aria-label="View details for ${movie.title}"
         onerror="this.onerror=null; this.src='https://via.placeholder.com/342x513/1A1A2E/00ADB5?text=No+Poster'">
    ${isWatched ? `<div class="watched-badge"><i class="fas fa-check"></i> Watched</div>` : ''}
    <div class="movie-info">
      <h3 class="movie-title">${movie.title}</h3>
      <p class="movie-year">${movie.releaseYear} • ${movie.mood || 'No mood'}</p>
      <div class="movie-rating">
        <span>${movie.ratingStars}</span>
        <span>(${vote})</span>
      </div>
    </div>
    <div class="watchlist-actions">
      <button class="watchlist-btn toggle-watched-btn">
        <i class="fas fa-${isWatched ? 'eye-slash' : 'eye'}"></i>
        ${isWatched ? 'Unwatch' : 'Mark Watched'}
      </button>
      <button class="watchlist-btn remove-btn">
        <i class="fas fa-trash"></i> Remove
      </button>
    </div>
  `;
  
  // Add event listeners for watchlist-specific actions
  const poster = movieElement.querySelector('.poster');
  poster.addEventListener('click', () => showMovieDetails(movie.id, 'watchlist'));
  poster.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showMovieDetails(movie.id, 'watchlist');
    }
  });
  
  movieElement.querySelector('.toggle-watched-btn').addEventListener('click', () => toggleWatchedStatus(movie.id));
  movieElement.querySelector('.remove-btn').addEventListener('click', () => removeFromWatchlist(movie.id));
  
  return movieElement;
}

/**
 * Calculates and displays watchlist statistics
 * Shows total count, watched/unwatched breakdown, and top mood
 */
function updateWatchlistStats() {
  const container = document.querySelector('#watchlist-stats');
  if (!container) return;
  
  const total = watchlist.length;
  const watched = watchlist.filter(m => m.watched).length;
  const unwatched = total - watched;
  
  // Count movies by mood
  const moodCounts = {};
  watchlist.forEach(movie => {
    const mood = movie.mood || 'unknown';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  });
  
  // Find most common mood
  let topMood = 'None';
  let maxCount = 0;
  Object.entries(moodCounts).forEach(([mood, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topMood = mood.charAt(0).toUpperCase() + mood.slice(1);
    }
  });
  
  // Update statistics display
  container.innerHTML = `
    <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total Movies</div></div>
    <div class="stat-card"><div class="stat-value">${watched}</div><div class="stat-label">Watched</div></div>
    <div class="stat-card"><div class="stat-value">${unwatched}</div><div class="stat-label">To Watch</div></div>
    <div class="stat-card"><div class="stat-value">${topMood}</div><div class="stat-label">Top Mood</div></div>
  `;
}

// ==========================================
// 7. EVENT HANDLERS & UTILITY FUNCTIONS
// ==========================================

/**
 * Handles mood button selection events
 * event - Click event from mood button
 */
function handleMoodSelect(event) {
  const mood = event.currentTarget.dataset.mood;
  getMoviesByMood(mood);
}

/**
 * Handles watchlist filter button selection
 * event - Click event from filter button
 */
function handleWatchlistFilter(event) {
  const filter = event.target.dataset.filter;
  
  // Update active state of filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Apply filter and re-render
  currentFilter = filter;
  renderWatchlist(filter);
}

/**
 * Handles contact form submission
 * Shows success notification and resets form
 * event - Form submit event
 */
function handleContactForm(event) {
  event.preventDefault(); // Prevent page reload
  showNotification('Message sent successfully!', 'success');
  event.target.reset(); // Clear form fields
}

/**
 * Toggles mobile navigation menu visibility
 */
function toggleMenu() {
  const nav = document.querySelector('#siteNav');
  const hamburger = document.querySelector('#hamburger');
  nav.classList.toggle('active');
  hamburger.classList.toggle('active'); 
}

/**
 * Closes mobile navigation menu
 */
function closeNav() {
  document.querySelector('#siteNav').classList.remove('active');
  document.querySelector('#hamburger').classList.remove('active');
}

/**
 * Shows skeleton loading cards while data is being fetched
 * Creates 20 grey boxes as placeholder content
 * selector - CSS selector for target container
 * message - Loading message for console
 */
function showLoading(selector, message) {
  const container = document.querySelector(selector);
  if (container) {
    container.innerHTML = ''; // Clear existing content
    
    // Create 20 skeleton boxes as loading placeholders
    for(let i = 0; i < 20; i++) { 
       const skeleton = document.createElement('div');
       skeleton.className = 'movie-card skeleton-box'; 
       container.appendChild(skeleton);
    }
    
    console.log(`Fetching data: ${message}`);
  }
}

/**
 * Displays error state in a container
 * selector - CSS selector for target container
 * message - Error message to display
 */
function showError(selector, message) {
  const container = document.querySelector(selector);
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }
}

/**
 * Displays empty state in a container
 * selector - CSS selector for target container
 * message - Empty state message to display
 */
function showEmptyState(selector, message) {
  const container = document.querySelector(selector);
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-film"></i>
        <p>${message}</p>
      </div>
    `;
  }
}

/**
 * Displays temporary toast notification
 * message - Notification message
 * type - Notification type: 'success', 'error', 'warning', or 'info'
 */
function showNotification(message, type = 'info') {
  const container = document.querySelector('#notification-container');
  if (!container) return;
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `<i class="fas fa-${getNotificationIcon(type)}"></i><span>${message}</span>`;
  
  // Add to container and set up auto-removal
  container.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease'; // Slide out animation
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 300);
  }, 3000); // Remove after 3 seconds
}

/**
 * Returns appropriate FontAwesome icon name based on notification type
 */
function getNotificationIcon(type) {
  switch(type) {
    case 'success': return 'check-circle';
    case 'error': return 'exclamation-circle';
    case 'warning': return 'exclamation-triangle';
    default: return 'info-circle';
  }
}

// ==========================================
// 8. UTILITY FUNCTIONS
// ==========================================

/**
 * Clears search results and resets the results section
 * Called when search box is emptied or mood selection is cleared
 */
function clearSearchResults() {
  const container = document.querySelector('#results-grid');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-film"></i>
        <p>Select a mood or search for movies to see recommendations</p>
      </div>
    `;
  }
  
  // Reset search-related state
  searchMoviesList = [];
  currentMood = null;
  
  // Clear active state from mood buttons
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.remove('active');
  });
}