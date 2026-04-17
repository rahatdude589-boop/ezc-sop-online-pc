console.log("SYNC DELETED VENDORS LOADED");

// get deleted vendors from IndexedDB
function getDeletedVendors(callback) {
  const request = indexedDB.open("VENDOR_DB" + USER_ID);

  request.onsuccess = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("deleted_vendors")) {
      console.warn("deleted_vendors store not found");
      callback([]);
      return;
    }

    const tx = db.transaction("deleted_vendors", "readonly");
    const store = tx.objectStore("deleted_vendors");

    const getAll = store.getAll();

    getAll.onsuccess = function () {
      callback(getAll.result);
    };

    getAll.onerror = function (err) {
      console.error("Error fetching deleted vendors:", err);
      callback([]);
    };
  };

  request.onerror = function (event) {
    console.error("DB open error:", event.target.error);
    callback([]);
  };
}

// remove from local deleted store
function removeDeletedVendor(localId) {
  const request = indexedDB.open("VENDOR_DB" + USER_ID);

  request.onsuccess = function (event) {
    const db = event.target.result;

    const tx = db.transaction("deleted_vendors", "readwrite");
    const store = tx.objectStore("deleted_vendors");

    store.delete(localId);
  };
}

// main sync function
window.syncDeletedVendors = function () {
  console.log("DELETED VENDORS SYNC STARTED");

  getDeletedVendors(async function (vendors) {
    console.log("Deleted vendors found:", vendors.length);

    for (let i = 0; i < vendors.length; i++) {
      let v = vendors[i];

      const { error } = await supabaseClient
        .from("vendors")
        .upsert(
          [{
            user_id: USER_ID,
            local_id: v.id,
            deleted: true,              // ⭐ IMPORTANT
            last_updated: new Date().toISOString() // ✅ FIXED
          }],
          {
            onConflict: ["user_id", "local_id"]
          }
        );

      if (error) {
        console.log("DELETE SYNC ERROR:", v.id, error.message);
      } else {
        console.log("DELETE SYNC OK:", v.id);

        // remove from local after successful sync
        removeDeletedVendor(v.id);
      }
    }
  });
};