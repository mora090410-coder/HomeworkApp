/**
 * @fileoverview One-shot migration script: moves orphaned tasks from the root
 * `households/{hid}/tasks` collection into the correct child sub-collection
 * `households/{hid}/profiles/{childId}/tasks`.
 *
 * An "orphaned" task is any document in the root collection whose `assigneeId`
 * field is a non-empty string — meaning it was assigned to a child but was
 * written to the wrong collection path (e.g. by an older version of the app).
 *
 * The script is idempotent: if a document with the same ID already exists in
 * the target sub-collection it is skipped, so it is safe to run more than once.
 *
 * Usage (from the project root):
 *   npx ts-node --esm scripts/migrateOrphanedTasks.ts
 *
 * Environment variables required (same as the app):
 *   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
 *   VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID,
 *   VITE_FIREBASE_APP_ID
 *
 * The script uses the Firebase Admin SDK so it bypasses Firestore security rules
 * and does NOT require the user to be authenticated.
 */

import * as admin from 'firebase-admin';
import { getFirestore, DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Firebase Admin initialisation
// ---------------------------------------------------------------------------

/**
 * Reads a required environment variable, throwing if it is absent.
 *
 * @param key - The environment variable name.
 * @returns The value of the environment variable.
 * @throws {Error} When the variable is not set.
 */
function requireEnv(key: string): string {
    const value = process.env[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

// Initialise using Application Default Credentials when running locally with
// `gcloud auth application-default login`, or via a service-account key file
// exported as GOOGLE_APPLICATION_CREDENTIALS.
admin.initializeApp({
    projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
});

const db = getFirestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal shape of a Firestore task document. */
interface FirestoreTaskDoc {
    householdId: string;
    assigneeId: string | null;
    name: string;
    status: string;
    baselineMinutes: number;
    [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Core migration logic
// ---------------------------------------------------------------------------

/**
 * Migrates all orphaned tasks for a single household.
 *
 * @param householdId - The Firestore document ID of the household.
 * @returns A summary object with counts of moved and skipped tasks.
 */
async function migrateHousehold(
    householdId: string,
): Promise<{ moved: number; skipped: number; errors: number }> {
    const rootTasksRef = db.collection(`households/${householdId}/tasks`);
    const snapshot = await rootTasksRef.get();

    let moved = 0;
    let skipped = 0;
    let errors = 0;

    for (const taskDoc of snapshot.docs as QueryDocumentSnapshot<DocumentData>[]) {
        const data = taskDoc.data() as FirestoreTaskDoc;
        const assigneeId = data.assigneeId;

        // Only process tasks that are genuinely assigned to a child.
        if (typeof assigneeId !== 'string' || assigneeId.trim().length === 0) {
            continue;
        }

        const targetRef = db.doc(
            `households/${householdId}/profiles/${assigneeId}/tasks/${taskDoc.id}`,
        );

        try {
            const existing = await targetRef.get();

            if (existing.exists) {
                console.log(
                    `  [SKIP] Task "${data.name}" (${taskDoc.id}) already exists in sub-collection for child ${assigneeId}.`,
                );
                skipped++;
                continue;
            }

            // Use a batch to copy then delete atomically.
            const batch = db.batch();
            batch.set(targetRef, data);
            batch.delete(taskDoc.ref);
            await batch.commit();

            console.log(
                `  [MOVE] Task "${data.name}" (${taskDoc.id}) → profiles/${assigneeId}/tasks`,
            );
            moved++;
        } catch (error) {
            console.error(
                `  [ERROR] Failed to migrate task "${data.name}" (${taskDoc.id}):`,
                error,
            );
            errors++;
        }
    }

    return { moved, skipped, errors };
}

/**
 * Entry point: iterates over every household and migrates orphaned tasks.
 */
async function main(): Promise<void> {
    console.log('🔍  Scanning households for orphaned tasks…\n');

    const householdsSnapshot = await db.collection('households').get();

    if (householdsSnapshot.empty) {
        console.log('No households found. Nothing to migrate.');
        return;
    }

    let totalMoved = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const householdDoc of householdsSnapshot.docs) {
        const householdId = householdDoc.id;
        const householdName = (householdDoc.data() as { name?: string }).name ?? householdId;

        console.log(`📂  Household: "${householdName}" (${householdId})`);

        const { moved, skipped, errors } = await migrateHousehold(householdId);
        totalMoved += moved;
        totalSkipped += skipped;
        totalErrors += errors;

        console.log(
            `    ✅ Moved: ${moved}  ⏭️  Skipped: ${skipped}  ❌ Errors: ${errors}\n`,
        );
    }

    console.log('─'.repeat(50));
    console.log(`Migration complete.`);
    console.log(`  Total moved:   ${totalMoved}`);
    console.log(`  Total skipped: ${totalSkipped}`);
    console.log(`  Total errors:  ${totalErrors}`);

    if (totalErrors > 0) {
        console.warn('\n⚠️  Some tasks failed to migrate. Review the errors above and re-run.');
        process.exit(1);
    }
}

main().catch((error: unknown) => {
    console.error('Fatal error during migration:', error);
    process.exit(1);
});
