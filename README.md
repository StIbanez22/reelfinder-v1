<div align="center">

# 🎬 ReelFinder

**A high-performance movie discovery platform built with React and Vite.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com/)

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
* **Styling:** Tailwind CSS
* **Backend/Database:** Firebase (Auth & Firestore)
* **API:** TMDB (The Movie Database)
* **Deployment:** Netlify

## ⚙️ Setup & Local Development

**Prerequisites:** Node.js (v18+)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/StIbanez22/reelfinder-v1.git
   cd reelfinder-v1
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root and add your API keys:
    ```env
    VITE_TMDB_API_KEY=your_tmdb_key
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run the app:**
    ```bash
    npm run dev
    ```

## ⚖️ License & Attribution
This product uses the TMDB API but is not endorsed or certified by TMDB.  
© 2026 ReelFinder. All cinematic rights reserved.
