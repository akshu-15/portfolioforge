import type { WizardState } from "@/components/wizard/WizardContext";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PORTFOLIO_STORAGE_PREFIX = "portfolioforge:portfolio:";
const PORTFOLIO_DB_NAME = "portfolioforge";
const PORTFOLIO_DB_VERSION = 1;
const PORTFOLIO_STORE_NAME = "published-portfolios";

export type PublishedPortfolio = WizardState & {
  id: string;
  publishedAt: string;
};

function getDisplayName(state: WizardState): string {
  return (
    state.personal.name ||
    `${state.personal.firstName || ""} ${state.personal.lastName || ""}`.trim()
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function createRandomSuffix(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  }

  return Math.random().toString(36).slice(2, 8);
}

export function createPortfolioId(state?: WizardState): string {
  const nameSlug = state ? slugify(getDisplayName(state)) : "";

  if (!nameSlug) {
    return createRandomSuffix() + Date.now().toString(36).slice(-4);
  }

  // 1. Check whether the current portfolio already has a published ID locally.
  // 2. If yes: Reuse the same ID.
  if (hasLocalPortfolio(nameSlug)) {
    return nameSlug;
  }

  // 3. If no: Generate a new ID using current logic.
  let candidate = nameSlug;
  let counter = 2;

  while (hasLocalPortfolio(candidate)) {
    candidate = `${nameSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function hasLocalPortfolio(id: string): boolean {
  try {
    return Boolean(globalThis.localStorage?.getItem(`${PORTFOLIO_STORAGE_PREFIX}${id}`));
  } catch {
    return false;
  }
}

function openPortfolioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(PORTFOLIO_DB_NAME, PORTFOLIO_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PORTFOLIO_STORE_NAME)) {
        db.createObjectStore(PORTFOLIO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePortfolioToIndexedDb(portfolio: PublishedPortfolio): Promise<void> {
  const db = await openPortfolioDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(PORTFOLIO_STORE_NAME, "readwrite");
      const store = transaction.objectStore(PORTFOLIO_STORE_NAME);
      store.put(portfolio);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function getPortfolioFromIndexedDb(id: string): Promise<PublishedPortfolio | null> {
  if (!globalThis.indexedDB) return null;

  const db = await openPortfolioDb();

  try {
    return await new Promise<PublishedPortfolio | null>((resolve, reject) => {
      const transaction = db.transaction(PORTFOLIO_STORE_NAME, "readonly");
      const store = transaction.objectStore(PORTFOLIO_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as PublishedPortfolio | undefined) || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

// Helper to sanitize the document to fit within Firestore's limits and constraints
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined || obj === null) return null;
  if (typeof obj === "string") {
    // Firestore limit is 1MiB per document.
    // A document with multiple 300KB Base64 files can easily exceed 1MiB total.
    // Omitting any base64 string > 50KB ensures we safely stay under limits.
    if (obj.startsWith("data:") && obj.length > 50000) {
      console.log(`\n    ⚠️ Oversized base64 string detected (${(obj.length / 1024).toFixed(2)} KB). Omitting to fit Firestore limits.`);
      return null;
    }
    // Catch any other massive string > 500KB.
    if (obj.length > 500000) {
      console.log(`\n    ⚠️ Oversized string detected (${(obj.length / 1024).toFixed(2)} KB). Omitting to fit Firestore limits.`);
      return null;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (Array.isArray(item)) {
        return { ...sanitizeForFirestore(item) };
      }
      return sanitizeForFirestore(item);
    });
  }
  if (typeof obj === "object") {
    const newObj: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "") continue; 
      if (v === undefined) continue;
      newObj[k] = sanitizeForFirestore(v);
    }
    return newObj;
  }
  return obj;
}

async function savePortfolioToRemote(portfolio: PublishedPortfolio): Promise<void> {
  try {
    const sanitizedData = sanitizeForFirestore(portfolio);
    
    const payload = {
      data: sanitizedData,
      published_at: portfolio.publishedAt,
      created_at: new Date().toISOString(),
    };

    // Measure and log approximate document size before saving
    const approxSizeBytes = new Blob([JSON.stringify(payload)]).size;
    console.log(`[Firestore Save] Approximate document size: ${(approxSizeBytes / 1024).toFixed(2)} KB`);

    if (approxSizeBytes > 900000) {
      console.warn("⚠️ Warning: Document size is very close to Firestore's 1 MiB limit!");
    }
    
    await setDoc(doc(db, "portfolios", portfolio.id), payload, { merge: true });
  } catch (error) {
    console.error("Firebase save error:", error);
    throw new Error("Failed remote save");
  }
}

async function getPortfolioFromRemote(id: string): Promise<PublishedPortfolio | null> {
  try {
    const docRef = doc(db, "portfolios", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.data as PublishedPortfolio;
    }
    return null;
  } catch (error) {
    console.error("Firebase fetch error:", error);
    throw new Error("Failed remote load");
  }
}

export function validatePortfolioData(state: WizardState): string[] {
  const errors: string[] = [];
  const displayName =
    state.personal.name ||
    `${state.personal.firstName || ""} ${state.personal.lastName || ""}`.trim();

  if (!displayName) errors.push("Add your name before generating the portfolio.");
  if (!state.personal.role) errors.push("Add a professional role before generating the portfolio.");
  if (!state.personal.email) errors.push("Add an email address before generating the portfolio.");
  if (
    state.skills.length === 0 &&
    Object.values(state.categorizedSkills).every((list) => !list.length)
  ) {
    errors.push("Add at least one skill before generating the portfolio.");
  }
  if (state.projects.length === 0 && state.experience.length === 0) {
    errors.push("Add at least one project or experience before generating the portfolio.");
  }

  return errors;
}

export function savePublishedPortfolio(
  state: WizardState,
  id = createPortfolioId(state),
): PublishedPortfolio {
  const portfolio: PublishedPortfolio = {
    ...state,
    id,
    publishedAt: new Date().toISOString(),
  };

  try {
    globalThis.localStorage.setItem(`${PORTFOLIO_STORAGE_PREFIX}${id}`, JSON.stringify(portfolio));
  } catch {
    throw new Error("Failed save");
  }

  return portfolio;
}

export async function savePublishedPortfolioAsync(
  state: WizardState,
  id = createPortfolioId(state),
): Promise<PublishedPortfolio> {
  const portfolio: PublishedPortfolio = {
    ...state,
    id,
    publishedAt: new Date().toISOString(),
  };
  let savedInBrowser = false;

  try {
    globalThis.localStorage.setItem(`${PORTFOLIO_STORAGE_PREFIX}${id}`, JSON.stringify(portfolio));
    savedInBrowser = true;
  } catch {
    try {
      await savePortfolioToIndexedDb(portfolio);
      savedInBrowser = true;
    } catch {
      savedInBrowser = false;
    }
  }

  try {
    await savePortfolioToRemote(portfolio);
  } catch {
    if (savedInBrowser) throw new Error("Failed share save");
    throw new Error("Failed save");
  }

  return portfolio;
}

export function getPublishedPortfolio(id: string): PublishedPortfolio | null {
  try {
    const value = globalThis.localStorage.getItem(`${PORTFOLIO_STORAGE_PREFIX}${id}`);
    return value ? (JSON.parse(value) as PublishedPortfolio) : null;
  } catch {
    return null;
  }
}

export async function getPublishedPortfolioAsync(id: string): Promise<PublishedPortfolio | null> {
  try {
    const remotePortfolio = await getPortfolioFromRemote(id);
    if (remotePortfolio) return remotePortfolio;
  } catch (err) {
    console.error("Failed to load from Supabase, falling back to local storage:", err);
  }

  const localPortfolio = getPublishedPortfolio(id);
  if (localPortfolio) return localPortfolio;

  try {
    const indexedPortfolio = await getPortfolioFromIndexedDb(id);
    if (indexedPortfolio) return indexedPortfolio;
  } catch {
    return null;
  }

  return null;
}

export function getPortfolioUrl(id: string): string {
  const origin =
    globalThis.location?.origin && globalThis.location.origin !== "null"
      ? globalThis.location.origin
      : "https://portfolioforge.vercel.app";

  return `${origin}/portfolio/${id}`;
}
