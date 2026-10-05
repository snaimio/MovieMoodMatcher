<div align="center">

# 🎬 MovieMoodMatcher
### Mood-Based Movie Discovery Engine & TMDB REST API Client

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![API](https://img.shields.io/badge/REST%20API-TMDB%20v3-01D277?style=for-the-badge)](https://www.themoviedb.org/)
[![CSS3](https://img.shields.io/badge/CSS3-Grid%20%26%20Flexbox-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![License](https://img.shields.io/badge/License-MIT-CEFF00?style=for-the-badge&logoColor=black)](LICENSE)

<br/>

**An asynchronous web application that maps emotional mood states to cinema genres and provides debounced real-time search using The Movie Database (TMDB) RESTful API.**

</div>

<br/>

---

## 📌 Technical Overview
**MovieMoodMatcher** is an interactive movie discovery platform built with clean, modern vanilla JavaScript (ES6+). It translates user-selected moods (e.g., *Adventurous*, *Contemplative*, *Adrenaline-Packed*, *Feel-Good*) into multi-genre query algorithms, asynchronously fetching and rendering curated recommendations with modal viewports.

### 💼 Technical Highlights
- **Asynchronous Data Fetching**: Utilizes native `fetch()` and `async/await` pipelines with error handling and rate-limit mitigation.
- **Mood-to-Genre Algorithmic Mapping**: Translates subjective psychological moods into compound TMDB genre IDs and popularity sorting.
- **Live Search & Debouncing**: Implements input debouncing to prevent excessive API requests during keystroke entry.
- **Responsive Modal Architecture**: Dynamic modal rendering for detailed overviews, trailers, backdrop art, and user rating scores.

---

## 🛠️ Stack & Architecture
- **Frontend**: Vanilla JavaScript (ES6+ Class Architecture), Semantic HTML5, Modern CSS3 (CSS Custom Properties, Grid, Flexbox).
- **API**: The Movie Database (TMDB) RESTful API v3.
- **Architecture**: Modular OOP pattern separating UI Controllers, API Services, and Model Entities (`Movie.js`).

---

## 🚀 Setup & Run
1. Clone the repository:
   ```bash
   git clone https://github.com/snaimio/movie-mood-matcher.git
   cd movie-mood-matcher
   ```
2. Open `index.html` in your browser (or use VS Code Live Server).

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author
**Sheikh Naim**  
*Mobile & Full-Stack Web Developer*  
- **LinkedIn**: [linkedin.com/in/snaimio](https://www.linkedin.com/in/snaimio)  
- **GitHub**: [@snaimio](https://github.com/snaimio)  
- **Portfolio**: [snaimio.github.io](https://snaimio.github.io)
