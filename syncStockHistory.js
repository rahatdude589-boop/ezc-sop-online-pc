// =====================================================
// STOCK HISTORY SYNC SYSTEM (CLEAN + CONFLICT SAFE)
// =====================================================

console.log("STOCK HISTORY SYNC LOADED");

// ---------------------------------
// OPEN DB
// ---------------------------------
function openHistoryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("STOCK_HISTORY_DB" + USER_ID);

    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

// ---------------------------------
// GET ALL LOCAL HISTORY
// ---------------------------------
async function getLocalHistory() {
  const db = await openHistoryDB();

  return new Promise(resolve => {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");

    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
  });
}

// ---------------------------------
// SAVE LOCAL HISTORY (RESTORE)
// ---------------------------------
async function saveLocalHistory(h) {
  const db = await openHistoryDB();

  return new Promise(resolve => {
    const tx = db.transaction("history", "readwrite");
    const store = tx.objectStore("history");

    // FORCE CLEAN OVERWRITE (same style as sales)
    const clean = {
      ...h,
      id: h.local_id || h.id, // keep IndexedDB key stable
    };

    store.put(clean);

    tx.oncomplete = () => resolve();
  });
}

// ---------------------------------
// REMOVE LOCAL HISTORY (optional)
// ---------------------------------
async function removeLocalHistory(local_id) {
  const db = await openHistoryDB();

  return new Promise(resolve => {
    const tx = db.transaction("history", "readwrite");
    tx.objectStore("history").delete(local_id);

    tx.oncomplete = () => resolve();
  });
}

// =====================================================
// STEP 1: LOCAL -> CLOUD (UPLOAD)
// =====================================================
window.syncStockHistory = async function () {
  if (!navigator.onLine) return;

  console.log("STOCK HISTORY UPLOAD START");

  const history = await getLocalHistory();

  for (const h of history) {
    const { data: cloud } = await supabaseClient
      .from("stock_history")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("local_id", h.id)
      .maybeSingle();

    // conflict rule: cloud newer → skip
    if (
      cloud &&
      cloud.last_updated &&
      h.last_updated &&
      new Date(cloud.last_updated) > new Date(h.last_updated)
    ) {
      continue;
    }

    const { error } = await supabaseClient
      .from("stock_history")
      .upsert({
        user_id: USER_ID,
        local_id: h.id,

        date: h.date,
        time: h.time,
        code: h.code,
        name: h.name,
        quantity_change: h.quantityChange,
        current_stock: h.currentStock,
        action: h.action,

        last_updated: h.last_updated || new Date().toISOString()
      }, {
        onConflict: "user_id,local_id"
      });

    if (!error) {
      console.log("HISTORY UPLOADED:", h.id);
    }
  }

  console.log("STOCK HISTORY UPLOAD DONE");
};

// =====================================================
// STEP 2: CLOUD -> LOCAL RESTORE
// =====================================================
window.restoreStockHistory = async function () {
  if (!navigator.onLine) return;

  console.log("STOCK HISTORY RESTORE START");

  const { data, error } = await supabaseClient
    .from("stock_history")
    .select("*")
    .eq("user_id", USER_ID);

  if (error) {
    console.log(error);
    return;
  }

  const localHistory = await getLocalHistory();

  for (const row of data) {
    const exists = localHistory.find(x => x.id === row.local_id);

    // same logic as sales restore
    if (exists) continue;

    await saveLocalHistory({
      id: row.local_id,
      local_id: row.local_id,

      date: row.date,
      time: row.time,
      code: row.code,
      name: row.name,
      quantityChange: row.quantity_change,
      currentStock: row.current_stock,
      action: row.action,

      last_updated: row.last_updated
    });
  }

  console.log("STOCK HISTORY RESTORE DONE");
};

// =====================================================
// STEP 3: SINGLE SYNC
// =====================================================
window.syncSingleStockHistory = async function (local_id) {
  if (!navigator.onLine) return;

  const db = await openHistoryDB();

  const h = await new Promise(resolve => {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const req = store.get(local_id);

    req.onsuccess = () => resolve(req.result);
  });

  if (!h) return;

  const { error } = await supabaseClient
    .from("stock_history")
    .upsert({
      user_id: USER_ID,
      local_id: h.id,

      date: h.date,
      time: h.time,
      code: h.code,
      name: h.name,
      quantity_change: h.quantityChange,
      current_stock: h.currentStock,
      action: h.action,

      last_updated: h.last_updated || new Date().toISOString()
    }, {
      onConflict: "user_id,local_id"
    });

  if (!error) {
    console.log("SINGLE HISTORY SYNCED:", local_id);
  }
};