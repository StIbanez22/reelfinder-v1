<div align="center">
<img width="1200" height="475" alt="ReelFinder Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# ReelFinder

**A high-performance movie discovery platform built with React and Vite.**
</div>

---

## 🚀 Overview
ReelFinder is a modern web application designed for movie enthusiasts. It leverages the **TMDB API** to provide real-time movie data and **Firebase** for secure user authentication and personalized data persistence.

### Key Features
* **Real-time Search:** Instant access to thousands of movies and TV shows via TMDB.
* **User Authentication:** Secure login/signup powered by Firebase Auth.
* **Personalized Lists:** Save your favorites and manage your watchlist with Firestore.
* **Performance First:** Built with Vite for lightning-fast HMR and optimized builds.
* **Responsive UI:** Fully optimized for all screen sizes with a cinematic dark mode.

## 🛠 Tech Stack
* **Frontend:** React, Vite
* **Styling:** CSS3 / Tailwind (ändra om du använder annat)
* **Backend/Database:** Firebase (Auth & Firestore)
* **API:** TMDB (The Movie Database)
* **Deployment:** Netlify

## ⚙️ Setup & Local Development

**Prerequisites:** Node.js (v18+)

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/DITT_ANVÄNDARNAMN/reelfinder.git](https://github.com/DITT_ANVÄNDARNAMN/reelfinder.git)
    cd reelfinder
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root and add your API keys:
    ```env
    VITE_TMDB_API_KEY=your_tmdb_key
    VITE_FIREBASE_API_KEY=your_firebase_key
    # Add other Firebase config variables here
    ```

4.  **Run the app:**
    ```bash
    npm run dev
    ```

## ⚖️ License & Attribution
This product uses the TMDB API but is not endorsed or certified by TMDB.  
© 2026 ReelFinder. All cinematic rights reserved.
