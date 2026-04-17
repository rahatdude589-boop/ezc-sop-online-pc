// =====================================================
// ULTIMATE VENDOR SYNC (LIKE PRODUCTS)
// =====================================================

console.log("VENDOR SYNC LOADED");

// ---------------------------------
// OPEN DB
// ---------------------------------
function openVendorDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("VENDOR_DB" + USER_ID);

    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

// ---------------------------------
// GET LOCAL VENDORS
// ---------------------------------
async function getLocalVendors() {
  const db = await openVendorDB();

  return new Promise(resolve => {
    const tx = db.transaction("vendors", "readonly");
    const store = tx.objectStore("vendors");

    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

// ---------------------------------
// GET DELETED VENDORS
// ---------------------------------
async function getDeletedVendors() {
  const db = await openVendorDB();

  if (!db.objectStoreNames.contains("deleted_vendors")) return [];

  return new Promise(resolve => {
    const tx = db.transaction("deleted_vendors", "readonly");
    const store = tx.objectStore("deleted_vendors");

    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

// ---------------------------------
// REMOVE LOCAL DELETED FLAG
// ---------------------------------
async function removeDeletedVendor(id) {
  const db = await openVendorDB();

  return new Promise(resolve => {
    const tx = db.transaction("deleted_vendors", "readwrite");
    tx.objectStore("deleted_vendors").delete(id);
    tx.oncomplete = () => resolve();
  });
}

// ---------------------------------
// SAVE LOCAL VENDOR
// ---------------------------------
async function saveLocalVendor(vendor) {
  const db = await openVendorDB();

  return new Promise(resolve => {
    const tx = db.transaction("vendors", "readwrite");
    tx.objectStore("vendors").put(vendor);
    tx.oncomplete = () => resolve();
  });
}

// ---------------------------------
// DELETE LOCAL VENDOR
// ---------------------------------
async function deleteLocalVendor(id) {
  const db = await openVendorDB();

  return new Promise(resolve => {
    const tx = db.transaction("vendors", "readwrite");
    tx.objectStore("vendors").delete(id);
    tx.oncomplete = () => resolve();
  });
}

// =====================================================
// STEP 1: PUSH DELETED FIRST
// =====================================================
window.syncDeletedVendors = async function () {
  if (!navigator.onLine) return;

  console.log("SYNC DELETED VENDORS");

  const deleted = await getDeletedVendors();

  for (const v of deleted) {
    const { error } = await supabaseClient
      .from("vendors")
      .upsert({
        user_id: USER_ID,
        local_id: v.id,
        deleted: true,
        last_updated: new Date().toISOString()
      }, {
        onConflict: "user_id,local_id"
      });

    if (!error) {
      await removeDeletedVendor(v.id);
      console.log("Deleted vendor synced:", v.id);
    }
  }
};

// =====================================================
// STEP 2: RESTORE (CLOUD → LOCAL)
// =====================================================
window.restoreVendors = async function () {
  if (!navigator.onLine) return;

  console.log("RESTORE VENDORS START");

  const { data, error } = await supabaseClient
    .from("vendors")
    .select("*")
    .eq("user_id", USER_ID);

  if (error) {
    console.log(error);
    return;
  }

  const localVendors = await getLocalVendors();

  for (const row of data) {

    // HANDLE DELETE
    if (row.deleted === true) {
      await deleteLocalVendor(row.local_id);
      continue;
    }

    const local = localVendors.find(x => x.id === row.local_id);

    // LOCAL NEWER → SKIP
    if (
      local &&
      local.last_updated &&
      new Date(local.last_updated) > new Date(row.last_updated)
    ) {
      continue;
    }

    // CLOUD NEWER → SAVE
    await saveLocalVendor({
      id: row.local_id,
      company: row.company,
      address: row.address,
      phone: row.phone,
      email: row.email,
      item: row.item,
      image: row.image,
      comment: row.comment,
      purchaseDate: row.purchase_date,
      due: Number(row.due || 0),
      total: Number(row.total || 0),
      last_updated: row.last_updated
    });
  }

  console.log("RESTORE VENDORS DONE");
};

// =====================================================
// STEP 3: LOCAL → CLOUD
// =====================================================
window.syncVendors = async function () {
  if (!navigator.onLine) return;

  console.log("UPLOAD VENDORS");

  const vendors = await getLocalVendors();

  for (const v of vendors) {

    const { data: cloud } = await supabaseClient
      .from("vendors")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("local_id", v.id)
      .single();

    // CLOUD NEWER → SKIP
    if (
      cloud &&
      cloud.last_updated &&
      new Date(cloud.last_updated) > new Date(v.last_updated)
    ) {
      continue;
    }

    const { error } = await supabaseClient
      .from("vendors")
      .upsert({
        user_id: USER_ID,
        local_id: v.id,
        company: v.company,
        address: v.address,
        phone: v.phone,
        email: v.email,
        item: v.item,
        image: v.image,
        comment: v.comment,
        purchase_date: v.purchaseDate,
        due: v.due,
        total: v.total,
        deleted: false,
        last_updated: v.last_updated || new Date().toISOString()
      }, {
        onConflict: "user_id,local_id"
      });

    if (!error) {
      console.log("Vendor uploaded:", v.id);
    }
  }

  console.log("UPLOAD VENDORS DONE");
};

// =====================================================
// SINGLE VENDOR SYNC
// =====================================================
window.syncSingleVendor = async function (id) {
  if (!navigator.onLine) return;

  console.log("SYNC SINGLE VENDOR:", id);

  const db = await openVendorDB();

  const vendor = await new Promise(resolve => {
    const tx = db.transaction("vendors", "readonly");
    const store = tx.objectStore("vendors");
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
  });

  if (!vendor) return;

  const { error } = await supabaseClient
    .from("vendors")
    .upsert({
      user_id: USER_ID,
      local_id: vendor.id,
      company: vendor.company,
      address: vendor.address,
      phone: vendor.phone,
      email: vendor.email,
      item: vendor.item,
      image: vendor.image,
      comment: vendor.comment,
      purchase_date: vendor.purchaseDate,
      due: vendor.due,
      total: vendor.total,
      deleted: false,
      last_updated: vendor.last_updated || new Date().toISOString()
    }, {
      onConflict: "user_id,local_id"
    });

  if (!error) {
    console.log("Single Vendor Synced:", id);
  } else {
    console.log(error);
  }
};