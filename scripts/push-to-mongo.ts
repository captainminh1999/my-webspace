#!/usr/bin/env -S node --loader ts-node/esm --experimental-specifier-resolution=node

/**
 * scripts/push-to-mongo.ts
 *
 * Generic utility to push JSON data into MongoDB.
 *
 * Usage examples:
 *   node scripts/push-to-mongo.ts --file data.json --singleton weather
 *   node scripts/push-to-mongo.ts --file list.json --collection games
 *   node scripts/push-to-mongo.ts --file payload.json --collection games --singleton latestGame
 */

import fs from 'fs/promises';
import type { MongoClient } from 'mongodb';
import { connectToDatabase } from '../src/lib/mongodb';

interface Options {
  file: string;
  collection?: string;
  singleton?: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let file: string | undefined;
  let collection: string | undefined;
  let singleton: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--file':
        file = args[++i];
        break;
      case '--collection':
        collection = args[++i];
        break;
      case '--singleton':
        singleton = args[++i];
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  if (!file) {
    console.error('Missing --file option');
    process.exit(1);
  }

  if (!collection && !singleton) {
    console.error('Specify --collection and/or --singleton');
    process.exit(1);
  }

  return { file, collection, singleton };
}

async function readJson(file: string): Promise<any> {
  const json = await fs.readFile(file, 'utf8');
  return JSON.parse(json);
}

async function run() {
  const opts = parseArgs();
  const data = await readJson(opts.file);
  const client: MongoClient = await connectToDatabase();
  const dbName = process.env.MONGODB_DB || 'cv';
  const db = client.db(dbName);

  try {
    if (opts.collection) {
      const coll = db.collection(opts.collection);
      await coll.deleteMany({});
      if (Array.isArray(data) && data.length) {
        await coll.insertMany(data);
      }
      console.log(`→ Wrote collection: ${opts.collection}`);
    }

    if (opts.singleton) {
      const singletons = db.collection<{ _id: string }>('singletons');
      await singletons.deleteOne({ _id: opts.singleton });
      await singletons.insertOne({ _id: opts.singleton, ...(typeof data === 'object' ? data : { value: data }) });
      console.log(`→ Wrote singleton: ${opts.singleton}`);
    }
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
