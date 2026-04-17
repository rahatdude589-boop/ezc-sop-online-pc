// =======================
// STOCK HISTORY DB SETUP
// =======================
const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

let historyDb;
const historyReq = indexedDB.open("STOCK_HISTORY_DB"+ USER_ID, GLOBAL_DB_VERSION);

historyReq.onupgradeneeded = e => {
  historyDb = e.target.result;
  if (!historyDb.objectStoreNames.contains("history")) {
    const store = historyDb.createObjectStore("history", { keyPath: "id", autoIncrement: true });
    store.createIndex("date", "date", { unique: false });
    store.createIndex("code", "code", { unique: false });
  }
};

historyReq.onsuccess = e => {
  historyDb = e.target.result;
   // ✅ Load data only after DB is ready
  loadStockHistory();
};

// =======================
// DOM REFERENCES
// =======================
const stockHistoryBtn = document.getElementById("stockHistoryBtn");
const stockHistoryModal = document.getElementById("stockHistoryModal");
const closeStockHistoryModal = document.getElementById("closeStockHistoryModal");
const stockHistoryTableBody = document.querySelector("#stockHistoryTable tbody");
const downloadStockHistoryPDF = document.getElementById("downloadStockHistoryPDF");

const dailyHistoryBtn = document.getElementById("dailyHistoryBtn");
const monthlyHistoryBtn = document.getElementById("monthlyHistoryBtn");




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
function getDateTime() {
  return new Date().toLocaleString();
}

// =======================
// FETCH & DISPLAY HISTORY
// =======================
function loadStockHistory() {
  stockHistoryTableBody.innerHTML = "";
  if (!historyDb) return;

  const tx = historyDb.transaction("history", "readonly");
  const store = tx.objectStore("history");

  // Open cursor in reverse order (latest first)
  store.openCursor(null, "prev").onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) return;

    const h = cursor.value;
    const color = h.action === "added" ? "green" : h.action === "removed" ? "red" : "blue";

    stockHistoryTableBody.innerHTML += `
      <tr>
        <td>${h.date}</td>
        <td>${h.code}</td>
        <td>${h.name}</td>
        <td style="color:${color}">${h.quantityChange}</td>
        <td>${h.currentStock}</td>
        <td>${h.action}</td>
      </tr>
    `;

    cursor.continue();
  };
}
function loadDailyHistory() {
  const selectedDate = document.getElementById("historyDate").value;
  if (!selectedDate) return alert("Select a date");

  stockHistoryTableBody.innerHTML = "";

  const tx = historyDb.transaction("history", "readonly");
  const store = tx.objectStore("history");

  store.openCursor(null, "prev").onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) return;

    const h = cursor.value;

    if (h.date === selectedDate) {
      const color = h.action === "added" ? "green" : "red";

      stockHistoryTableBody.innerHTML += `
        <tr>
          <td>${h.date}</td>
          
          <td>${h.code}</td>
          <td>${h.name}</td>
          <td style="color:${color}">${h.quantityChange}</td>
          <td>${h.currentStock}</td>
          <td>${h.action}</td>
        </tr>
      `;
    }

    cursor.continue();
  };
}
function loadMonthlyHistory() {
  const selectedMonth = document.getElementById("historyMonth").value;
  if (!selectedMonth) return alert("Select a month");

  stockHistoryTableBody.innerHTML = "";

  const tx = historyDb.transaction("history", "readonly");
  const store = tx.objectStore("history");

  store.openCursor(null, "prev").onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) return;

    const h = cursor.value;

    if (h.date.startsWith(selectedMonth)) {
      const color = h.action === "added" ? "green" : "red";

      stockHistoryTableBody.innerHTML += `
        <tr>
          <td>${h.date}</td>
          
          <td>${h.code}</td>
          <td>${h.name}</td>
          <td style="color:${color}">${h.quantityChange}</td>
          <td>${h.currentStock}</td>
          <td>${h.action}</td>
        </tr>
      `;
    }

    cursor.continue();
  };
}


// =======================
// DOWNLOAD PDF
// =======================
downloadStockHistoryPDF.addEventListener("click", () => {
  if (!historyDb) return;

  const rows = [];
  const tx = historyDb.transaction("history", "readonly");
  const store = tx.objectStore("history");

  store.openCursor(null, "prev").onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const h = cursor.value;
      rows.push({
        Date: h.date,
        Code: h.code,
        Name: h.name,
        "Qty Change": h.quantityChange,
        "Current Stock": h.currentStock,
        Action: h.action
      });
      cursor.continue();
    } else {
      if (!rows.length) return alert("No stock history to download.");

      const doc = new jspdf.jsPDF();
      doc.setFontSize(16);
      doc.text(SHOP_NAME, 14, 15);
      doc.setFontSize(10);
      doc.text(SHOP_ADDRESS, 14, 22);
      doc.text(SHOP_PHONE, 14, 27);
      doc.text(`Generated: ${getDateTime()}`, 14, 32);

      const headers = Object.keys(rows[0]);
      const data = rows.map(r => Object.values(r));

      doc.autoTable({
        startY: 38,
        head: [headers],
        body: data,
        styles: { cellWidth: "wrap" },
      });

      doc.save("stock_history.pdf");
    }
  };
});


dailyHistoryBtn.addEventListener("click", loadDailyHistory);
monthlyHistoryBtn.addEventListener("click", loadMonthlyHistory);

