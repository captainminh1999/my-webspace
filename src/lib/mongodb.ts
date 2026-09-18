import { MongoClient } from "mongodb";

// One client per warm process. The promise (not the client) is cached so
// concurrent first calls share a single connect() and a failed connect does
// not leave a half-initialised client behind for the rest of the process.
let clientPromise: Promise<MongoClient> | null = null;

export async function connectToDatabase(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}
