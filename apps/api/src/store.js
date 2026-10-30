/** MongoDB adapter. app.js uses this interface; tests exercise it against real MongoDB.
 * Compose resolves `mongo`; Kubernetes resolves the Service `mongo` in this namespace.
 */
import { MongoClient } from "mongodb";

export async function connectStore(uri) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
  });
  try {
    await client.connect();
    const db = client.db("shipyard");
    const releases = db.collection("releases");
    // One event per identifier, and an index matching the newest-first timeline.
    await releases.createIndex({ id: 1 }, { unique: true });
    await releases.createIndex({ createdAt: -1, id: -1 });
    return {
      list: () =>
        releases
          .find({}, { projection: { _id: 0 } })
          .sort({ createdAt: -1, id: -1 })
          .limit(100)
          .toArray(),
      async insert(release) {
        await releases.insertOne({ ...release });
        return release;
      },
      async ping() {
        await db.command({ ping: 1 });
      },
      close: () => client.close(),
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}
