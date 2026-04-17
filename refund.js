/* ======================= DOM REFERENCES ======================= */
const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

const searchInput = document.querySelector(".search-section input");
const loadBtn = document.querySelector(".btn-load");
const refundTableBody = document.querySelector(".refund-table tbody");
const summaryValue = document.querySelector(".summary-value");
const refundMethodRadios = document.querySelectorAll('input[name="method"]');
const reasonTextarea = document.querySelector(".reason-box textarea");
const printCheckbox = document.getElementById("print");
const confirmBtn = document.querySelector(".btn-confirm");
const cancelBtn = document.querySelector(".btn-cancel");
const closeBtn = document.querySelector(".close-btn");

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

let db; // POS_DB
let refundDB; // REFUND_DB
let currentSale = null;
let refundData = [];

/* ======================= OPEN DATABASES ======================= */
const dbName = "POS_DB" + USER_ID;
const reqPOS = indexedDB.open(dbName, GLOBAL_DB_VERSION);
reqPOS.onsuccess = e => { db = e.target.result; console.log("POS DB ready"); };
reqPOS.onerror = e => console.error("POS DB error", e);

const reqRefund = indexedDB.open("REFUND_DB"+ USER_ID, GLOBAL_DB_VERSION);
reqRefund.onupgradeneeded = e => {
    const rdb = e.target.result;
    if (!rdb.objectStoreNames.contains("refunds")) {
        rdb.createObjectStore("refunds", { keyPath: "id", autoIncrement: true });
    }
};
reqRefund.onsuccess = e => { refundDB = e.target.result; console.log("REFUND DB ready"); };
reqRefund.onerror = e => console.error("REFUND DB error", e);

/* ======================= LOAD SALE BY INVOICE ======================= */
loadBtn.addEventListener("click", () => {
    const invoice = searchInput.value.trim();
    if (!invoice) return alert("Enter invoice number");

    const store = db.transaction("sales").objectStore("sales");
    const getReq = store.openCursor();
    let found = false;

    getReq.onsuccess = e => {
        const cursor = e.target.result;
        if (!cursor) {
            if (!found) alert("Sale not found");
            return;
        }
        const sale = cursor.value;
        if (sale.billID === invoice) {
            currentSale = sale;
            document.getElementById('saleDate').innerText = sale.date || '-';
            document.getElementById('saleTime').innerText = sale.time || '-';
            document.getElementById('salePayment').innerText = sale.payment || '-';
            document.getElementById('saleCashier').innerText = sale.cashier || '-';
            refundData = sale.items.map(i => ({ ...i, refundQty: 0 }));
            renderRefundTable();
            found = true;
            return;
        }
        cursor.continue();
    };
});

