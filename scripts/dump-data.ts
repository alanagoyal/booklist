import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getBooks, getRecommenders } from '../lib/data-fetching';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function dumpData() {
  console.log('Fetching data from Supabase...');
  
  try {
    const [books, recommenders] = await Promise.all([
      getBooks(),
      getRecommenders()
    ]);

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Write books to JSON file
    fs.writeFileSync(
      path.join(dataDir, 'books.json'),
      JSON.stringify(books, null, 2)
    );
    console.log(`✓ Wrote ${books.length} books to data/books.json`);

    // Write recommenders to JSON file
    fs.writeFileSync(
      path.join(dataDir, 'recommenders.json'),
      JSON.stringify(recommenders, null, 2)
    );
    console.log(`✓ Wrote ${recommenders.length} recommenders to data/recommenders.json`);

  } catch (error) {
    console.error('Error dumping data:', error);
    process.exit(1);
  }
}

dumpData();
