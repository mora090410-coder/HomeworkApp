/**
 * One-time migration: backfills `householdId` on all task documents
 * that are missing it, across root + profile sub-collections.
 *
 * Uses Application Default Credentials (already set up via `gcloud auth`
 * or Firebase CLI login). Run with:
 *   node scripts/backfillTaskHouseholdId.mjs
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'homeworkapp-fefc7';

if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();
const BATCH_SIZE = 400;

async function commitBatch(batch, count) {
    if (count > 0) {
        await batch.commit();
        console.log(`  ✓ Committed ${count} update(s)`);
    }
}

async function backfill() {
    console.log(`Backfilling householdId on task documents for project: ${PROJECT_ID}\n`);

    const householdsSnap = await db.collection('households').get();
    console.log(`Found ${householdsSnap.size} household(s).`);

    let totalUpdated = 0;

    for (const householdDoc of householdsSnap.docs) {
        const householdId = householdDoc.id;
        console.log(`\n── Household: ${householdId} (${householdDoc.data().name ?? '?'})`);

        let batch = db.batch();
        let batchCount = 0;

        const flush = async () => {
            await commitBatch(batch, batchCount);
            totalUpdated += batchCount;
            batch = db.batch();
            batchCount = 0;
        };

        // 1. Root tasks
        const rootTasks = await db.collection(`households/${householdId}/tasks`).get();
        for (const t of rootTasks.docs) {
            if (!t.data().householdId) {
                console.log(`  [root] patching task ${t.id}`);
                batch.update(t.ref, { householdId });
                if (++batchCount >= BATCH_SIZE) await flush();
            }
        }

        // 2. Profile sub-collection tasks
        const profiles = await db.collection(`households/${householdId}/profiles`).get();
        for (const p of profiles.docs) {
            const profileId = p.id;
            const profileTasks = await db
                .collection(`households/${householdId}/profiles/${profileId}/tasks`)
                .get();
            for (const t of profileTasks.docs) {
                if (!t.data().householdId) {
                    console.log(`  [profile/${profileId}] patching task ${t.id}`);
                    batch.update(t.ref, { householdId });
                    if (++batchCount >= BATCH_SIZE) await flush();
                }
            }
        }

        await flush();
    }

    console.log(`\n✅ Done — ${totalUpdated} document(s) updated.`);
}

backfill().catch((err) => {
    console.error('Backfill error:', err);
    process.exit(1);
});
