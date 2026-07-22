
// Movie Class
class Movie {
  constructor(id, title, overview, releaseDate, posterPath, voteAverage, backdropPath, genreIds, mood) {
    // Safety check for bad data
    if (!id || !title) {
      console.warn("Creating movie with missing data");
      id = id || 0;
      title = title || "Unknown Movie";
    }
    this.id = id;
    this.title = title;
    this.overview = overview;
    this.releaseDate = releaseDate;
    this.posterPath = posterPath;
    this.voteAverage = voteAverage;
    this.backdropPath = backdropPath || '';
    this.genreIds = genreIds || [];
    this.mood = mood || null;
    this.addedDate = new Date().toISOString();
    this.watched = false;
    this.watchedDate = null;
    this.userRating = null;
    this.notes = '';
  }

  // Static factory method to create Movie from TMDB API JSON
  static fromJson(json, mood = null) {
    return new Movie(
      json.id,
      json.title,
      json.overview,
      json.release_date,
      json.poster_path,
      // Ensures voteAverage is a number from API
      parseFloat(json.vote_average) || 0,
      json.backdrop_path,
      json.genre_ids,
      mood
    );
  }

  // Static factory method to create Movie from localStorage data
  static fromLocalStorage(json) {
    // safety check
    if (!json) return null;
    // ensures voteAverage is a number (it might be stored as string)
    const voteAverage = typeof json.voteAverage === 'number' 
      ? json.voteAverage 
      : parseFloat(json.voteAverage) || 0;
    const movie = new Movie(
      json.id,
      json.title,
      json.overview,
      json.releaseDate,
      json.posterPath,
      voteAverage, // now a number
      json.backdropPath,
      json.genreIds,
      json.mood
    );
    // restores additional properties
    movie.addedDate = json.addedDate || new Date().toISOString();
    movie.watched = json.watched || false;
    movie.watchedDate = json.watchedDate || null;
    movie.userRating = json.userRating || null;
    movie.notes = json.notes || '';
    return movie;
  }

  // converts to localStorage-friendly object
  toLocalStorage() {
    return {
      id: this.id,
      title: this.title,
      overview: this.overview,
      releaseDate: this.releaseDate,
      posterPath: this.posterPath,
      voteAverage: this.voteAverage, // should already be a number
      backdropPath: this.backdropPath,
      genreIds: this.genreIds,
      mood: this.mood,
      addedDate: this.addedDate,
      watched: this.watched,
      watchedDate: this.watchedDate,
      userRating: this.userRating,
      notes: this.notes
    };
  }

  get releaseYear() {
    if (!this.releaseDate) return 'N/A';
    return this.releaseDate.split('-')[0];
  }

  get ratingStars() {
    // SAFETY CHECK: Ensures voteAverage is a number
    if (typeof this.voteAverage !== 'number' || isNaN(this.voteAverage)) {
      return 'N/A';
    }
    const stars = Math.round(this.voteAverage / 2);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }

  // Toggle watched status
  toggleWatched() {
    this.watched = !this.watched;
    this.watchedDate = this.watched ? new Date().toISOString() : null;
    return this.watched;
  }

  // get poster URL with specific size
  getPosterUrl(size = 'w500') {
    // Check if posterPath exists and is valid
    if (!this.posterPath || this.posterPath === 'null' || this.posterPath === 'undefined') {
    return 'assets/images/no_image_poster.png'; 
    }
    // checking if it's already a full URL
    if (this.posterPath.startsWith('http')) {
      return this.posterPath;
    }
    // otherwise, construct TMDB URL
    return `https://image.tmdb.org/t/p/${size}${this.posterPath}`;
  }

  // method for backdrop images
  getBackdropUrl() {
    if (!this.backdropPath) {
      return this.getPosterUrl('w780'); // uses poster as fallback
    }
    return `https://image.tmdb.org/t/p/w1280${this.backdropPath}`;
  }
}