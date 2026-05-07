import { GridFSBucket, MongoClient, ObjectId } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

function getClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (local) or Vercel environment variables (production)."
    );
  }
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(uri);
    }
    return global._mongoClient;
  }
  return new MongoClient(uri);
}

export async function getDb() {
  const client = getClient();
  await client.connect();
  return client.db();
}

export async function getGridFSBucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "images" });
}

export async function getMetadataCollection() {
  const db = await getDb();
  return db.collection("metadata");
}

export { ObjectId };
