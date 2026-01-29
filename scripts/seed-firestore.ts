import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";
import { defaultSiteSettings, seedSiteSettings } from "../src/data/siteContent";
import {
  seedServiceTimes,
  seedDepartments,
  historyTimeline,
  seedBoardMembers,
} from "../src/data/site";
import { seedLinks } from "../src/data/links";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
dotenv.config();

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const useEmpty = args.has("--empty");
const useNull = args.has("--null");

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

const toNullDefaults = <T extends Record<string, unknown>>(obj: T) => {
  const out: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    out[key] = null;
  });
  return out as T;
};

const settingsPayload = useNull
  ? toNullDefaults(seedSiteSettings)
  : useEmpty
  ? defaultSiteSettings
  : seedSiteSettings;

const collectionHasDocs = async (path: string) => {
  const snap = await db.collection(path).limit(1).get();
  return !snap.empty;
};

const seedSettings = async () => {
  const ref = db.collection("settings").doc("site");
  const snap = await ref.get();
  if (snap.exists && !force) {
    console.log("settings/site already exists. Skipping.");
    return;
  }
  await ref.set(settingsPayload);
  console.log("settings/site seeded.");
};

const seedCollection = async <T extends { id?: number | string }>(
  path: string,
  items: T[],
  docId: (item: T, index: number) => string
) => {
  if (items.length === 0) {
    console.log(`${path} is empty. Skipping.`);
    return;
  }
  if (!force) {
    const hasDocs = await collectionHasDocs(path);
    if (hasDocs) {
      console.log(`${path} already has docs. Skipping.`);
      return;
    }
  }
  const batch = db.batch();
  items.forEach((item, index) => {
    const { id, ...data } = item;
    const ref = db.collection(path).doc(docId(item, index));
    batch.set(ref, data);
  });
  await batch.commit();
  console.log(`${path} seeded (${items.length}).`);
};

const main = async () => {
  await seedSettings();
  await seedCollection("serviceTimes", seedServiceTimes, (item) =>
    String((item as { order?: number }).order ?? item.id ?? Date.now())
  );
  await seedCollection("links", seedLinks, (_, index) => `link-${index + 1}`);
  await seedCollection("departments", seedDepartments, (item) =>
    String(item.id ?? Date.now())
  );
  await seedCollection("historyTimeline", historyTimeline, (_, index) => `event-${index + 1}`);
  await seedCollection(
    "boardMembers",
    seedBoardMembers,
    (item) => String(item.id ?? Date.now())
  );
};

main()
  .then(() => {
    console.log("Seed completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
