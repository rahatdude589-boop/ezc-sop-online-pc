/* ================= DOM REFERENCES ================= */
const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

const reportBody = document.getElementById("reportBody");
const reportDate = document.getElementById("reportDate");
const reportMonth = document.getElementById("reportMonth");

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

/* ================= OPEN REFUND DATABASE ================= */
const req = indexedDB.open("REFUND_DB"+ USER_ID, GLOBAL_DB_VERSION);

req.onupgradeneeded = e => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("refunds")) {
        db.createObjectStore("refunds", { keyPath: "id", autoIncrement: true });
    }
};

req.onsuccess = e => {
    refundDB = e.target.result;
    console.log("Refund DB connected for report");
    loadRefunds(renderTable);
};

req.onerror = e => console.error("Refund DB error", e);

/* ================= LOAD ALL REFUNDS ================= */
function loadRefunds(callback) {
    if (!refundDB) return;
    const tx = refundDB.transaction("refunds", "readonly");
    const store = tx.objectStore("refunds");
    const getAll = store.getAll();
    getAll.onsuccess = () => callback(getAll.result);
    getAll.onerror = e => console.error("Failed to load refunds", e);
}

/* ================= RENDER TABLE ================= 
function renderTable(refunds) {
    reportBody.innerHTML = "";

    let totalRefundQty = 0;
    let totalPrice = 0;
    let totalRefundAmount = 0;

    refunds.forEach((r, index) => {
        totalRefundQty += Number(r.refundQty);
        totalPrice += Number(r.price);
        totalRefundAmount += Number(r.totalRefund);

        reportBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${r.billerID}</td>
                <td>${r.refundDate}</td>
                <td>${r.refundTime}</td>
                <td>${r.reason}</td>
                <td>${r.itemName}</td>
                <td>${r.qty}</td>
                <td>${r.refundQty}</td>
                <td>৳ ${r.price.toFixed(2)}</td>
                <td>৳ ${r.totalRefund.toFixed(2)}</td>
            </tr>
        `;
    });
*/
    /* TOTAL ROW
    reportBody.innerHTML += `
        <tr style="font-weight:bold;background:#f2f2f2">
            <td colspan="9">TOTAL REFUND (Items:${totalRefundQty})</td>
            
            
            <td>৳ ${totalRefundAmount.toFixed(2)}</td>
        </tr>
    `;
}  */
function renderTable(refunds) {
    reportBody.innerHTML = "";

    let totalRefundAmount = 0;

    // GROUP BY BILL
    const grouped = {};

    refunds.forEach(r => {
        if (!grouped[r.billerID]) {
            grouped[r.billerID] = [];
        }
        grouped[r.billerID].push(r);
    });

    let index = 1;

    Object.entries(grouped).forEach(([billerID, items]) => {

        items.forEach((r, i) => {

            totalRefundAmount += Number(r.totalRefund);

            reportBody.innerHTML += `
                <tr>
                    <td>${i === 0 ? index++ : ""}</td>
                    <td>${i === 0 ? r.billerID : ""}</td>
                    <td>${i === 0 ? r.refundDate : ""}</td>
                    <td>${i === 0 ? r.refundTime : ""}</td>
                    <td>${i === 0 ? r.reason : ""}</td>

                    <td>${r.itemName}</td>
                    <td>${r.qty}</td>
                    <td>${r.refundQty}</td>
                    <td>৳ ${r.price.toFixed(2)}</td>
                    <td>৳ ${r.totalRefund.toFixed(2)}</td>
                    <td>${i === 0 ? `<button onclick="printSingleBill('${billerID}')">Print</button>` : ""}</td>
                </tr>
            `;
        });

    });

    // TOTAL
    reportBody.innerHTML += `
        <tr style="font-weight:bold;background:#f2f2f2">
            <td colspan="10">TOTAL</td>
            <td>৳ ${totalRefundAmount.toFixed(2)}</td>
        </tr>
    `;
}
/* ================= FILTER DAILY REPORT ================= */
function generateDailyReport() {
    const selectedDate = reportDate.value;
    if (!selectedDate) return alert("Select a date");

    loadRefunds(refunds => {
        const filtered = refunds.filter(r => r.refundDate === selectedDate);
        renderTable(filtered);
    });
}

/* ================= FILTER MONTHLY REPORT ================= */
function generateMonthlyReport() {
    const selectedMonth = reportMonth.value;
    if (!selectedMonth) return alert("Select a month");

    loadRefunds(refunds => {
        const filtered = refunds.filter(r => r.refundDate.startsWith(selectedMonth));
        renderTable(filtered);
    });
}



/* ================= EXPORT CSV ================= */
function exportCSV() {
    const rows = [["#", "Biller ID", "Refund Date", "Refund Time", "Reason", "Item", "Qty", "Refund Qty", "Price (BDT)", "Refund Total"]];
    reportBody.querySelectorAll("tr").forEach(tr => {
        const cells = Array.from(tr.querySelectorAll("td")).map(td => td.innerText);
        rows.push(cells);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "refund_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ================= EXPORT EXCEL ================= */
function exportExcel() {
    const table = reportBody.closest("table");
    const html = table.outerHTML.replace(/ /g, '%20');
    const link = document.createElement("a");
    link.href = 'data:application/vnd.ms-excel,' + html;
    link.download = "refund_report.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ================= EXPORT PDF ================= */
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
        <head><title>Refund Report</title></head>
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

/* ================= AUTO-REFRESH ================= */
function updateRefundReport() {
    if (!refundDB) return;
    loadRefunds(renderTable);
}

window.updateRefundReport = updateRefundReport;
window.renderTable = renderTable;
window.loadRefunds = loadRefunds;



window.addEventListener("load", async function () {
  await restoreRefunds();  // cloud → local
  syncRefunds();           // local → cloud
});  

function printSingleBill(billerID) {
    loadRefunds(refunds => {
        const billItems = refunds.filter(r => r.billerID === billerID);
        if (!billItems.length) return alert("No items found for this bill");

        const invoice = billItems[0].billerID;
        const method = billItems[0].method || "Cash";
        const reason = billItems[0].reason || "";

        let rows = "";
        billItems.forEach(i => {
            rows += `<tr>
                <td>${i.itemName}</td>
                <td>${i.refundQty}</td>
                <td>৳ ${(i.refundQty * i.price).toFixed(2)}</td>
            </tr>`;
        });

        const total = billItems.reduce((sum, i) => sum + i.refundQty * i.price, 0);

        const win = window.open("", "_blank", "width=400,height=600");

        win.document.write(`
            <html>
            <head>
                <title>Refund Receipt</title>
                <style>
                    body { font-family: monospace; padding: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border-bottom: 1px solid #ddd; padding: 4px; text-align:left; }
                    h2, div { text-align: center; }
                </style>
            </head>
            <body>
                <h2>REFUND</h2>
                <h2>${SHOP_NAME}</h2>
                <div>${SHOP_ADDRESS}</div>
                <div>Phone: ${SHOP_PHONE}</div>
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

                <svg id="barcode"></svg>
            </body>
            </html>
        `);

        win.document.close();

        // ✅ WAIT for page load then generate barcode
        win.onload = function () {
            const script = win.document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";

            script.onload = function () {
                win.JsBarcode(win.document.getElementById("barcode"), invoice, {
                    format: "CODE128",
                    width: 2,
                    height: 50,
                    displayValue: false
                });

                win.print();
            };

            win.document.body.appendChild(script);
        };
    });
}