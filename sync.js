// =====================================================
// ULTIMATE CONFLICT-PROOF sync.js
// Multi-device safe / last_updated based / delete-safe
// =====================================================

console.log("ULTIMATE SYNC LOADED");

// ---------------------------------
// OPEN DB
// ---------------------------------
function openProductsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("POS_DB" + USER_ID);

    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

// ---------------------------------
// GET ALL LOCAL PRODUCTS
// ---------------------------------
async function getLocalProducts() {
  const db = await openProductsDB();

  return new Promise(resolve => {
    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");

    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
  });
}

// ---------------------------------
// GET LOCAL DELETED PRODUCTS
// ---------------------------------
async function getDeletedProducts() {
  const db = await openProductsDB();

  if (!db.objectStoreNames.contains("deleted_products")) {
    return [];
  }

  return new Promise(resolve => {
    const tx = db.transaction("deleted_products", "readonly");
    const store = tx.objectStore("deleted_products");

    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
  });
}

// ---------------------------------
// REMOVE LOCAL DELETED FLAG AFTER CLOUD SYNC
// ---------------------------------
async function removeDeletedLocal(code) {
  const db = await openProductsDB();

  return new Promise(resolve => {
    const tx = db.transaction("deleted_products", "readwrite");
    tx.objectStore("deleted_products").delete(code);
    tx.oncomplete = () => resolve();
  });
}

// ---------------------------------
// SAVE LOCAL PRODUCT
// ---------------------------------
async function saveLocalProduct(product) {
  const db = await openProductsDB();

  return new Promise(resolve => {
    const tx = db.transaction("products", "readwrite");
    tx.objectStore("products").put(product);
    tx.oncomplete = () => resolve();
  });
}

// ---------------------------------
// DELETE LOCAL PRODUCT
// ---------------------------------
async function deleteLocalProduct(code) {
  const db = await openProductsDB();

  return new Promise(resolve => {
    const tx = db.transaction("products", "readwrite");
    tx.objectStore("products").delete(code);
    tx.oncomplete = () => resolve();
  });
}

// =====================================================
// STEP 1: PUSH LOCAL DELETES FIRST
// =====================================================
window.syncDeletedProducts = async function () {
  if (!navigator.onLine) return;

  console.log("SYNC DELETED START");

  const deleted = await getDeletedProducts();

  for (const p of deleted) {
    const { error } = await supabaseClient
      .from("products")
      .upsert({
        user_id: USER_ID,
        code: p.code,
        deleted: true,
        last_updated: new Date().toISOString()
      }, {
        onConflict: "user_id,code"
      });

    if (!error) {
      await removeDeletedLocal(p.code);
      console.log("Deleted synced:", p.code);
    }
  }
};

// =====================================================
// STEP 2: CLOUD -> LOCAL RESTORE
// =====================================================
window.restoreProducts = async function () {
  if (!navigator.onLine) return;

  console.log("RESTORE START");

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("user_id", USER_ID);

  if (error) {
    console.log(error);
    return;
  }

  for (const row of data) {
    // deleted product
    if (row.deleted === true) {
      await deleteLocalProduct(row.code);
      continue;
    }

    const localProducts = await getLocalProducts();
    const local = localProducts.find(x => x.code === row.code);

    // local newer than cloud => keep local
    if (
      local &&
      local.last_updated &&
      new Date(local.last_updated) > new Date(row.last_updated)
    ) {
      continue;
    }

    // cloud newer => overwrite local
    await saveLocalProduct({
      code: row.code,
      name: row.name,
      price: Number(row.price || 0),
      stock: Number(row.stock || 0),
      unit: row.unit || "",
      image: row.image || "",
      comment: row.comment || "",
      expDate: row.exp_date || "",
      mfgDate: row.mfg_date || "",
      last_updated: row.last_updated
    });
  }

  console.log("RESTORE DONE");
};

// =====================================================
// STEP 3: LOCAL -> CLOUD
// =====================================================
window.syncProducts = async function () {
  if (!navigator.onLine) return;

  console.log("UPLOAD START");

  const products = await getLocalProducts();

  for (const p of products) {
    // check cloud copy
    const { data: cloud } = await supabaseClient
      .from("products")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("code", p.code)
      .single();

    // if cloud newer skip upload
    if (
      cloud &&
      cloud.last_updated &&
      new Date(cloud.last_updated) > new Date(p.last_updated)
    ) {
      continue;
    }

    const { error } = await supabaseClient
      .from("products")
      .upsert({
        user_id: USER_ID,
        code: p.code,
        name: p.name,
        price: p.price,
        stock: p.stock,
        unit: p.unit,
        image: p.image,
        comment: p.comment,
        exp_date: p.expDate,
        mfg_date: p.mfgDate,
        deleted: false,
        last_updated: p.last_updated || new Date().toISOString()
      }, {
        onConflict: "user_id,code"
      });

    if (!error) {
      console.log("Uploaded:", p.code);
    }
  }

  console.log("UPLOAD DONE");
};

// =====================================================
// MASTER STARTUP ORDER
// =====================================================
// =====================================================
// SYNC ONLY ONE PRODUCT
// =====================================================
window.syncSingleProduct = async function(code) {
  if (!navigator.onLine) return;

  console.log("SYNC SINGLE:", code);

  const db = await openProductsDB();

  const product = await new Promise(resolve => {
    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");
    const req = store.get(code);

    req.onsuccess = () => resolve(req.result);
  });

  if (!product) {
    console.log("Product not found");
    return;
  }

  const { error } = await supabaseClient
    .from("products")
    .upsert({
      user_id: USER_ID,
      code: product.code,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      image: product.image,
      comment: product.comment,
      exp_date: product.expDate,
      mfg_date: product.mfgDate,
      deleted: false,
      last_updated: product.last_updated || new Date().toISOString()
    }, {
      onConflict: "user_id,code"
    });

  if (!error) {
    console.log("Single Product Synced:", code);
  } else {
    console.log(error);
  }
};