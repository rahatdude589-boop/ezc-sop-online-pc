console.log("SYNC DAILY BACKUP LOADED");

/* ---------------------------
   READ OBJECT STORE
---------------------------- */
function readStore(dbName, storeName) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);

        req.onerror = () => reject("Failed to open DB: " + dbName);

        req.onsuccess = event => {
            const db = event.target.result;

            // Check if store exists
            if (!db.objectStoreNames.contains(storeName)) {
                console.warn(`Store '${storeName}' not found in DB '${dbName}'`);
                resolve([]); // return empty array if store not found
                return;
            }

            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const g = store.getAll();

            g.onsuccess = () => resolve(g.result);
            g.onerror = () => reject("Failed reading " + storeName);
        };
    });
}

/* ---------------------------
   COLLECT ALL DB DATA
---------------------------- */
async function collectAllIndexedDB(userId) {
    return {
        POS_DB: {
            products: await readStore("POS_DB" + userId, "products"),
            sales: await readStore("POS_DB" + userId, "sales"),
        },
        REFUND_DB: {
            refunds: await readStore("REFUND_DB" + userId, "refunds"),
        },
        STOCK_HISTORY_DB: {
            history: await readStore("STOCK_HISTORY_DB" + userId, "history"),
        },
        VENDOR_DB: {
            vendors: await readStore("VENDOR_DB" + userId, "vendors"),
        }
    };
}

/* ---------------------------
   GLOBAL BACKUP FUNCTION
---------------------------- */
window.syncDailyBackup = async function () {
    console.log("DAILY BACKUP SYNC STARTED");

    let userData = null;

    // Safe user detection for Supabase v2
    if (supabaseClient.auth.getUser) {
        const r = await supabaseClient.auth.getUser();
        userData = r?.data?.user ?? null;
    } else if (supabaseClient.auth.user) {
        userData = supabaseClient.auth.user();
    }

    if (!userData) {
        console.warn("❌ No logged-in user — cannot backup");
        return;
    }

    const today = new Date().toISOString().slice(0, 10);

    // Collect full backup
    const fullBackup = await collectAllIndexedDB(userData.id);

    // Upload to Supabase
    const { error } = await supabaseClient
        .from("user_backups")
        .upsert({
            user_id: userData.id,
            backup_date: today,
            backup_json: fullBackup
        },
         
         {
    onConflict: "user_id,backup_date"
  });

    if (error) {
        console.error("❌ BACKUP FAILED:", error);
    } else {
        console.log("✅ DAILY BACKUP OK");
    }
};