/* ======================= RENDER REFUND TABLE ======================= */
function renderRefundTable() {
    refundTableBody.innerHTML = "";
    refundData.forEach((item, index) => {
        const refundTotal = (item.refundQty * item.price).toFixed(2);
        refundTableBody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>
                    <div class="qty-control">
                        <button onclick="changeRefundQty(${index}, -1)">−</button>
                        <input type="number" min="0" max="${item.qty}" value="${item.refundQty}" onchange="setRefundQty(${index}, this.value)" class="refund-input">
                        <button onclick="changeRefundQty(${index}, 1)">+</button>
                    </div>
                </td>
                <td>৳ ${item.price.toFixed(2)}</td>
                <td>৳ ${refundTotal}</td>
            </tr>
        `;
    });
    calculateRefundSummary();
}

/* ======================= UPDATE REFUND QUANTITY ======================= */
function changeRefundQty(index, delta) {
    const item = refundData[index];
    item.refundQty = Math.max(0, Math.min(item.qty, item.refundQty + delta));
    renderRefundTable();
}
function setRefundQty(index, value) {
    const item = refundData[index];
    let qty = Number(value);
    if (isNaN(qty)) qty = 0;
    if (qty < 0) qty = 0;
    if (qty > item.qty) qty = item.qty;
    item.refundQty = qty;
    renderRefundTable();
}

/* ======================= CALCULATE TOTAL REFUND ======================= */
function calculateRefundSummary() {
    const total = refundData.reduce((sum, i) => sum + i.refundQty * i.price, 0);
    summaryValue.innerText = `৳ ${total.toFixed(2)}`;
}

/* ======================= CONFIRM REFUND ======================= */
/* ======================= CONFIRM REFUND ======================= */
confirmBtn.addEventListener("click", () => {
    if (!currentSale) return alert("Load a sale first");

    const totalRefund = refundData.reduce((sum, i) => sum + i.refundQty * i.price, 0);
    if (totalRefund <= 0) return alert("No items selected for refund");

    const method = [...refundMethodRadios].find(r => r.checked)?.nextSibling.textContent.trim() || "Cash";
    const reason = reasonTextarea.value.trim();
    if (!reason) return alert("Enter refund reason");

    // ONLY update product stock
    const tx = db.transaction("products", "readwrite");
    const productsStore = tx.objectStore("products");

    refundData.forEach(item => {
        if (item.refundQty > 0) {
            const getReq = productsStore.get(item.code);
            getReq.onsuccess = e => {
                const product = e.target.result;
                if (product) {
                    product.stock += item.refundQty; // add refunded quantity
                    productsStore.put(product);
                }
            };
        }
    });

    tx.oncomplete = () => {
        alert(`Refund successful!\nTotal: ৳ ${totalRefund.toFixed(2)}`);
        saveRefundToReportDB(method, reason, totalRefund); // save refund to REFUND_DB
        if (printCheckbox.checked) {
            printRefundReceipt(currentSale.billID, refundData, totalRefund, method, reason);
        }
        resetRefundForm();
    };

    tx.onerror = e => console.error("Transaction failed", e);
});

/* ======================= SAVE REFUND TO REFUND_DB ======================= */
function saveRefundToReportDB(method, reason, totalRefund) {
    if (!refundDB) return;

    const tx = refundDB.transaction("refunds", "readwrite");
    const store = tx.objectStore("refunds");

    const now = new Date();
    const refundDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const refundTime = now.toLocaleTimeString('en-GB'); // HH:MM:SS

    refundData.forEach(item => {
        if (item.refundQty > 0) {
          /*  store.add({
                billerID: currentSale.billID,    // exact invoice number
                refundDate: refundDate,          // exact refund date
                refundTime: refundTime,          // exact refund time
                reason: reason,
                itemName: item.name,
                qty: item.qty,
                refundQty: item.refundQty,
                price: item.price,
                totalRefund: item.refundQty * item.price,
                method: method,
                month: refundDate.slice(0, 7)
            }); */
            const refundObj = {
  billerID: currentSale.billID,
  refundDate,
  refundTime,
  reason,
  itemName: item.name,
  qty: item.qty,
  refundQty: item.refundQty,
  price: item.price,
  totalRefund: item.refundQty * item.price,
  method,
  month: refundDate.slice(0, 7),
  last_updated: new Date().toISOString()
};

store.add(refundObj);

// 🔥 ADD THIS
syncSingleRefund(refundObj);
        }
    });

    tx.oncomplete = () => {
        console.log("Refund saved with exact biller ID, date, and time");
        if (window.updateRefundReport) window.updateRefundReport();
    };
}




/* ======================= SAVE REFUND TO REFUND_DB ======================= */

/* ======================= PRINT REFUND RECEIPT ======================= */
function printRefundReceipt(invoice, items, total, method, reason) {
    const win = window.open("", "_blank", "width=400,height=600");
    let rows = "";
    items.forEach(i => {
        if (i.refundQty > 0) {
            rows += `<tr>
                <td>${i.name}</td>
                <td>${i.refundQty}</td>
                <td>৳ ${(i.refundQty * i.price).toFixed(2)}</td>
            </tr>`;
        }
    });
    win.document.write(`
        <html>
        <head>
            <title>Refund Receipt</title>
            <style>
                body { font-family: monospace; padding: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border-bottom: 1px solid #ddd; padding: 4px; text-align:left; }
            </style>
        </head>
        <body>
             <h2 class="center">${SHOP_NAME}</h2>
<div class="center">${SHOP_ADDRESS}</div>
<div class="center">Phone: ${SHOP_PHONE}</div>
            <hr>
             <div>Invoice: ${invoice}</div>
            <div>Date: ${new Date().toLocaleDateString()}</div>
            <div>Method: ${method}</div>
            <div>Reason: ${reason}</div>
            <hr>
            <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <hr>
            <div><strong>Total Refund: ৳ ${total.toFixed(2)}</strong></div>
        
        <div class="center line"></div>
        <div class="center">
<svg id="receiptBarcode"></svg>
<div/>
<!-- 
  Component: Invoice
  Purpose: Displays the main invoice amount and details.
  Layout: Centered
  <div class="center">Invoice: ${invoice}</div>
  
-->

        

<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script>
  JsBarcode("#receiptBarcode", "${invoice}", {
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
}

/* ======================= RESET FORM ======================= */
function resetRefundForm() {
    currentSale = null;
    refundData = [];
    refundTableBody.innerHTML = "";
    summaryValue.innerText = "৳ 0.00";
    searchInput.value = "";
    reasonTextarea.value = "";
    document.getElementById('saleDate').innerText = '-';
    document.getElementById('saleTime').innerText = '-';
    document.getElementById('salePayment').innerText = '-';
    document.getElementById('saleCashier').innerText = '-';
}

/* ======================= CANCEL & CLOSE ======================= */
cancelBtn.addEventListener("click", resetRefundForm);
closeBtn.addEventListener("click", () => window.close());

document.getElementById("refundReportBtn").addEventListener("click", () => {
    window.location.href = "refundreport.html";
});


async function checkRefundDB(invoice) {
    if (!refundDB) {
        alert("Refund DB not ready yet. Please wait a moment.");
        return false;
    }

    return new Promise((resolve, reject) => {
        const tx = refundDB.transaction("refunds", "readonly");
        const store = tx.objectStore("refunds");
        const req = store.openCursor();

        req.onsuccess = e => {
            const cursor = e.target.result;
            if (cursor) {
                if (String(cursor.value.billerID).trim() === String(invoice).trim()) {
                    resolve(true); // Already refunded
                    return;
                }
                cursor.continue();
            } else {
                resolve(false); // Not found
            }
        };

        req.onerror = e => reject("Error checking REFUND DB");
    });
}

loadBtn.addEventListener("click", async () => {
    const invoice = searchInput.value.trim();
    if (!invoice) return alert("Enter invoice number");

    if (!db) return alert("POS DB not ready");
    if (!refundDB) return alert("Refund DB not ready");

    try {
        const alreadyRefunded = await checkRefundDB(invoice);

        if (alreadyRefunded) {
            alert("❌ This biller ID has already been refunded!");
            location.reload(); // 🔥 refresh page after OK
           
            return; // Stop further processing
        }

        // Load sale from POS_DB
        const storePOS = db.transaction("sales").objectStore("sales");
        const getReq = storePOS.openCursor();
        let found = false;

        getReq.onsuccess = e => {
            const cursorPOS = e.target.result;
            if (!cursorPOS) {
                if (!found) alert("Sale not found");
                return;
            }
            const sale = cursorPOS.value;
            if (String(sale.billID).trim() === invoice) {
                currentSale = sale;
                document.getElementById('saleDate').innerText = sale.date || '-';
                document.getElementById('saleTime').innerText = sale.time || '-';
                document.getElementById('salePayment').innerText = sale.payment || '-';
                document.getElementById('saleCashier').innerText = sale.cashier || '-';
                refundData = sale.items.map(i => ({ ...i, refundQty: 0 }));
                renderRefundTable();
                found = true;
                return;
            }
            cursorPOS.continue();
        };

        getReq.onerror = () => alert("Error loading sale from POS DB");

    } catch (err) {
        alert(err);
    }
});

window.addEventListener("load", async function () {
  await restoreRefunds();  // cloud → local
  syncRefunds();           // local → cloud
});