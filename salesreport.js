const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

let db;

const dbName = "POS_DB" + USER_ID;
const req = indexedDB.open(dbName, GLOBAL_DB_VERSION);

req.onupgradeneeded = e => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("products")) {
    db.createObjectStore("products", { keyPath: "code" });
  }

  if (!db.objectStoreNames.contains("sales")) {
    db.createObjectStore("sales", { autoIncrement: true });
  if (!db.objectStoreNames.contains("sales")) db.createObjectStore("sales", { keyPath: "billID" });
  }
};

req.onsuccess = e => {
  db = e.target.result;
};

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

function store(name, mode = "readonly") {
  return db.transaction(name, mode).objectStore(name);
}

function getAllSales(callback) {
  const sales = [];
  store("sales").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      sales.push(cursor.value);
      cursor.continue();
    } else {
      callback(sales);
    }
  };
}

const reportBody = document.getElementById("reportBody");
const reportDate = document.getElementById("reportDate");
const reportMonth = document.getElementById("reportMonth");


function generateDailyReport() {
  const date = reportDate.value;
  if (!date) return alert("Select a date");

  getAllSales(sales => {
    const dailySales = sales.filter(s => s.date === date);
    renderReportTable(dailySales);
  });
}

function generateMonthlyReport() {
  const month = reportMonth.value;
  if (!month) return alert("Select a month");

  getAllSales(sales => {
    const monthlySales = sales.filter(s => s.date.startsWith(month));
    renderReportTable(monthlySales);
  });
}

function renderReportTable(sales) {
  reportBody.innerHTML = "";

  if (!sales.length) {
    reportBody.innerHTML = `<tr><td colspan="11">No sales found</td></tr>`; // 11 columns now
    return;
  }

  let totalItems = 0;      
  let totalSubtotal = 0;
  //let totalGST = 0;
  let totalVAT = 0;
  let totalDiscount = 0;
  let totalGrand = 0;
  let totalPaid = 0;
  let totalDue = 0;

  sales.forEach((s, i) => {
    const itemCount = s.items.reduce((sum, it) => sum + Number(it.qty), 0);

    totalItems += itemCount;
    totalSubtotal += Number(s.subtotal);
    //totalGST += Number(s.gst);
    totalVAT += Number(s.vat);
    totalDiscount += Number(s.discount);
    totalGrand += Number(s.grandTotal);
    totalPaid += Number(s.paid);
    totalDue += Number(s.due);

    const itemsText = s.items
      .map(item => `${item.name}(${item.qty}${item.unit ? " " + item.unit : ""})`)
      .join(", ");


         // ✅ Added Customer Details and Cashier
    const customerDetails = `
      Cus.N.:${s.customerName || "N/A"}<br>
      Pho.:${s.customerPhone || "N/A"}<br>
      Cashie:${s.cashierName || "N/A"}
    `;

    reportBody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${s.billID || "N/A"}</strong><br>
          ${s.date}<br>
           
      <button class="print-btn" onclick="printSingleSale('${s.billID}')">
        Print
      </button>
    

        </td>
        <td>${customerDetails}</td>
        <td>${s.time}</td>
        <td>${itemsText}</td>
        <td>${Number(s.subtotal).toFixed(2)}</td>
        
        <td>${Number(s.vat).toFixed(2)}</td>
        <td>${Number(s.discount).toFixed(2)}</td>
        <td>${Number(s.grandTotal).toFixed(2)}</td>
        <td>${Number(s.paid).toFixed(2)}</td>
        <td>${Number(s.due).toFixed(2)}</td>
      </tr>
    `;
  });

  // TOTAL ROW
  reportBody.innerHTML += `
    <tr style="font-weight:bold; background:#f2f2f2;">
      <td colspan="5">TOTAL (Items: ${totalItems})</td>
      <td>৳ ${totalSubtotal.toFixed(2)}</td>
     
      <td>৳ ${totalVAT.toFixed(2)}</td>
      <td>৳ ${totalDiscount.toFixed(2)}</td>
      <td>৳ ${totalGrand.toFixed(2)}</td>
      <td>৳ ${totalPaid.toFixed(2)}</td>
      <td>৳ ${totalDue.toFixed(2)}</td>
    </tr>
  `;
}

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
        <head>
            <title>Sales Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; font-size: 12px; }
            </style>
        </head>
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

window.addEventListener("load", async function () {
  await restoreSales();  // cloud → local
  syncSales();           // local → cloud
}); 
function printSingleSale(billID) {
  getAllSales(sales => {
    const sale = sales.find(s => s.billID === billID);
    if (!sale) return alert("Sale not found");

    let rows = "";
    let subtotal = 0;

    sale.items.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;

      rows += `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}${i.unit || ""}</td>
          <td>৳ ${i.price.toFixed(2)}</td>
          <td>৳ ${line.toFixed(2)}</td>
        </tr>
      `;
    });

    const vatAmt = Number(sale.vat || 0);
    const discount = Number(sale.discount || 0);
    const grandTotal = Number(sale.grandTotal || 0);
    const paid = Number(sale.paid || 0);
    const due = Number(sale.due || 0);

    const win = window.open("", "_blank", "width=400,height=650");

    win.document.write(`
      <html>
      <head>
        <title>Sale Receipt</title>
        <style>
          body { font-family: monospace; padding: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #ddd; padding: 4px; text-align:left; }
          .center { text-align:center; }
          hr { border: none; border-top: 1px dashed #000; }
        </style>
      </head>
      <body>
        <h2 class="center">SALES</h2>
        <h2 class="center">${SHOP_NAME}</h2>
        <div class="center">${SHOP_ADDRESS}</div>
        <div class="center">Phone: ${SHOP_PHONE}</div>

        <hr>

        <div><b>Bill ID:</b> ${sale.billID}</div>
        <div><b>Date:</b> ${sale.date}</div>
        <div><b>Time:</b> ${sale.time}</div>

        <div><b>Customer:</b> ${sale.customerName || "N/A"}</div>
        <div><b>Phone:</b> ${sale.customerPhone || "N/A"}</div>
        <div><b>Cashier:</b> ${sale.cashierName || "N/A"}</div>

        <hr>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <hr>

        <div>Subtotal: ৳ ${subtotal.toFixed(2)}</div>
        <div>VAT: ৳ ${vatAmt.toFixed(2)}</div>
        <div>Discount: ৳ ${discount.toFixed(2)}</div>
        <div><b>Grand Total: ৳ ${grandTotal.toFixed(2)}</b></div>
        <div>Paid: ৳ ${paid.toFixed(2)}</div>
        <div>Due: ৳ ${due.toFixed(2)}</div>

        <hr>

        <div class="center">
          <svg id="barcode"></svg>
        </div>

        <div class="center">Bill ID: ${sale.billID}</div>

        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <script>
          JsBarcode("#barcode", "${sale.billID}", {
            format: "CODE128",
            width: 2,
            height: 50,
            displayValue: false
          });
        </script>

      </body>
      </html>
    `);

    win.document.close();
    win.print();
  });
}