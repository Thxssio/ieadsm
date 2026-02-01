import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
dotenv.config();

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry-run");

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

type CongregationSeed = {
  sector: string;
  sectorOrder: number;
  name: string;
  order: number;
};

const RAW_ENTRIES = `
SETOR 01 | CONG. MATRIZ.
SETOR 01 | CONG. GALILÉIA.
SETOR 01 | CONG. BELÉM.
SETOR 01 | CONG. CAFARNAUM.
SETOR 02 | CONG. SHIRMER.
SETOR 03 | CONG. ITARARÉ.
SETOR 04 | CONG. CAMPESTRE.
SETOR 05 | CONG. SALGADO FILHO.
SETOR 06 | CONG. VITÓRIA.
SETOR 07 | CONG. BELA UNIÃO.
SETOR 08 | CONG. CAROLINA.
SETOR 09 | CONG. BRENNER.
SETOR 10 | CONG. OLIVEIRA.
SETOR 11 | CONG. LÍDIA.
SETOR 11 | CONG. NATAL.
SETOR 12 | CONG. ALTO DA BOA VISTA.
SETOR 13 | CONG. CARAMELO.
SETOR 14 | CONG. PÔR DO SOL.
SETOR 15 | CONG. SANTA MARTA.
SETOR 16 | CONG. NÚCLEO CENTRAL.
SETOR 17 | CONG. CATARINA.
SETOR 18 | CONG. PARQUE PINHEIRO MACHADO.
SETOR 19 | CONG. TANCREDO NEVES.
SETOR 20 | CONG. BOCA DO MONTE.
SETOR 20 | CONG. ULBRA.
SETOR 21 | CONG. DUQUE DE CAXIAS.
SETOR 22 | CONG. TOMAZETTI.
SETOR 23 | CONG. PASSO DAS TROPAS.
SETOR 23 | CONG. IPIRANGA.
SETOR 24 | CONG. URLÂNDIA.
SETOR 25 | CONG. TROPICAL.
SETOR 26 | CONG. LORENZI.
SETOR 26 | CONG. DESBRAVADORES.
SETOR 27 | CONG. SEVERO.
SETOR 28 | CONG. DILERMANDO DE AGUIAR
SETOR 29 | CONG. PICADA DO GAMA
SETOR 30 | CONG. CAMPO DA PEDRA
SETOR 31 | CONG. SANTA FLORA
SETOR 31 | CONG. BANHADOS
`.trim();

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const toSlug = (value: string) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const parseEntries = (): CongregationSeed[] => {
  const lines = RAW_ENTRIES.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const orderBySector = new Map<string, number>();
  const seen = new Set<string>();

  return lines
    .map((line) => line.replace(/\.+$/, "").trim())
    .map((line) => {
      const [sectorPart, namePart] = line.split("|").map((part) => part.trim());
      if (!sectorPart || !namePart) {
        throw new Error(`Formato inválido: "${line}"`);
      }
      const sectorOrder = Number(sectorPart.match(/\d+/)?.[0] ?? 0) || 0;
      const normalizedSector = sectorPart.replace(/\s+/g, " ").trim();
      const name = namePart
        .replace(/^CONG\.?\s*/i, "Cong. ")
        .replace(/\s+/g, " ")
        .trim();
      const key = `${normalizeKey(normalizedSector)}|${normalizeKey(name)}`;
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);
      const currentOrder = (orderBySector.get(normalizedSector) ?? 0) + 1;
      orderBySector.set(normalizedSector, currentOrder);
      return {
        sector: normalizedSector,
        sectorOrder,
        name,
        order: currentOrder,
      };
    })
    .filter((item): item is CongregationSeed => Boolean(item));
};

const main = async () => {
  const entries = parseEntries();
  if (entries.length === 0) {
    console.log("Nenhuma congregação encontrada para importar.");
    return;
  }

  const existingSnap = await db.collection("congregations").get();
  const existingMap = new Map<string, string>();
  existingSnap.docs.forEach((doc) => {
    const data = doc.data() as Partial<CongregationSeed>;
    if (!data.sector || !data.name) return;
    const key = `${normalizeKey(data.sector)}|${normalizeKey(data.name)}`;
    existingMap.set(key, doc.id);
  });

  const writes: Array<{ id: string; data: CongregationSeed }> = [];
  entries.forEach((entry) => {
    const key = `${normalizeKey(entry.sector)}|${normalizeKey(entry.name)}`;
    const existingId = existingMap.get(key);
    if (existingId && !force) {
      return;
    }
    const id = existingId || toSlug(`${entry.sector}-${entry.name}`);
    writes.push({ id, data: entry });
  });

  if (writes.length === 0) {
    console.log("Nada para inserir. Use --force para sobrescrever existentes.");
    return;
  }

  if (dryRun) {
    console.log(`Dry run: ${writes.length} congregações.`);
    writes.slice(0, 5).forEach((item) => {
      console.log("-", item.id, item.data);
    });
    return;
  }

  const batchSize = 450;
  for (let i = 0; i < writes.length; i += batchSize) {
    const batch = db.batch();
    writes.slice(i, i + batchSize).forEach((item) => {
      const ref = db.collection("congregations").doc(item.id);
      batch.set(ref, item.data, { merge: true });
    });
    await batch.commit();
  }

  console.log(
    `Importadas ${writes.length} congregações${force ? " (force)" : ""}.`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
