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
    // The driver's defaults are 30 s to look for a server and 30 s to open a connection (DNS, TCP and
    // TLS as an idle timer, then the hello — none of it covered by the first; the SCRAM exchange after
    // the hello has no limit at all) — each longer than any Netlify function may run. A healthy
    // connection from the functions in us-east-1 to the cluster in Sydney takes about 1 s.
    clientPromise = new MongoClient(uri, { serverSelectionTimeoutMS: 8_000, connectTimeoutMS: 5_000 }).connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}
