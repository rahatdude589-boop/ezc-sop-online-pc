// =====================================================
// SALES SYNC SYSTEM (CLEAN + CONFLICT SAFE)
// =====================================================

console.log("SALES SYNC LOADED");

// ---------------------------------
// OPEN DB
// ---------------------------------
function openSalesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("POS_DB" + USER_ID);

    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

// ---------------------------------
// GET ALL LOCAL SALES
// ---------------------------------
async function getLocalSales() {
  const db = await openSalesDB();

  return new Promise(resolve => {
    const tx = db.transaction("sales", "readonly");
    const store = tx.objectStore("sales");

    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
  });
}

// ---------------------------------
// SAVE LOCAL SALE (RESTORE)
// ---------------------------------
/*async function saveLocalSale(sale) {
  const db = await openSalesDB();

  return new Promise(resolve => {
    const tx = db.transaction("sales", "readwrite");
    tx.objectStore("sales").put(sale);
    tx.oncomplete = () => resolve();
  });
}  */
async function saveLocalSale(sale) {
  const db = await openSalesDB();

  return new Promise(resolve => {
    const tx = db.transaction("sales", "readwrite");
    const store = tx.objectStore("sales");

    // FORCE CLEAN OVERWRITE
    const clean = {
      ...sale,
      billID: sale.billID, // MUST BE SAME KEY ALWAYS
    };

    store.put(clean);

    tx.oncomplete = () => resolve();
  });
}

// ---------------------------------
// REMOVE LOCAL SALE (optional cloud delete handling later)
// ---------------------------------
async function removeLocalSale(billID) {
  const db = await openSalesDB();

  return new Promise(resolve => {
    const tx = db.transaction("sales", "readwrite");
    tx.objectStore("sales").delete(billID);
    tx.oncomplete = () => resolve();
  });
}

// =====================================================
// STEP 1: LOCAL -> CLOUD (UPLOAD SALES)
// =====================================================
window.syncSales = async function () {
  if (!navigator.onLine) return;

  console.log("SALES UPLOAD START");

  const sales = await getLocalSales();

  for (const s of sales) {
    const { data: cloud } = await supabaseClient
      .from("sales")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("bill_id", s.billID)
      .maybeSingle();

    // conflict rule: cloud newer → skip
    if (
      cloud &&
      cloud.last_updated &&
      s.last_updated &&
      new Date(cloud.last_updated) > new Date(s.last_updated)
    ) {
      continue;
    }

    const { error } = await supabaseClient
      .from("sales")
      .upsert({
        user_id: USER_ID,
        bill_id: s.billID,
        date: s.date,
        time: s.time,
        items: s.items,
        subtotal: s.subtotal,
        discount: s.discount,
        vat: s.vat,
        grand_total: s.grandTotal,
        paid: s.paid,
        due: s.due,
        customer_name: s.customerName,
        customer_phone: s.customerPhone,
        cashier_name: s.cashierName,
        comment: s.comment || "",
        partial_payments: s.partialPayments || [],
        last_updated: s.last_updated || new Date().toISOString()
      }, {
        onConflict: "user_id,bill_id"
      });

    if (!error) {
      console.log("SALE UPLOADED:", s.billID);
    }
  }

  console.log("SALES UPLOAD DONE");
};

// =====================================================
// STEP 2: CLOUD -> LOCAL RESTORE
// =====================================================
window.restoreSales = async function () {
  if (!navigator.onLine) return;

  console.log("SALES RESTORE START");

  const { data, error } = await supabaseClient
    .from("sales")
    .select("*")
    .eq("user_id", USER_ID);

  if (error) {
    console.log(error);
    return;
  }

 /* for (const row of data) {
    const localSales = await getLocalSales();
    const local = localSales.find(x => x.billID === row.bill_id);

    // local newer → keep local
    if (
      local &&
      local.last_updated &&
      row.last_updated &&
      new Date(local.last_updated) > new Date(row.last_updated)
    ) {
      continue;
    }

    // cloud → local
    await saveLocalSale({
      billID: row.bill_id,
      date: row.date,
      time: row.time,
      items: row.items || [],
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      vat: Number(row.vat || 0),
      grandTotal: Number(row.grand_total || 0),
      paid: Number(row.paid || 0),
      due: Number(row.due || 0),
      customerName: row.customer_name || "",
      customerPhone: row.customer_phone || "",
      cashierName: row.cashier_name || "",
      comment: row.comment || "",
      partialPayments: row.partial_payments || [],
      last_updated: row.last_updated
    });
  }  */
const localSales = await getLocalSales();
for (const row of data) {

  const exists = localSales.find(x => x.billID === row.bill_id);

  // 🔴 IF ALREADY EXISTS → SKIP (DO NOTHING)
  if (exists) continue;

  // 🟢 ONLY ADD NEW ONES
  await saveLocalSale({
    billID: row.bill_id,
    date: row.date,
    time: row.time,
    items: row.items || [],
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    vat: Number(row.vat || 0),
    grandTotal: Number(row.grand_total || 0),
    paid: Number(row.paid || 0),
    due: Number(row.due || 0),
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    cashierName: row.cashier_name || "",
    comment: row.comment || "",
    partialPayments: row.partial_payments || [],
    last_updated: row.last_updated
  });
}

  console.log("SALES RESTORE DONE");
};

// =====================================================
// STEP 3: SINGLE SALE SYNC (OPTIONAL)
// =====================================================
window.syncSingleSale = async function (billID) {
  if (!navigator.onLine) return;

  const db = await openSalesDB();

  const sale = await new Promise(resolve => {
    const tx = db.transaction("sales", "readonly");
    const store = tx.objectStore("sales");
    const req = store.get(billID);

    req.onsuccess = () => resolve(req.result);
  });

  if (!sale) return;

  const { error } = await supabaseClient
    .from("sales")
    .upsert({
      user_id: USER_ID,
      bill_id: sale.billID,
      date: sale.date,
      time: sale.time,
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      vat: sale.vat,
      grand_total: sale.grandTotal,
      paid: sale.paid,
      due: sale.due,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone,
      cashier_name: sale.cashierName,
      comment: sale.comment || "",
      partial_payments: sale.partialPayments || [],
      last_updated: sale.last_updated || new Date().toISOString()
    }, {
      onConflict: "user_id,bill_id"
    });

  if (!error) {
    console.log("SINGLE SALE SYNCED:", billID);
  }
};