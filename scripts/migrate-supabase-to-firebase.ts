import { createClient } from "@supabase/supabase-js";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { join } from "path";

// Load local environment variables
dotenv.config({ path: join(process.cwd(), ".env") });

// --- Supabase Config ---
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
// NOTE: VITE_SUPABASE_ANON_KEY allows reads based on RLS policies.
// If the 'portfolios' table has public read access, ANON_KEY is sufficient.
// If RLS prevents public listing, you MUST provide SUPABASE_SERVICE_ROLE_KEY
// as an environment variable to bypass RLS securely during migration.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Firebase Admin Config ---
// The Firebase Admin SDK uses GOOGLE_APPLICATION_CREDENTIALS to securely
// identify the server without hardcoding or exposing keys in code.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ Missing GOOGLE_APPLICATION_CREDENTIALS environment variable.");
  console.error("Please set it to the path of your Firebase service account JSON file.");
  process.exit(1);
}

try {
  initializeApp({
    credential: applicationDefault(),
  });
} catch (err) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", err);
  process.exit(1);
}

const db = getFirestore();

// Helper to sanitize the document to fit within Firestore's limits and constraints
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined || obj === null) return null;
  if (typeof obj === "string") {
    // Firestore limit is 1MiB per document. Strings over ~800KB (e.g. Base64 files) must be omitted.
    if (obj.length > 800000) {
      console.log(`\n    ⚠️ Oversized string detected (${(obj.length / 1024 / 1024).toFixed(2)} MB). Omitting to fit Firestore limits.`);
      return null;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (Array.isArray(item)) {
        // Firestore doesn't support nested arrays
        return { ...sanitizeForFirestore(item) };
      }
      return sanitizeForFirestore(item);
    });
  }
  if (typeof obj === "object") {
    const newObj: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "") continue; // Empty keys are invalid
      if (v === undefined) continue;
      newObj[k] = sanitizeForFirestore(v);
    }
    return newObj;
  }
  return obj;
}

async function migrate() {
  console.log("🚀 Starting migration...");
  console.log("Fetching portfolios from Supabase...");

  // Fetch all portfolios. If using ANON_KEY and RLS denies read, this might return [] or error.
  const { data: portfolios, error } = await supabase.from("portfolios").select("*");

  if (error) {
    console.error("❌ Error fetching from Supabase:", error);
    process.exit(1);
  }

  if (!portfolios || portfolios.length === 0) {
    console.log("⚠️ No portfolios found in Supabase (or RLS blocked the read).");
    console.log("If you expect data, you may need to use a SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }

  console.log(`✅ Found ${portfolios.length} portfolios. Starting migration to Firestore...`);

  let successCount = 0;
  let errorCount = 0;

  for (const portfolio of portfolios) {
    try {
      // EXACT PRESERVATION:
      // We use the existing Supabase `id` as the Firestore document ID.
      const docRef = db.collection("portfolios").doc(portfolio.id);

      // EXACT PRESERVATION:
      // We keep the data structure exactly as it was.
      // Idempotency: using set(..., { merge: true }) ensures it won't duplicate
      // or destroy existing fields if run multiple times.
      // Sanitize the data to handle oversized fields (like base64 PDFs) and undefined/nested arrays
      const sanitizedData = sanitizeForFirestore(portfolio.data);

      await docRef.set(
        {
          data: sanitizedData,
          published_at: portfolio.published_at,
          created_at: portfolio.created_at || new Date().toISOString(),
        },
        { merge: true },
      );

      console.log(` ✅ Migrated portfolio: ${portfolio.id}`);
      successCount++;
    } catch (err) {
      console.error(` ❌ Error migrating portfolio ${portfolio.id}:`, err);
      errorCount++;
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`Total records from Supabase: ${portfolios.length}`);
  console.log(`Successfully written to Firestore: ${successCount}`);
  console.log(`Failed: ${errorCount}`);

  if (errorCount > 0) {
    console.log("\n⚠️ Some records failed to migrate. Check the logs above.");
  } else {
    console.log("\n🎉 Migration completed successfully! All data is securely in Firestore.");
  }
}

migrate().catch((err) => {
  console.error("Unexpected error during migration:", err);
  process.exit(1);
});
