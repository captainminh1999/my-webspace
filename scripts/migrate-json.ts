#!/usr/bin/env ts-node-esm

/**
 * scripts/migrate-json.ts
 *
 * Run with:
 *   npx ts-node-esm scripts/migrate-json.ts
 *
 * Ensure you have "ts-node" and "typescript" installed, and that
 * your package.json is set to "type": "module" for ESM support.
 */

// Tell TS that our "singletons" docs use a string _id
interface SingletonDoc {
  _id: string;
  [key: string]: any;
}

import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';

// Pull the MongoDB URI from environment variables
const uri = process.env.MONGODB_URI!
const client = new MongoClient(uri);
// Directory where your JSON files live
const dataDir = path.join(process.cwd(), 'src', 'data');

async function migrate() {
  try {
    await client.connect();
    const db = client.db('cv');

    // Read every file in src/data/
    const files = await fs.readdir(dataDir);
    for (const file of files) {
      const name = path.parse(file).name;      // e.g., "experience"
      const raw = await fs.readFile(path.join(dataDir, file), 'utf-8');
      const content = JSON.parse(raw);

      if (Array.isArray(content)) {
        // Array JSON: insert into a collection named after the file
        const coll = db.collection(name);
        await coll.deleteMany({});             // Clear old data
        await coll.insertMany(content);
        console.log(`→ Migrated array collection: ${name}`);
      } else {
        // Singleton JSON: upsert into a "singletons" collection
        const singletons = db.collection<SingletonDoc>('singletons');
        await singletons.updateOne(
          { _id: name },                        // Typed as string
          { $set: content },
          { upsert: true }
        );
        console.log(`→ Upserted singleton document: ${name}`);
      }
    }

    console.log('✅ Migration complete');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
