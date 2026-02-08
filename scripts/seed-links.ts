import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";
import { seedLinks } from "../src/data/links";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
dotenv.config();

const args = new Set(process.argv.slice(2));
const purge = args.has("--purge");

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_ADMIN_* env vars.");
  process.exit(1);
}

const databaseId = process.env.FIREBASE_ADMIN_DATABASE_ID || "ieadsm";

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

const db = getFirestore(app, databaseId);

const main = async () => {
  const batch = db.batch();
  seedLinks.forEach((item, index) => {
    const id = item.id ?? `link-${index + 1}`;
    const { id: _ignored, ...data } = item;
    batch.set(db.collection("links").doc(String(id)), data);
  });
  await batch.commit();
  console.log(`Links upserted (${seedLinks.length}).`);

  if (purge) {
    const keep = new Set(seedLinks.map((item, index) => String(item.id ?? `link-${index + 1}`)));
    const snap = await db.collection("links").get();
    const purgeBatch = db.batch();
    let removed = 0;
    snap.docs.forEach((doc) => {
      if (!keep.has(doc.id)) {
        purgeBatch.delete(doc.ref);
        removed += 1;
      }
    });
    if (removed) {
      await purgeBatch.commit();
    }
    console.log(`Extra links removed: ${removed}.`);
  }
};

main()
  .then(() => {
    console.log("Seed links completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
