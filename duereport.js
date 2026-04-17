/* =========================
   DOM REFERENCES
========================= */
const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

const reportBody = document.getElementById("reportBody");
const dueCards = document.getElementById("dueCards");
const reportDate = document.getElementById("reportDate");
const reportMonth = document.getElementById("reportMonth");

const searchCustomer = document.getElementById("searchCustomer");
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

let db;
let totalDue = 0;


const dbName = "POS_DB" + USER_ID;
const req = indexedDB.open(dbName, GLOBAL_DB_VERSION);

req.onsuccess = e => {
  db = e.target.result;
  loadAllDues();
};

req.onerror = () => alert("Failed to open database");

/* =========================
   LOAD ALL PENDING DUES
========================= */
function loadAllDues(filterFn = null) {
  reportBody.innerHTML = "";
  dueCards.innerHTML = "";
  totalDue = 0;

  const tx = db.transaction("sales", "readonly");
  const store = tx.objectStore("sales");
  const req = store.openCursor();

  let index = 1;

  req.onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) {
      if (totalDue > 0) appendTotalDueRow();
      return;
    }

    const sale = cursor.value;
    const payments = sale.partialPayments || [];
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const remainingDue = sale.grandTotal - totalPaid;

    if (remainingDue > 0 && (!filterFn || filterFn(sale))) {
      totalDue += remainingDue;
      renderTableRow(index++, sale, totalPaid, remainingDue);
      renderMobileCard(sale, totalPaid, remainingDue);
    }

    cursor.continue();
  };
}

/* =========================
   RENDER TABLE ROW
========================= */
function renderTableRow(i, sale, paid, due) {
  const payments = sale.partialPayments || [];
  const paymentHTML = payments.length > 0
    ? payments.map(p => `৳${p.amount} (${new Date(p.date).toLocaleDateString()})`).join("<br>")
    : "—";

   

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${i}</td>
    <td>${sale.billID}</td>
    <td>${formatDate(sale.date)}<br>${sale.time}</td>
   <td>
      Cus. N.: ${sale.customerName || ""}<br>
      Pho.: ${sale.customerPhone || ""}<br>
      Cashier: ${sale.cashierName || ""}
    </td>
    <td>${paymentHTML}</td>
    <td>৳ ${sale.grandTotal.toFixed(2)}</td>
    <td>৳ ${paid.toFixed(2)}</td>
    <td>৳ ${due.toFixed(2)}</td>
    
    <td>
  <button 
    style="background-color: #2563eb; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;" 
    onclick="openDue('${sale.billID}')">
    Receive
  </button>
</td>
  `;
  reportBody.appendChild(tr);
}

/* =========================
   RENDER MOBILE CARD
========================= */
function renderMobileCard(sale, paid, due) {
  const payments = sale.partialPayments || [];
  const paymentText = payments.length > 0
    ? payments.map(p => `৳${p.amount} (${new Date(p.date).toLocaleDateString()})`).join(", ")
    : "No payments";

  const div = document.createElement("div");
  div.className = "due-card";
  div.innerHTML = `
    <h4>Bill ID: ${sale.billID}</h4>
    <p>Date: ${formatDate(sale.date)}</p>
    <p>Customer: ${sale.customerName || "Walk-in"}</p>
    <p>Grand Total: ৳ ${sale.grandTotal.toFixed(2)}</p>
    <p>Paid: ৳ ${paid.toFixed(2)}</p>
    <p>Due: ৳ ${due.toFixed(2)}</p>
    <p><strong>Payments:</strong> ${paymentText}</p>
    <button onclick="openDue('${sale.billID}')">Receive Payment</button>
  `;
  dueCards.appendChild(div);
}

/* =========================
   HELPERS
========================= */
function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString();
}

function openDue(billID) {
  localStorage.setItem("DUE_BILL_ID", billID);
  window.location.href = "due.html";
}

/* =========================
   FILTERS
========================= */
function generateDailyReport() {
  const date = reportDate.value;
  if (!date) return alert("Select a date");
  loadAllDues(sale => sale.date?.startsWith(date));
}

function generateMonthlyReport() {
  const month = reportMonth.value;
  if (!month) return alert("Select a month");
  loadAllDues(sale => sale.date?.startsWith(month));
}

/* =========================
   TOTAL DUE ROW
========================= */
function appendTotalDueRow() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td colspan="7"><strong>TOTAL DUE</strong></td>
    <td>৳ ${totalDue.toFixed(2)}</td>
    <td colspan="1"></td>
  `;
  tr.style.background = "#f1f5f9";
  reportBody.appendChild(tr);
}

/* =========================
   AUTO LOAD + FOCUS
========================= */
window.addEventListener("load", loadAllDues);
window.addEventListener("focus", loadAllDues);

/* =========================
   EXPORT (Placeholder)
========================= */
function exportPDF() {
    const table = reportBody.closest("table");
    const html = table.outerHTML;

    // ✅ Get current date & time
    const now = new Date();
    const printDate = now.toLocaleDateString(); // e.g., 21/02/2026
    const printTime = now.toLocaleTimeString(); // e.g., 14:35:12

    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`
        <html>
        <head><title>Due Report</title></head>
        <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; }
            </style>
        <body>
            <h2 class="center">${SHOP_NAME}</h2>
<div class="center">${SHOP_ADDRESS}</div>
<div class="center">Phone: ${SHOP_PHONE}</div>
              <hr>
            <div><strong>Print Date:</strong> ${printDate}</div>
            <div><strong>Print Time:</strong> ${printTime}</div>
            <hr>
            ${html}
        </body>
        </html>
    `);
    win.document.close();
    win.print();
}

/* =========================
   SEARCH CUSTOMER
========================= */

searchCustomer.addEventListener("input", () => {

  const keyword = searchCustomer.value.toLowerCase();

  loadAllDues(sale => {

    const name = (sale.customerName || "").toLowerCase();
    const phone = (sale.customerPhone || "").toLowerCase();

    return name.includes(keyword) || phone.includes(keyword);

  });

});