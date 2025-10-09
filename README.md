# Booklist

A curated collection of book recommendations from notable people. Browse books and recommenders, discover related content through semantic search, and explore connections between books and the people who recommend them.

## What It Does

Booklist aggregates book recommendations from various sources and presents them in an interactive, searchable interface. Key features include:

- **Dual View Modes**: Browse by books or by recommenders (people)
- **Smart Search**: Find books by title, author, genre, or semantic similarity
- **Rich Metadata**: See recommendation counts, percentile rankings, and background colors indicating popularity
- **Related Content**: Discover books recommended by the same people or semantically similar books
- **Detailed Views**: Click any book or recommender to see full details, recommendations, and connections

## How It Works

The application is built with Next.js and uses Supabase as its database:

1. **Data Layer**: A Supabase PostgreSQL database stores books, people (recommenders), and their recommendations
   - Uses vector embeddings for semantic similarity search
   - Calculates percentile rankings based on recommendation counts

2. **Data Pipeline**: The `dump-data.ts` script runs before each build to:
   - Fetch all books and recommenders from Supabase
   - Calculate recommendation percentiles and bucket rankings (0-5)
   - Generate static JSON files in `public/data/` for fast client-side access
   - Split data into essential/extended and initial/full files for progressive loading

3. **Frontend**: A React/Next.js app that:
   - Loads initial data (first 50 items) immediately for fast page load
   - Progressively loads remaining data in the background
   - Uses SWR for efficient client-side data fetching
   - Renders books and recommenders in a virtualized grid for performance

## Running Locally

### Prerequisites

- Node.js 20 or higher
- npm or your preferred package manager
- A Supabase project with the required schema

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd booklist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

   Get these values from your Supabase project settings at `https://app.supabase.com/project/_/settings/api`

4. **Set up the database**

   The required schema is in `supabase/migrations/20250605153046_initial.sql`. Apply it to your Supabase project:

   ```bash
   # If using Supabase CLI (recommended):
   supabase db push

   # Or manually run the migration file in the Supabase SQL editor
   ```

   The schema includes:
   - `books` table with vector embeddings for semantic search
   - `people` table for recommenders
   - `recommendations` table linking people to books
   - Several RPC functions for efficient data fetching

5. **Populate your database**

   Add books, people, and recommendations to your Supabase database. The application expects:
   - Books with title, author, description, genre, and optional embeddings
   - People (recommenders) with full_name, type, url, and optional description
   - Recommendations linking people to books with source information

6. **Run the development server**
   ```bash
   npm run dev
   ```

   This will:
   - Run the `dump-data` script to fetch data from Supabase
   - Generate static JSON files in `public/data/`
   - Start the Next.js development server

7. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

The build process will regenerate all data files from Supabase before creating the production bundle.

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - React components (grids, detail views, UI elements)
- `/scripts` - Data processing scripts (`dump-data.ts`)
- `/supabase` - Database migrations and configuration
- `/utils` - Utility functions and Supabase clients
- `/public/data` - Generated JSON files (git-ignored, created at build time)

## Tech Stack

- **Framework**: Next.js 15 with React 19
- **Database**: Supabase (PostgreSQL with pgvector)
- **Styling**: Tailwind CSS
- **State Management**: SWR for data fetching
- **UI Components**: Radix UI primitives
- **Virtualization**: @tanstack/react-virtual for performant large lists
