// Load environment variables BEFORE any other imports
// This file should be imported first in entry points (index.ts, deploy-commands.ts)
import * as dotenv from 'dotenv';

// Load .env.local if it exists, otherwise fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();
