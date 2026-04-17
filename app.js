/* =======================
   DOM REFERENCES
======================= */
//import { syncProducts } from "./syncProducts.js";

const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}



const pCode = document.getElementById("pCode");
const pName = document.getElementById("pName");
const pPrice = document.getElementById("pPrice");
const pStock = document.getElementById("pStock");

const billEl = document.getElementById("billEl");
const total = document.getElementById("total");
const grand = document.getElementById("grand");

// const gst = document.getElementById("gst");
const vat = document.getElementById("vat");
const discP = document.getElementById("discP");
const discF = document.getElementById("discF");

const search = document.getElementById("search");
const productList = document.getElementById("productList");
const suggestions = document.getElementById("suggestions");

const paid = document.getElementById("paid");
const due = document.getElementById("due");

const fullPaidBtn = document.getElementById("fullPaidBtn");

const receiveDueBtn = document.getElementById("receiveDueBtn");

const saleComment = document.getElementById("saleComment");
const saveCommentBtn = document.getElementById("saveCommentBtn");

const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");
const cashierName = document.getElementById("cashierName");

const shopNameInput = document.getElementById("shopNameInput");
  const shopAddressInput = document.getElementById("shopAddressInput");
  const shopPhoneInput = document.getElementById("shopPhoneInput");
  const saveShopInfoBtn = document.getElementById("saveShopInfoBtn");
const shopNameDisplay = document.getElementById("shopNameDisplay");
const shopAddressDisplay = document.getElementById("shopAddressDisplay");
const shopPhoneDisplay = document.getElementById("shopPhoneDisplay");
document.addEventListener("DOMContentLoaded", () => {
 
  // Load from localStorage or defaults
  let SHOP_NAME = localStorage.getItem("SHOP_NAME") || "Your Shop Name";
  let SHOP_ADDRESS = localStorage.getItem("SHOP_ADDRESS") || "Your Shop Address";
  let SHOP_PHONE = localStorage.getItem("SHOP_PHONE") || "01XXXXXXXXX";

  // Initialize input fields
  shopNameInput.value = SHOP_NAME;
  shopAddressInput.value = SHOP_ADDRESS;
  shopPhoneInput.value = SHOP_PHONE;


  // Listen for changes in other tabs
  window.addEventListener("storage", e => {
    if (e.key === "SHOP_NAME") {
      SHOP_NAME = e.newValue;
      if (shopNameDisplay) shopNameDisplay.innerText = SHOP_NAME;
    }
    if (e.key === "SHOP_ADDRESS") {
      SHOP_ADDRESS = e.newValue;
      if (shopAddressDisplay) shopAddressDisplay.innerText = SHOP_ADDRESS;
    }
    if (e.key === "SHOP_PHONE") {
      SHOP_PHONE = e.newValue;
      if (shopPhoneDisplay) shopPhoneDisplay.innerText = SHOP_PHONE;
    }
  });
}); 
/* =======================
   LOAD SHOP INFO FROM LOCALSTORAGE
======================= */
let SHOP_NAME = localStorage.getItem("SHOP_NAME") || "Your Shop Name";
let SHOP_ADDRESS = localStorage.getItem("SHOP_ADDRESS") || "Your Shop Address";
let SHOP_PHONE = localStorage.getItem("SHOP_PHONE") || "01XXXXXXXXX";

// Update input fields
shopNameInput.value = SHOP_NAME;
shopAddressInput.value = SHOP_ADDRESS;
shopPhoneInput.value = SHOP_PHONE;

// Update top display
if (shopNameDisplay) shopNameDisplay.innerText = SHOP_NAME;
if (shopAddressDisplay) shopAddressDisplay.innerText = SHOP_ADDRESS;
if (shopPhoneDisplay) shopPhoneDisplay.innerText = SHOP_PHONE;

/* =======================
   DATABASE
======================= */
let db;
let bill = [];
let activeIndex = -1;
let suggestionItems = [];
let currentComment = "";

