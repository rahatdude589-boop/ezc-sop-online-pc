/* =========================
   DOM REFERENCES
========================= */
const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

const billIDInput = document.getElementById("due-billID");
const fetchBtn = document.getElementById("due-fetchBtn");
const detailsDiv = document.getElementById("due-details");
const grandSpan = document.getElementById("due-grand");
const paidSpan = document.getElementById("due-paid");
const remainingSpan = document.getElementById("due-remaining");
const amountInput = document.getElementById("due-amount");
const receiveBtn = document.getElementById("due-receiveBtn");
const paymentHistoryList = document.getElementById("due-paymentHistory");
const printBtn = document.getElementById("due-printBtn");
const dueReportBtn = document.getElementById("dueReportBtn");
/* =======================
   SHOP INFO FROM LOCALSTORAGE
======================= */
const shopNameInput = document.getElementById("shopNameInput");
const shopAddressInput = document.getElementById("shopAddressInput");
const shopPhoneInput = document.getElementById("shopPhoneInput");

// Load saved shop info or fallback defaults
let SHOP_NAME = localStorage.getItem("SHOP_NAME") || "Your Shop Name";
let SHOP_ADDRESS = localStorage.getItem("SHOP_ADDRESS") || "Your Shop Address";
let SHOP_PHONE = localStorage.getItem("SHOP_PHONE") || "01XXXXXXXXX";

// Initialize input fields if they exist on this page
if (shopNameInput) shopNameInput.value = SHOP_NAME;
if (shopAddressInput) shopAddressInput.value = SHOP_ADDRESS;
if (shopPhoneInput) shopPhoneInput.value = SHOP_PHONE;
/* =========================
   CONNECT TO INDEXEDDB
========================= */
let db;
let currentSale = null;

const dbName = "POS_DB" + USER_ID;
const req = indexedDB.open(dbName, GLOBAL_DB_VERSION);

req.onupgradeneeded = e => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "code" });
if (!db.objectStoreNames.contains("sales")) db.createObjectStore("sales", { keyPath: "billID" });

};

req.onsuccess = e => {
  db = e.target.result;
  console.log("POS_DB+ USER_ID, GLOBAL_DB_VERSION ready in due panel");
};

req.onerror = e => {
  console.error("Error opening POS_DB+ USER_ID, GLOBAL_DB_VERSION:", e);
  alert("Database connection failed!");
};

/* =========================
   FETCH DUE DETAILS
========================= */
fetchBtn.addEventListener("click", () => {
  const billID = billIDInput.value.trim();
  if (!billID) return alert("Enter Bill ID");

  const tx = db.transaction("sales", "readonly");
  const store = tx.objectStore("sales");
  const request = store.openCursor();

  currentSale = null;

  request.onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) {
      if (!currentSale) alert("Bill not found");
      return;
    }

    const sale = cursor.value;
    if (sale.billID === billID) {
      currentSale = sale;
      currentSale._id = cursor.primaryKey; // <-- Save original autoIncrement key
      if (!Array.isArray(currentSale.partialPayments)) {
        currentSale.partialPayments = [];
      }

      showDueDetails();
      return;
    }

    cursor.continue();
  };
});

/* =========================
   SHOW DUE DETAILS
========================= */
function showDueDetails() {
  if (!currentSale) return;

  const payments = currentSale.partialPayments || [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = Math.max(0, currentSale.grandTotal - totalPaid);

  grandSpan.innerText = currentSale.grandTotal.toFixed(2);
  paidSpan.innerText = totalPaid.toFixed(2);
  remainingSpan.innerText = remainingDue.toFixed(2);

  // Show payment history (latest first)
  paymentHistoryList.innerHTML = "";
  [...payments].reverse().forEach(p => {
    const li = document.createElement("li");
    li.innerText = `৳ ${p.amount.toFixed(2)} → ${new Date(p.date).toLocaleString()}`;
    paymentHistoryList.appendChild(li);
  });

  detailsDiv.style.display = "block";

  // Auto-refresh Due Report page if open
  if (localStorage.getItem("DUE_REPORT_REFRESH") === "1") {
    if (window.opener && typeof window.opener.loadAllDues === "function") {
      window.opener.loadAllDues();
    }
    localStorage.removeItem("DUE_REPORT_REFRESH");
  }
}



receiveBtn.addEventListener("click", () => {
  if (!currentSale) return alert("Fetch a valid bill first");

  const amount = Number(amountInput.value);
  if (!amount || amount <= 0) return alert("Enter valid amount");

  const totalPaidSoFar = currentSale.partialPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = Math.max(0, currentSale.grandTotal - totalPaidSoFar);

  if (amount > remainingDue) return alert("Amount exceeds remaining due");

  // ✅ CONFIRM BEFORE SAVE
  const confirmPayment = confirm(`Receive ৳ ${amount.toFixed(2)} ?`);

  if (!confirmPayment) {
    // ❌ User clicked Cancel
    return;
  }

  // ✅ If confirmed, then save
  currentSale.partialPayments.push({
    amount,
    date: new Date().toISOString()
  });

  const tx = db.transaction("sales", "readwrite");
  const store = tx.objectStore("sales");
  store.put(currentSale, currentSale._id);

  tx.oncomplete = () => {
    showDueDetails();
    amountInput.value = "";
    localStorage.setItem("DUE_REPORT_REFRESH", "1");
    alert(`Received ৳ ${amount.toFixed(2)} successfully!`);
  };
});


/* =========================
   PRINT DUE RECEIPT
========================= */
printBtn.addEventListener("click", () => {
  if (!currentSale) return alert("Fetch a valid bill first");

  const totalPaid = currentSale.partialPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = Math.max(0, currentSale.grandTotal - totalPaid);

  const win = window.open("", "_blank", "width=400,height=600");

  let rows = "";
  currentSale.partialPayments.forEach(p => {
    rows += `<tr><td>৳ ${p.amount.toFixed(2)}</td><td>${new Date(p.date).toLocaleString()}</td></tr>`;
  });

  win.document.write(`
    <html>
      <head>
        <title>Due Receipt</title>
        <style>
          body { font-family: monospace; padding:10px; }
          table { width:100%; border-collapse: collapse; margin-top:10px; }
          th, td { text-align:left; padding:4px; border-bottom:1px dashed #000; }
          h2, p { margin:2px 0; }
        </style>
      </head>
      <body>
         <h2 class="center">${SHOP_NAME}</h2>
<div class="center">${SHOP_ADDRESS}</div>
<div class="center">Phone: ${SHOP_PHONE}</div>
        <p>Bill ID: ${currentSale.billID}</p>
        <p>Grand Total: ৳ ${currentSale.grandTotal.toFixed(2)}</p>
        <p>Total Paid: ৳ ${totalPaid.toFixed(2)}</p>
        <p>Remaining Due: ৳ ${remainingDue.toFixed(2)}</p>
        <hr>
        <h3>Partial Payment History</h3>
        <table>
          <tr><th>Amount</th><th>Date</th></tr>
          ${rows}
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.print();
});

dueReportBtn.addEventListener("click", () => {
  window.location.href = "duereport.html";
});

/* =========================
   AUTO FILL SAVED BILL
========================= */
const savedBill = localStorage.getItem("DUE_BILL_ID");
if (savedBill) {
  billIDInput.value = savedBill;
  localStorage.removeItem("DUE_BILL_ID");
  fetchBtn.click();
}
