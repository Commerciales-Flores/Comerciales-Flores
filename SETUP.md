# Commerciales Flores - Setup Guide

This document explains how to set up the **Commerciales Flores** project locally for development.

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18+ recommended)  
   Download: https://nodejs.org/  

2. **npm** (comes with Node.js)  

3. **Git**  
   Download: https://github.com/averageCoder-byte/Comerciales-Flores.git

4. **Supabase** (optional, for backend / deployment)  
	Create one at: https://supabase.com/

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

## 3. Environment Variables Setup
Create a .env file in the project root and add:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
You can find these values in your Supabase dashboard:

Project Settings → API

⚠️ Do not commit your .env file to GitHub.

## 4. Entry point

The frontend entry point is at main.tsx
React will mount your entire app inside <div id="root"></div> from index.html.

## 5. Running the Development Server
Still inside the project root
```bash
npm run dev
```

This uses Vite to serve your app locally.
Open your browser at http://localhost:5173 (default port).

## 6. Supabase Setup (Backend)

1. Create a new project in Supabase.
2. Set up your database tables via the SQL Editor or Table Editor.
3. Enable Authentication providers if needed (Email/Password, Google, etc.).
4. Copy your project URL and anon key into your .env file.

If using Supabase locally (optional advanced setup):

Install Supabase CLI:
```bash
npm install -g supabase
```

Log in and initialize Supabase (if not already done):

```bash
supabase init
supabase start
```

