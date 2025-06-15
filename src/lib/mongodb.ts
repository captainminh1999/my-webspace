import { MongoClient } from "mongodb";

let client: MongoClient | null = null;

export async function connectToDatabase(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (client) {
    return client;
  }

  client = new MongoClient(uri);
  await client.connect();
  return client;
}
