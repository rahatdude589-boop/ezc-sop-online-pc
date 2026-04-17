console.log("SYNC DELETED PRODUCTS LOADED");

// get deleted products
function getDeletedProducts(callback) {
  const request = indexedDB.open("POS_DB" + USER_ID);

  request.onsuccess = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("deleted_products")) {
      console.warn("deleted_products store not found");
      callback([]);
      return;
    }

    const tx = db.transaction("deleted_products", "readonly");
    const store = tx.objectStore("deleted_products");

    const getAll = store.getAll();

    getAll.onsuccess = function () {
      callback(getAll.result);
    };

    getAll.onerror = function () {
      callback([]);
    };
  };

  request.onerror = function () {
    callback([]);
  };
}

// remove after sync
function removeDeletedProduct(code) {
  const request = indexedDB.open("POS_DB" + USER_ID);

  request.onsuccess = function (event) {
    const db = event.target.result;

    const tx = db.transaction("deleted_products", "readwrite");
    const store = tx.objectStore("deleted_products");

    store.delete(code);
  };
}

// main sync
window.syncDeletedProducts = function () {
  console.log("DELETED PRODUCTS SYNC STARTED");

  getDeletedProducts(async function (products) {
    console.log("Deleted products found:", products.length);

    for (let i = 0; i < products.length; i++) {
      let p = products[i];

      const { error } = await supabaseClient
        .from("products")
        .upsert(
          [{
            user_id: USER_ID,
            code: p.code,
            deleted: true,  // 🔥 IMPORTANT
            last_updated: new Date().toISOString()
          }],
          {
            onConflict: "user_id,code"
          }
        );

      if (error) {
        console.log("DELETE SYNC ERROR:", p.code, error.message);
      } else {
        console.log("DELETE SYNC OK:", p.code);

        // remove from local
        removeDeletedProduct(p.code);
      }
    }
  });
};