// =======================
// SHOP INFO VARIABLES
// =======================





// Initialize input fields with current values

// Save button click
saveShopInfoBtn.addEventListener("click", () => {
  SHOP_NAME = shopNameInput.value.trim() || "Your Shop Name";
  SHOP_ADDRESS = shopAddressInput.value.trim() || "Your Shop Address";
  SHOP_PHONE = shopPhoneInput.value.trim() || "01XXXXXXXXX";

  // Save to localStorage
  localStorage.setItem("SHOP_NAME", SHOP_NAME);
  localStorage.setItem("SHOP_ADDRESS", SHOP_ADDRESS);
  localStorage.setItem("SHOP_PHONE", SHOP_PHONE);

  // Update display immediately
  shopNameDisplay.innerText = SHOP_NAME;
  shopAddressDisplay.innerText = SHOP_ADDRESS;
  shopPhoneDisplay.innerText = SHOP_PHONE;

  alert("Shop info saved successfully!");

  
  syncSettings(); // 🔥 IMPORTANT
});

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

const dbName = "POS_DB" + USER_ID;
const req = indexedDB.open(dbName, GLOBAL_DB_VERSION);

/*req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("products", { keyPath: "code" });
  db.createObjectStore("sales", { autoIncrement: true });
  db.createObjectStore("deleted_products", { keyPath: "code" }); */
req.onupgradeneeded = e => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("products")) {
    db.createObjectStore("products", { keyPath: "code" });
  }

  if (!db.objectStoreNames.contains("sales")) {
    db.createObjectStore("sales", { autoIncrement: true });
  if (!db.objectStoreNames.contains("sales")) db.createObjectStore("sales", { keyPath: "billID" });
  }

  if (!db.objectStoreNames.contains("deleted_products")) {
    db.createObjectStore("deleted_products", { keyPath: "code" });
  }
}; 
//};

req.onsuccess = e => {
  db = e.target.result;
  loadProducts();
  console.log("DB ready");
};

function store(name, mode = "readonly") {
  return db.transaction(name, mode).objectStore(name);
}

function resetProductForm() {
  // Clear inputs
  pCode.value = "";
  pName.value = "";
  pPrice.value = "";
  pStock.value = "";

  // Clear barcode preview
  const barcodeEl = document.getElementById("barcode");
  if (barcodeEl) {
    barcodeEl.innerHTML = "";
  }

  // Focus back to barcode/code input
  pCode.focus();
}

/* =======================
   PRODUCTS
======================= */
function addProduct() {
  const p = {
    code: pCode.value.trim(),
    name: pName.value.trim(),
    price: Number(pPrice.value),
    stock: Number(pStock.value),
    unit: pUnit.value.trim() || ""   // <-- add this if you have a unit input
  };

  if (!p.code || !p.name) {
    alert("Code & Name required");
    return;
  }

  store("products", "readwrite").put(p).onsuccess = () => {
    alert("Product saved");
    loadProducts();
     // ✅ AFTER product is successfully added
  resetProductForm();
  };
}

/*function removeProduct() {
  const code = pCode.value.trim();
  if (!code) return alert("Enter product code");

  store("products", "readwrite").delete(code).onsuccess = () => {
    alert("Product removed");
    loadProducts();
    resetProductForm(); // ✅ clear ONLY after delete
  };
} */

function loadProducts() {
  if (!productList) return; // safety first
  productList.innerHTML = "";

  store("products").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) return;

    const p = cursor.value;
    const low = p.stock <= 5;

    productList.innerHTML += `
      <tr>
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>৳ ${p.price.toFixed(2)}</td>
        <td>${p.stock}${p.unit || ""}</td>
        <td class="${low ? "low-stock" : ""}">
          ${low ? "LOW" : "OK"}
        </td>
      </tr>
    `;

    cursor.continue();
  };
}

