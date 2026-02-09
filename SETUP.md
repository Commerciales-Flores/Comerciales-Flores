# Comerciales Flores - Setup Guide

This document explains how to set up the **Comerciales Flores** project locally for development.

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18+ recommended)  
   Download: https://nodejs.org/  

2. **npm** (comes with Node.js)  

3. **Git**  
   Download: https://github.com/averageCoder-byte/Comerciales-Flores.git

4. **Firebase CLI** (optional, for backend / deployment)  
	   ```bash
	   npm install -g firebase-tools
	   ```

## 1. Clone the Repository

From your terminal, navigate to the directory where you want the project and run:

```bash
git clone https://github.com/averageCoder-byte/Comerciales-Flores.git
cd Comerciales-Flores
```

## 2. Install Dependencies

Inside the project root: 
```bash
npm install
```

This installs all frontend dependencies listed in package.json

## 3. Entry point

The frontend entry point is at main.tsx
React will mount your entire app inside <div id="root"></div> from index.html.

## 5. Running the Development Server
Stil inside the project root
```bash
npm run dev
```

This uses Vite to serve your app locally.
Open your browser at http://localhost:5173 (default port).

## 6. Firebase Setup (Optional for Backend)
Install Firebase CLI globally
```bash
npm install -g firebase-tools
```

6.1. Log in and initialize Firebase (if not already done):

```bash
firebase login
firebase init
```


Follow prompts for Hosting, Firestore, and Authentication as needed.

6.2. Deploy to Firebase:

```bash
firebase deploy
```
