import mongoose from 'mongoose';
import connectDB from './src/config/db.js';

// Open the DB connection once before the very first test in this process.
// With --runInBand all test files share this process, so the connection
// stays alive for every suite.  --forceExit shuts the process down at the end.
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
}, 60000); // 60 s — enough for Atlas cold-start + SRV lookup