/* =======================
   BILLING
======================= */
function addToBill(product) {
  let item = bill.find(i => i.code === product.code);

  if (item) item.qty++;
  else {
    bill.push({
      code: product.code,
      name: product.name,
      price: product.price,
      qty: 1,
      unit: product.unit
    });
  }
}

function renderBill() {
  billEl.innerHTML = "";
  let subtotal = 0;

  bill.forEach((i, index) => {
    const line = i.qty * i.price;
    subtotal += line;

    billEl.innerHTML += `
      <tr>
        <td>${i.name}</td>
        <td>
  <button onclick="decQty(${index})">−</button>
  <input type="number" min="1" max="${i.stock || 999999}" 
         value="${i.qty}" 
         onchange="updateQty(${index}, this.value)" 
         style="width:50px; text-align:center;">
  <button onclick="incQty(${index})">+</button>
</td>
         <td>৳ ${i.price.toFixed(2)}</td>
    <td>৳ ${(line).toFixed(2)}</td>
        <td><button onclick="removeItem(${index})">❌</button></td>
      </tr>
    `;
  });

  total.dataset.value = subtotal;
  total.innerText = subtotal.toFixed(2);

  
  calculateGrand(subtotal);
  

}

function searchProduct() {
  let input = search.value.trim().toLowerCase();
  if (!input) return;

  // 🔹 1. Try DIRECT CODE SEARCH first (fastest)
  store("products").get(input).onsuccess = e => {
    const p = e.target.result;

    if (p) {
      addProductToBill(p);
    } else {
      // 🔹 2. If not found by code → search by NAME
      searchByName(input);
    }
  };
}
function searchByName(keyword) {
  const req = store("products").openCursor();
  let found = false;

  req.onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) {
      if (!found) alert("Product not found");
      return;
    }

    const p = cursor.value;
    if (p.name.toLowerCase().includes(keyword)) {
      found = true;
      addProductToBill(p);
      return; // stop at first match
    }

    cursor.continue();
  };
}

function addProductToBill(p) {
  if (p.stock <= 0) {
    alert("Out of stock");
    return;
  }

  addToBill(p);
  renderBill();
  search.value = "";
}

function incQty(index) {
  store("products").get(bill[index].code).onsuccess = e => {
    const p = e.target.result;
    if (bill[index].qty >= p.stock) {
      alert("Stock limit reached");
      return;
    }
    bill[index].qty++;
    resetPayment(true);
    renderBill();
  };
}


function decQty(index) {
  if (bill[index].qty <= 1) return;

  bill[index].qty--;
  resetPayment(true);
  renderBill();
}

function removeItem(index) {
  bill.splice(index, 1);
  resetPayment(true);
  renderBill();
}


/* =======================
   TAX & TOTAL
======================= */
function calculateGrand(subtotal) {
  if (subtotal <= 0) {
    // No products in bill → reset everything
    grand.innerText = "0.00";
    due.innerText = "0.00";

    paid.value = "";
    discP.value = "";
    discF.value = "";
    return;
  }

  //const gstAmt = subtotal * (Number(gst.value) || 0) / 100;
  const vatAmt = subtotal * (Number(vat.value) || 0) / 100;
  const discAmt =
    subtotal * (Number(discP.value) || 0) / 100 +
    (Number(discF.value) || 0);
                         // + gstAmt
  let grandTotal = subtotal + vatAmt - discAmt;
  if (grandTotal < 0) grandTotal = 0;

  grand.innerText = grandTotal.toFixed(2);

  // ✅ Calculate due dynamically as paid changes
  const paidAmt = Number(paid.value) || 0;
  let dueAmt = grandTotal - paidAmt;
  if (dueAmt < 0) dueAmt = 0;

  due.innerText = dueAmt.toFixed(2);
}


paid.addEventListener("input", () => {
  const subtotal = Number(total.dataset.value || 0);

  // First calculate fresh grand total
  calculateGrand(subtotal);

  const grandTotal = Number(grand.innerText) || 0;
  let paidAmt = Number(paid.value) || 0;

  // 🔒 Limit paid to grand total
  if (paidAmt > grandTotal) {
    paid.value = grandTotal.toFixed(2);
    paidAmt = grandTotal;
  }

  // Recalculate again to update due properly
  calculateGrand(subtotal);
});


