// =====================================================
// REFUND SYNC SYSTEM (CLEAN + CONFLICT SAFE)
// =====================================================

console.log("REFUND SYNC LOADED");

// ---------------------------------
// OPEN DB
// ---------------------------------
function openRefundDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("REFUND_DB" + USER_ID);

    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

// ---------------------------------
// GET ALL LOCAL REFUNDS
// ---------------------------------
async function getLocalRefunds() {
  const db = await openRefundDB();

  return new Promise(resolve => {
    const tx = db.transaction("refunds", "readonly");
    const store = tx.objectStore("refunds");

    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

// ---------------------------------
// GROUP REFUNDS BY BILLER ID
// ---------------------------------
function groupRefunds(data) {
  const grouped = {};

  data.forEach(r => {
    const key = r.billerID;

    if (!grouped[key]) {
      grouped[key] = {
        user_id: USER_ID,
        billerid: r.billerID,
        refunddate: r.refundDate,
        refundtime: r.refundTime,
        month: r.month,
        reason: r.reason,
        method: r.method,
        totalrefund: 0,
        itemname: [],
        last_updated: r.last_updated || new Date().toISOString()
      };
    }

    grouped[key].itemname.push({
      itemName: r.itemName,
      qty: r.qty,
      refundQty: r.refundQty,
      price: r.price,
      totalRefund: r.totalRefund
    });

    grouped[key].totalrefund += Number(r.totalRefund || 0);

    // keep latest timestamp
    if (new Date(r.last_updated || 0) > new Date(grouped[key].last_updated)) {
      grouped[key].last_updated = r.last_updated;
    }
  });

  return Object.values(grouped);
}

// =====================================================
// STEP 1: PUSH LOCAL → CLOUD (ALL)
// =====================================================
window.syncRefunds = async function () {
  if (!navigator.onLine) return;

  console.log("REFUND SYNC START");

  const local = await getLocalRefunds();
  const grouped = groupRefunds(local);

  for (const r of grouped) {

    const { data: cloud } = await supabaseClient
      .from("refunds")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("billerid", r.billerid)
      .single();

    // skip if cloud is newer
    if (
      cloud &&
      cloud.last_updated &&
      new Date(cloud.last_updated) > new Date(r.last_updated)
    ) {
      continue;
    }

    const { error } = await supabaseClient
      .from("refunds")
      .upsert({
        user_id: USER_ID,
        billerid: r.billerid,
        refunddate: r.refunddate,
        refundtime: r.refundtime,
        month: r.month,
        reason: r.reason,
        method: r.method,
        itemname: r.itemname,
        totalrefund: r.totalrefund,
        deleted: false,
        last_updated: r.last_updated || new Date().toISOString()
      }, {
        onConflict: "user_id,billerid"
      });

    if (!error) {
      console.log("Refund synced:", r.billerid);
    } else {
      console.log(error);
    }
  }

  console.log("REFUND SYNC DONE");
};

// =====================================================
// STEP 2: SINGLE REFUND SYNC (USED IN refund.js)
// =====================================================
/* window.syncSingleRefund = async function (refundObj) {
  if (!navigator.onLine) return;

  console.log("SYNC SINGLE REFUND:", refundObj.billerID);

  // get existing cloud record
  const { data: cloud } = await supabaseClient
    .from("refunds")
    .select("*")
    .eq("user_id", USER_ID)
    .eq("billerid", refundObj.billerID)
    .single();

  let itemname = [];

  const newItem = {
    itemName: refundObj.itemName,
    qty: refundObj.qty,
    refundQty: refundObj.refundQty,
    price: refundObj.price,
    totalRefund: refundObj.totalRefund
  };

  if (cloud && cloud.itemname) {
    itemname = Array.isArray(cloud.itemname)
      ? cloud.itemname
      : [];
  }

  itemname.push(newItem);

  const totalrefund = itemname.reduce((sum, i) => sum + Number(i.totalRefund || 0), 0);

  const { error } = await supabaseClient
    .from("refunds")
    .upsert({
      user_id: USER_ID,
      billerid: refundObj.billerID,
      refunddate: refundObj.refundDate,
      refundtime: refundObj.refundTime,
      month: refundObj.month,
      reason: refundObj.reason,
      method: refundObj.method,
      itemname,
      totalrefund,
      deleted: false,
      last_updated: new Date().toISOString()
    }, {
      onConflict: "user_id,billerid"
    });

  if (!error) {
    console.log("Single Refund Synced:", refundObj.billerID);
  } else {
    console.log(error);
  }
}; */
window.syncSingleRefund = async function (refundObj) {
  if (!navigator.onLine) return;

  const billerid = refundObj.billerID; // IMPORTANT FIX

  console.log("SYNC SINGLE REFUND:", billerid);

  const { data: cloud } = await supabaseClient
    .from("refunds")
    .select("*")
    .eq("user_id", USER_ID)
    .eq("billerid", billerid)
    .single();

  let itemname = [];

  if (cloud && cloud.itemname) {
    itemname = Array.isArray(cloud.itemname) ? cloud.itemname : [];
  }

  itemname.push({
    itemName: refundObj.itemName,
    qty: refundObj.qty,
    refundQty: refundObj.refundQty,
    price: refundObj.price,
    totalRefund: refundObj.totalRefund
  });

  const totalrefund = itemname.reduce(
    (sum, i) => sum + Number(i.totalRefund || 0),
    0
  );

  const { error } = await supabaseClient
    .from("refunds")
    .upsert({
      user_id: USER_ID,
      billerid: billerid,
      refunddate: refundObj.refundDate,
      refundtime: refundObj.refundTime,
      month: refundObj.month,
      reason: refundObj.reason,
      method: refundObj.method,
      itemname,
      totalrefund,
      deleted: false,
      last_updated: new Date().toISOString()
    }, {
      onConflict: "user_id,billerid"
    });

  if (!error) {
    console.log("Single Refund Synced:", billerid);
  } else {
    console.log(error);
  }
};
// =====================================================
// STEP 3: CLOUD → LOCAL RESTORE
// =====================================================
window.restoreRefunds = async function () {
  if (!navigator.onLine) return;

  console.log("REFUND RESTORE START");

  const { data, error } = await supabaseClient
    .from("refunds")
    .select("*")
    .eq("user_id", USER_ID);

  if (error) {
    console.log(error);
    return;
  }

  const db = await openRefundDB();

  const tx = db.transaction("refunds", "readwrite");
  const store = tx.objectStore("refunds");

  for (const row of data) {

    // skip deleted (future-proof)
    if (row.deleted === true) continue;

    const existing = await new Promise(resolve => {
      const req = store.getAll();
      req.onsuccess = () => {
        const found = req.result.find(r => r.billerID === row.billerid);
        resolve(found);
      };
    });

    // if cloud newer → replace local
    if (
      !existing ||
      new Date(row.last_updated) > new Date(existing.last_updated || 0)
    ) {
      // remove old local entries for same billerID first
      const all = await new Promise(resolve => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
      });

      for (const r of all) {
        if (r.billerID === row.billerid) {
          store.delete(r.id);
        }
      }

      // restore each item from JSONB
      if (Array.isArray(row.itemname)) {
        row.itemname.forEach(item => {
          store.add({
            billerID: row.billerid,
            refundDate: row.refunddate,
            refundTime: row.refundtime,
            month: row.month,
            reason: row.reason,
            method: row.method,
            itemName: item.itemName,
            qty: item.qty,
            refundQty: item.refundQty,
            price: item.price,
            totalRefund: item.totalRefund,
            last_updated: row.last_updated
          });
        });
      }
    }
  }

  console.log("REFUND RESTORE DONE");
};