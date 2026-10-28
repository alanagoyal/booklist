# booklist

a curated collection of book recommendations from notable people. browse books and recommenders, discover related content through semantic search, and explore connections between books and the people who recommend them.

## what it does

booklist aggregates book recommendations from various sources and presents them in an interactive, searchable interface. key features include:

- **dual view modes**: browse by books or by recommenders (people)
- **smart search**: find books by title, author, genre, or semantic similarity
- **rich metadata**: see recommendation counts, percentile rankings, and background colors indicating popularity
- **related content**: discover books recommended by the same people or semantically similar books
- **detailed views**: click any book or recommender to see full details, recommendations, and connections

## how it works

the application is built with next.js and uses supabase as its database:

1. **data layer**: a supabase postgresql database stores books, people (recommenders), and their recommendations
   - uses vector embeddings for semantic similarity search
   - calculates percentile rankings based on recommendation counts

2. **data pipeline**: the `dump-data.ts` script runs before each build to:
   - fetch all books and recommenders from supabase
   - calculate recommendation percentiles and bucket rankings (0-5)
   - generate static json files in `public/data/` for fast client-side access
   - split book data into essential fields for browsing and extended fields for detail views

3. **frontend**: a react/next.js app that:
   - server-renders the first visible rows and sends the complete compact catalog for the selected view
   - loads the other catalog through `/booklist/api/catalog/[view]` only when switching views
   - fetches one full book or person through `/booklist/api/entities/[id]` when opening a detail panel
   - sorts and filters locally; url updates preserve sharing and browser history without refetching the page
   - keeps scrolling in a separate virtualized row component with memoized rows and fixed heights
   - uses swr's immutable cache for catalogs and details during the session

## important: base path configuration

this project is configured to be hosted at the `/booklist` path (e.g., `https://example.com/booklist`) rather than at the root. this is reflected in several places:

- `next.config.ts` has `basePath: "/booklist"`
- `config/site.ts` has `url: "https://basecase.vc/booklist"`
- `app/api/og/route.tsx` references `/booklist/fonts/...`
- catalog and detail endpoints live under `/booklist/api/...`
- the recommendation wizard still loads static files from `/booklist/data/...`

### if you want to host at the root path

to run this project at the root path instead (e.g., `https://example.com/`):

1. **remove the `basePath`** in `next.config.ts`:
   ```diff
   - basePath: "/booklist",
   ```

2. **update the site url** in `config/site.ts`:
   ```diff
   - url: "https://basecase.vc/booklist",
   + url: "https://your-domain.com",
   ```

3. **update the font path** in `app/api/og/route.tsx`:
   ```diff
   - new URL('/booklist/fonts/SpecialElite-Regular.ttf', process.env.NEXT_PUBLIC_VERCEL_URL)
   + new URL('/fonts/SpecialElite-Regular.ttf', process.env.NEXT_PUBLIC_VERCEL_URL)
   ```

4. **update client fetch paths** (remove the `/booklist` prefix from api and static-data urls):
   ```diff
   - "/booklist/data/books-essential.json"
   + "/data/books-essential.json"
   ```

## running locally

### prerequisites

- node.js 20 or higher
- npm or your preferred package manager
- a supabase project with the required schema

### setup

1. **clone the repository**
   ```bash
   git clone <your-repo-url>
   cd booklist
   ```

2. **install dependencies**
   ```bash
   npm install
   ```

3. **configure environment variables**

   create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_VERCEL_URL=https://your-domain.com
   ```

   **supabase credentials**: get these from your supabase project settings at `https://app.supabase.com/project/_/settings/api`

   **`OPENAI_API_KEY`**: required for semantic search functionality. the app uses openai's `text-embedding-ada-002` model to generate embeddings for similarity search. get your api key from [openai's platform](https://platform.openai.com/api-keys).

   **`NEXT_PUBLIC_VERCEL_URL`**: this is used for the og image generation endpoint. set it to your domain (e.g., `https://example.com` or `http://localhost:3000` for local development). when deploying to vercel, this is set automatically.

4. **set up the database**

   the required schema is in `supabase/migrations/20250605153046_initial.sql`. apply it to your supabase project:

   ```bash
   # If using Supabase CLI (recommended):
   supabase db push

   # Or manually run the migration file in the Supabase SQL editor
   ```

   the schema includes:
   - `books` table with vector embeddings for semantic search
   - `people` table for recommenders
   - `recommendations` table linking people to books
   - several rpc functions for efficient data fetching

5. **populate your database**

   add books, people, and recommendations to your supabase database. the application expects:
   - books with title, author, description, genre, and optional embeddings
   - people (recommenders) with full_name, type, url, and optional description
   - recommendations linking people to books with source information

6. **run the development server**
   ```bash
   npm run dev
   ```

   this will:
   - run the `dump-data` script to fetch data from supabase
   - generate static json files in `public/data/`
   - start the next.js development server

7. **open the app**

   navigate to [http://localhost:3000](http://localhost:3000) in your browser

### build for production

```bash
npm run build
npm start
```

the build process will regenerate all data files from supabase before creating the production bundle.

## project structure

- `/app` - next.js app router pages and layouts
- `/components` - react components (grids, detail views, ui elements)
- `/scripts` - data processing scripts (`dump-data.ts`)
- `/supabase` - database migrations and configuration
- `/utils` - utility functions and supabase clients
- `/public/data` - generated json files (git-ignored, created at build time)

## tech stack

- **framework**: next.js 15 with react 19
- **database**: supabase (postgresql with pgvector)
- **styling**: tailwind css
- **state management**: swr for data fetching
- **ui components**: radix ui primitives
- **virtualization**: @tanstack/react-virtual for performant large lists

## catalog regression tests

run `npx tsx --test utils/catalog.test.ts` to verify the compact catalogs retain all names, titles, recommendation counts, and descriptions used by the grid while excluding detail-only fields.

use `npx next build` to build against existing generated snapshots without refreshing data from supabase. `npm run build` refreshes the snapshots first.

for browser regressions, run `npx playwright install chromium` once, start a production server with `npm run start`, and run `npm run test:browsing`. set `BASE_URL` to use another port, or `BROWSER_CHANNEL=chrome` to use an installed chrome instead. the suite checks server-rendered rows with javascript disabled, continuous-list coverage, detail navigation, filters, sorting, history, mobile sizing, lazy catalogs, and failed-load retries.