//gst.addEventListener("input", () => {
  //const subtotal = Number(total.dataset.value || 0);
 // calculateGrand(subtotal);
//});

vat.addEventListener("input", () => {
  const subtotal = Number(total.dataset.value || 0);
  calculateGrand(subtotal);
});

discP.addEventListener("input", () => {
  const subtotal = Number(total.dataset.value || 0);
  calculateGrand(subtotal);
});

discF.addEventListener("input", () => {
  const subtotal = Number(total.dataset.value || 0);
  calculateGrand(subtotal);
});


/* =======================
   RECEIPT PRINT
======================= */

/* =======================
   GENERATE UNIQUE BILL ID (TEMP + FINAL)
======================= */
function generateTempBillID(callback) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateKey = `${yy}${mm}${dd}`; // YYMMDD
  let maxCounter = 0;

  // Look in sales DB for max count today
  store("sales").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const sale = cursor.value;
      if (sale.billID && sale.billID.includes(dateKey)) {
        const parts = sale.billID.split("-");
        const count = parseInt(parts[2], 10);
        if (count > maxCounter) maxCounter = count;
      }
      cursor.continue();
    } else {
      const next = String(maxCounter + 1).padStart(3, "0");
      callback(`BI-${dateKey}-${next}`);
    }
  };
}

