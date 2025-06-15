#!/usr/bin/env -S node --loader ts-node/esm --experimental-specifier-resolution=node

/**
 * scripts/migrate-json.ts
 *
 * Run with:
 *   node --loader ts-node/esm --experimental-specifier-resolution=node scripts/migrate-json.ts
 *
 * Ensure you have "ts-node" and "typescript" installed, and that
 * your package.json is set to "type": "module" for ESM support.
 *
 * This version handles arrays that contain primitive values (e.g. ["PugJS", "React"])
 * by wrapping each primitive in an object: { value: "PugJS" }. MongoDB then assigns
 * an _id as usual and avoids the "Cannot create property '_id' on string" error.
 */

// Tell TS that our "singletons" docs use a string _id
interface SingletonDoc {
  _id: string;
  [key: string]: any;
}

import fs from 'fs/promises';
import path from 'path';
import type { MongoClient } from 'mongodb';
import { connectToDatabase } from '../src/lib/mongodb';

// Connect using the shared helper so config validation is consistent
const clientPromise = connectToDatabase();
// Directories where JSON files live
const dataDirs = [
  path.join(process.cwd(), 'src', 'data'),
  path.join(process.cwd(), 'data'),
];

/**
 * Convert primitive array items (string | number | boolean) into objects so
 * MongoDB can insert them (and generate _id fields). Example:
 *   "PugJS"  → { value: "PugJS" }
 */
function normaliseArray(content: unknown[]): Record<string, unknown>[] {
  return content.map((item) =>
    typeof item === 'object' && item !== null && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : { value: item }
  );
}

async function migrate() {
  let client: MongoClient | null = null;
  try {
    client = await clientPromise;
    const dbName = process.env.MONGODB_DB || 'cv';
    const db = client.db(dbName);

    // Read every JSON file from the configured directories
    for (const dir of dataDirs) {
      let files: string[] = [];
      try {
        files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
      } catch {
        continue; // Skip missing directories
      }

      for (const file of files) {
        const filePath = path.join(dir, file);
        const name = path.parse(file).name; // e.g., "experience"
        const raw = await fs.readFile(filePath, 'utf-8');
        const content = JSON.parse(raw);

        if (Array.isArray(content)) {
          // Array JSON: insert into a collection named after the file
          const coll = db.collection(name);
          await coll.deleteMany({}); // Clear old data
          const docs = normaliseArray(content);
          if (docs.length) {
            await coll.insertMany(docs);
          }
          console.log(`→ Migrated array collection: ${name}`);
        } else {
          // Singleton JSON: upsert into a "singletons" collection
          const singletons = db.collection<SingletonDoc>('singletons');
          await singletons.updateOne(
            { _id: name },
            { $set: content },
            { upsert: true }
          );
          console.log(`→ Upserted singleton document: ${name}`);
        }
      }
    }

    console.log('✅ Migration complete');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

migrate();
