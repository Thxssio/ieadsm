import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
dotenv.config();

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const removeOld = args.has("--delete");

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

const fromCollection = "departaments";
const toCollection = "departments";

const hasDocs = async (pathName: string) => {
  const snap = await db.collection(pathName).limit(1).get();
  return !snap.empty;
};

const commitInChunks = async (
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  fn: (batch: FirebaseFirestore.WriteBatch, doc: FirebaseFirestore.QueryDocumentSnapshot) => void
) => {
  const chunkSize = 400;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    docs.slice(i, i + chunkSize).forEach((doc) => fn(batch, doc));
    await batch.commit();
  }
};

const main = async () => {
  const fromSnap = await db.collection(fromCollection).get();
  if (fromSnap.empty) {
    console.log(`No docs found in ${fromCollection}.`);
    return;
  }

  if (!force) {
    const destinationHasDocs = await hasDocs(toCollection);
    if (destinationHasDocs) {
      console.log(
        `${toCollection} already has docs. Use --force to merge/overwrite.`
      );
      return;
    }
  }

  await commitInChunks(fromSnap.docs, (batch, doc) => {
    const destRef = db.collection(toCollection).doc(doc.id);
    batch.set(destRef, doc.data(), { merge: true });
  });

  console.log(
    `Migrated ${fromSnap.size} docs from ${fromCollection} to ${toCollection}.`
  );

  if (removeOld) {
    await commitInChunks(fromSnap.docs, (batch, doc) => {
      batch.delete(doc.ref);
    });
    console.log(`Deleted old docs from ${fromCollection}.`);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