/* =======================
   PRINT RECEIPT (80mm / A4)
======================= */
function printReceipt(type = "80mm") {
  
  const cName = (document.getElementById("customerName")?.value || "").trim();
const cPhone = (document.getElementById("customerPhone")?.value || "").trim();
const cCashier = (document.getElementById("cashierName")?.value || "").trim();


  generateTempBillID(tempBillID => {

    let rows = "";
    let subtotal = 0;

    bill.forEach(i => {
      const line = i.qty * i.price;
      subtotal += line;
      rows += `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}${i.unit || ""}</td>
          <td>৳ ${line.toFixed(2)}</td>
        </tr>
      `;
    });

    //const gstAmt = subtotal * (Number(gst.value) || 0) / 100;
    const vatAmt = subtotal * (Number(vat.value) || 0) / 100;
    const discAmt = subtotal * (Number(discP.value) || 0) / 100 + (Number(discF.value) || 0);
                               // + gstAmt
    const grandTotal = subtotal + vatAmt - discAmt;
    const paidAmt = Number(paid.value) || 0;
    //const dueAmt = grandTotal - paidAmt;
    let dueAmt = grandTotal - paidAmt;
if (dueAmt < 0) dueAmt = 0;


    const win = window.open("", "_blank", "width=400,height=600");
    win.document.write(`
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: monospace; margin:0; padding:10px; }
          h2,h3,h4 { margin:2px 0; }
          table { width:100%; border-collapse: collapse; }
          th,td { text-align:left; padding:2px 0; }
          .line { border-top:1px dashed #000; margin:5px 0; }
          .center { text-align:center; }
          .totals td { padding:2px 0; }
        </style>
      </head>
      <body>
      <h2 class="center">${SHOP_NAME}</h2>
      <div class="center">${SHOP_ADDRESS}</div>
      <div class="center">Phone: ${SHOP_PHONE}</div>
        <hr>
        <div>Bill ID : ${tempBillID}</div>
        <div>Customer : ${cName || "N/A"}</div>
<div>Phone    : ${cPhone || "N/A"}</div>
<div>Cashier  : ${cCashier || "N/A"}</div>


        <div>Date    : ${new Date().toLocaleDateString()}</div>
        <div>Time    : ${new Date().toLocaleTimeString()}</div>
        <hr>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <hr>
        <table class="totals">
          <tr><td>Subtotal</td><td>৳ ${subtotal.toFixed(2)}</td></tr>
          
          <tr><td>VAT</td><td>৳ ${vatAmt.toFixed(2)}</td></tr>
          <tr><td>Discount</td><td>৳ ${discAmt.toFixed(2)}</td></tr>
          <tr><td><strong>Grand Total</strong></td><td><strong>৳ ${grandTotal.toFixed(2)}</strong></td></tr>
          <tr><td>Paid</td><td>৳ ${paidAmt.toFixed(2)}</td></tr>
          <tr><td>Due</td><td>৳ ${dueAmt.toFixed(2)}</td></tr>
        </table>
        <div class="center line"></div>
        <div>${saleComment.value || ""}</div>
        <div class="center">
          <svg id="receiptBarcode"></svg>
        </div>
        <div class="center">Bill ID: ${tempBillID}</div>
        <h4 class="center">Thank you for shopping!<br>Visit Again 🙂</h4>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <script>
          JsBarcode("#receiptBarcode", "${tempBillID}", {
            format: "CODE128",
            lineColor: "#000",
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

/* =======================
   COMPLETE SALE
======================= */
function completeSale() {
  if (!bill.length) {
    alert("No items in bill");
    return;
  }

  // ✅ ADD THIS CONFIRMATION
  const confirmSale = confirm("Are you sure you want to complete this sale?");
  if (!confirmSale) {
    return; // ❌ Stop here if Cancel clicked
  }

  // ===== existing code continues below =====


  const subtotal = Number(total.dataset.value || 0);
  //const gstAmt = subtotal * (Number(gst.value) || 0) / 100;
  const vatAmt = subtotal * (Number(vat.value) || 0) / 100;
  const discAmt = subtotal * (Number(discP.value) || 0) / 100 + (Number(discF.value) || 0);
                             // + gstAmt 
  const grandTotal = subtotal + vatAmt - discAmt;
  const paidAmt = Number(paid.value) || 0;
  //const dueAmt = grandTotal - paidAmt;
  let dueAmt = grandTotal - paidAmt;

// 🔥 Prevent negative due
if (dueAmt < 0) {
  dueAmt = 0;
} 

  const now = new Date();

  // Generate FINAL Bill ID
  generateTempBillID(finalBillID => {
    store("sales", "readwrite").add({
  billID: finalBillID,
  date: now.toISOString().slice(0,10),
  time: now.toLocaleTimeString(),
  items: bill,
  subtotal,
 // gst: gstAmt,
  vat: vatAmt,
  discount: discAmt,
  grandTotal,
  paid: paidAmt,
  due: dueAmt,

  customerName: customerName.value.trim(),
  customerPhone: customerPhone.value.trim(),
  cashierName: cashierName.value.trim(),

  comment: currentComment,   // ✅ ADD THIS

  // ADD THIS PART 👇
  partialPayments: paidAmt > 0 ? [{
    amount: paidAmt,
    date: new Date().toISOString(),
    type: "initial"
  }] : []
});

     // 🔒 FINAL: Update stock ONLY on completed sale
bill.forEach(item => {
  store("products", "readwrite").get(item.code).onsuccess = e => {
    const p = e.target.result;
    if (!p) return;

    p.stock = Math.max(0, p.stock - item.qty);
    store("products", "readwrite").put(p);
  };
});

    
    alert(`Sale completed!\nBill ID: ${finalBillID}`);

    // Animate Paid → 0
    animateValue(paid, paidAmt, 0, 300);
    // Animate Due → 0
    animateValue(due, dueAmt, 0, 300);

    // Reset bill
    bill = [];
    renderBill();


    // Reset input boxes
    pCode.value = "";
    pName.value = "";
    pPrice.value = "";
    pStock.value = "";
    search.value = "";
    discP.value = "";
    discF.value = "";
    loadProducts();


    
    customerName.value = "";
customerPhone.value = "";
cashierName.value = "";

  });
}


/* =======================
   Animate value function
======================= */
function animateValue(element, start, end, duration) {
  const range = start - end;
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const value = Math.max(start - (range * (progress / duration)), end);
    element.value = value.toFixed(2);
    element.innerText = value.toFixed(2);
    if (progress < duration) {
      requestAnimationFrame(step);
    } else {
      element.value = end.toFixed(2);
      element.innerText = end.toFixed(2);
    }
  }

  requestAnimationFrame(step);
}

/* =======================
   Highlight last bill row
======================= */



function dailyReport() {
  const today = new Date().toISOString().slice(0, 10);
  generateReport(today, "day");
}

function monthlyReport() {
  const month = new Date().toISOString().slice(0, 7);
  generateReport(month, "month");
}

function generateReport(key, type) {
  let count = 0;
  let amount = 0;
  let details = "";

  store("sales").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) {
      alert(
        `Report (${type})\n` +
        `Total Sales: ${count}\n` +
        `Total Amount: ৳${amount}\n\n` +
        details
      );
      return;
    }

    const s = cursor.value;

    if (
      (type === "day" && s.date === key) ||
      (type === "month" && s.date.startsWith(key))
    ) {
      count++;
      amount += s.grandTotal;
      details += `${s.date} ${s.time} → ৳${s.grandTotal}\n`;
    }

    cursor.continue();
  };
}
function generateBarcode() {
  const code = pCode.value.trim();
  if (!code) {
    alert("Enter product code first");
    return;
  }

  JsBarcode("#barcode", code, {
    format: "CODE128",
    lineColor: "#000",
    width: 2,
    height: 50,
    displayValue: true
  });
}

search.addEventListener("input", () => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) {
    suggestions.style.display = "none";
    return;
  }

  showSuggestions(keyword);
});
function showSuggestions(keyword) {
  suggestions.innerHTML = "";
  suggestionItems = [];
  activeIndex = -1;

  let count = 0;

  store("products").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor || count >= 55555) {
      suggestions.style.display = count ? "block" : "none";
      return;
    }

    const p = cursor.value;

    if (
      p.code.toLowerCase().includes(keyword) ||
      p.name.toLowerCase().includes(keyword)
    ) {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.innerHTML = `<strong>${p.name}</strong> (${p.code}) — ৳${p.price}`;
      div.onclick = () => selectSuggestion(p);

      suggestions.appendChild(div);
      suggestionItems.push({ el: div, product: p });
      count++;
    }

    cursor.continue();
  };
}

function selectSuggestion(p) {
  suggestions.style.display = "none";
  activeIndex = -1;
  search.value = "";

  if (p.stock <= 0) {
    alert("Out of stock");
    return;
  }

  //p.stock--;
  //store("products", "readwrite").put(p);

  addToBill(p);
  renderBill();
}


search.addEventListener("keydown", e => {

  // ENTER
  if (e.key === "Enter") {
    e.preventDefault();

    if (suggestions.style.display === "block" && activeIndex >= 0) {
      // Select highlighted suggestion
      selectSuggestion(suggestionItems[activeIndex].product);
    } else {
      // Normal search
      searchProduct();
    }

    suggestions.style.display = "none";
    activeIndex = -1;
    search.value = "";
  }

  // ARROW DOWN
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveSelection(1);
  }

  // ARROW UP
  if (e.key === "ArrowUp") {
    e.preventDefault();
    moveSelection(-1);
  }

  // ESC
  if (e.key === "Escape") {
    suggestions.style.display = "none";
    activeIndex = -1;
  }
});

function moveSelection(step) {
  if (!suggestionItems.length) return;

  activeIndex += step;

  if (activeIndex < 0) activeIndex = suggestionItems.length - 1;
  if (activeIndex >= suggestionItems.length) activeIndex = 0;

  suggestionItems.forEach((item, i) => {
    item.el.classList.toggle("active", i === activeIndex);
  });
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
  if (!reportBody) return; // safety first
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
          ${s.date}
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


fullPaidBtn.addEventListener("click", () => {
  const grandTotal = Number(grand.innerText.replace(/[^\d.]/g, "")) || 0;

  paid.value = grandTotal.toFixed(2);
  calculateGrand(Number(total.dataset.value || 0));

  // Visual confirm
  paid.style.transition = "background 0.3s";
  paid.style.background = "#fff3cd";

  setTimeout(() => {
    paid.style.background = "";
  }, 1000);
});


document.addEventListener("keydown", (e) => {
  // F1 key
  if (e.key === "F1") {
    e.preventDefault(); // Prevent browser default help action
    fullPaidBtn.click(); // Trigger the full payment button click
  }
});

function resetPayment(force = false) {
  if (!force) return;
  paid.value = "";
  calculateGrand(Number(total.dataset.value || 0));
}

document.getElementById("productListBtn").addEventListener("click", () => {
  window.location.href = "product-list.html";
});

document.getElementById("vendorListBtn").addEventListener("click", () => {
  window.location.href = "vendor.html";
});

document.getElementById("makelabelBtn").addEventListener("click", () => {
  window.location.href = "label.html";
});

document.getElementById("receiveDueBtn").addEventListener("click", () => {
  window.location.href = "due.html";
});

document.getElementById("refundBtn").addEventListener("click", () => {
  window.location.href = "refund.html";
});



//saveCommentBtn.addEventListener("click", () => {
//  currentComment = saleComment.value.trim();
//  alert("Comment saved!");
//});
// ===============================
// COMMENT SAVE + LOAD
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const saleComment = document.getElementById("saleComment");
  const saveCommentBtn = document.getElementById("saveCommentBtn");

  if (!saleComment || !saveCommentBtn) return;

  // Load saved comment
  const savedComment = localStorage.getItem("SALE_COMMENT") || "";
  saleComment.value = savedComment;

  // Save comment
  saveCommentBtn.addEventListener("click", () => {
    const commentText = saleComment.value.trim();
    localStorage.setItem("SALE_COMMENT", commentText);
    alert("Comment saved successfully!");
  });
});


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
const dueReportBtn = document.getElementById("dueReportBtn");
const stockHistoryBtn = document.getElementById("stockHistoryBtn");
const salesReportBtn = document.getElementById("salesReportBtn");
const refundReportBtn = document.getElementById("refundReportBtn");

if(salesReportBtn){
document.getElementById("salesReportBtn").addEventListener("click", () => {
  window.location.href = "salesreport.html";
});
}
if(refundReportBtn){
document.getElementById("refundReportBtn").addEventListener("click", () => {
    window.location.href = "refundreport.html";
});
}
if(dueReportBtn){
dueReportBtn.addEventListener("click", () => {
  window.location.href = "duereport.html";
});
}
if(stockHistoryBtn){
stockHistoryBtn.addEventListener("click", () => {
  window.location.href = "stock-history.html";
});
}
function updateQty(index, value) {
  value = parseInt(value);

  if (isNaN(value) || value < 1) value = 1;

  // Check stock
  store("products").get(bill[index].code).onsuccess = e => {
    const p = e.target.result;
    if (!p) return;

    if (value > p.stock) {
      alert("Stock limit reached");
      value = p.stock;
    }

    bill[index].qty = value;
    resetPayment(true);
    renderBill();
  };
}

// Save
saveShopInfoBtn.addEventListener("click", () => {
  SHOP_NAME = shopNameInput.value.trim() || "Your Shop Name";
  SHOP_ADDRESS = shopAddressInput.value.trim() || "Your Shop Address";
  SHOP_PHONE = shopPhoneInput.value.trim() || "01XXXXXXXXX";

  // Save to localStorage
  localStorage.setItem("SHOP_NAME", SHOP_NAME);
  localStorage.setItem("SHOP_ADDRESS", SHOP_ADDRESS);
  localStorage.setItem("SHOP_PHONE", SHOP_PHONE);

  // ✅ Update display immediately
  if (shopNameDisplay) shopNameDisplay.innerText = SHOP_NAME;
  if (shopAddressDisplay) shopAddressDisplay.innerText = SHOP_ADDRESS;
  if (shopPhoneDisplay) shopPhoneDisplay.innerText = SHOP_PHONE;

  alert("Shop info saved successfully!");
});

// Load on page load
// Load saved shop info from localStorage
SHOP_NAME = localStorage.getItem("SHOP_NAME") || SHOP_NAME;
SHOP_ADDRESS = localStorage.getItem("SHOP_ADDRESS") || SHOP_ADDRESS;
SHOP_PHONE = localStorage.getItem("SHOP_PHONE") || SHOP_PHONE;

// Update input fields


// ✅ Update display
if (shopNameDisplay) shopNameDisplay.innerText = SHOP_NAME;
if (shopAddressDisplay) shopAddressDisplay.innerText = SHOP_ADDRESS;
if (shopPhoneDisplay) shopPhoneDisplay.innerText = SHOP_PHONE;

window.addEventListener("storage", e => {
  if (e.key === "SHOP_NAME") SHOP_NAME = e.newValue;
  if (e.key === "SHOP_ADDRESS") SHOP_ADDRESS = e.newValue;
  if (e.key === "SHOP_PHONE") SHOP_PHONE = e.newValue;
});


document.getElementById("logoutBtn").onclick = async function(){

await supabaseClient.auth.signOut();

localStorage.removeItem("user");

window.location.href = "login.html";

}

// window.addEventListener("load", () => {
//  console.log("SYNC STARTED");
//  syncProducts();
//});

  
window.addEventListener("load", async function () {
  console.log("APP START");

  await syncDeletedProducts();   // FIRST
  await syncDeletedVendors();
  
  await restoreProducts();   // Second cloud -> local
  await restoreVendors();
  await restoreRefunds();
  await restoreSales();
  await restoreStockHistory();
 await restoreSettings();

// 🔥 ADD THIS
shopNameInput.value = localStorage.getItem("SHOP_NAME");
shopAddressInput.value = localStorage.getItem("SHOP_ADDRESS");
shopPhoneInput.value = localStorage.getItem("SHOP_PHONE");


if (shopNameDisplay)
  shopNameDisplay.innerText = localStorage.getItem("SHOP_NAME");

if (shopAddressDisplay)
  shopAddressDisplay.innerText = localStorage.getItem("SHOP_ADDRESS");

if (shopPhoneDisplay)
  shopPhoneDisplay.innerText = localStorage.getItem("SHOP_PHONE");


  
  loadProducts();            // render UI
  //loadVendors(); 
  

  syncProducts();           // then local -> cloud
  syncVendors();
  syncRefunds();
  syncSales();
  syncStockHistory();
  syncSettings();

  await syncDailyBackup();
// startRealtimeProducts(); // 🔥 ADD THIS

//syncSales();
//  syncRefunds();
//  syncStockHistory();
//  syncVendors();
//  syncSettings();
 
  //syncDeletedProducts();

//  syncDailyBackup(); 
});
// run once when app opens
/*  window.addEventListener("load", function () {
  syncProducts();
  syncSales();
  syncRefunds(); 
  syncStockHistory(); 
  syncVendors();
  syncSettings();
  
  syncDeletedVendors();
  syncDeletedProducts();

});

//import "./syncSales.js";

//window.addEventListener("online", () => {
 // syncProducts();
 // syncSales();
//});

//window.addEventListener("load", () => {
 // syncProducts();
//  syncSales();
//});

// optional auto sync every 30 min
//setInterval(() => {
//  syncProducts();
//  syncSales();
//}, 30 * 60 * 1000);

// run every 6 hours
//setInterval(function () {
//  console.log("Auto sync running...");
//  syncProducts();
//}, 6 * 60 * 60 * 1000);

 */

//window.addEventListener("load", syncDailyBackup);
window.addEventListener("online", syncDailyBackup);

// every 24 hours
setInterval(syncDailyBackup, 24 * 60 * 60 * 1000);  