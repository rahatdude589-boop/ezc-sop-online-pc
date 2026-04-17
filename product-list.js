// =======================
// IndexedDB Setup
// =======================
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
  if (!db.objectStoreNames.contains("deleted_products")) {
    db.createObjectStore("deleted_products", { keyPath: "code" });
  }
};

req.onsuccess = e => {
  db = e.target.result;
  loadUnitsIntoDropdown();   // ✅ LOAD UNITS FIRST
  loadProducts();
};

// =======================
// STOCK HISTORY DB
// =======================
/*let historyDb;
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
}; */


// =======================
// DOM References
// =======================
const productTableBody = document.querySelector("#productTable tbody");
const totalProductsEl = document.getElementById("totalProducts");
const lowStockCountEl = document.getElementById("lowStockCount");
const searchInput = document.getElementById("searchInput");

const addProductBtn = document.getElementById("addProductBtn");
const lowStockBtn = document.getElementById("lowStockBtn");


const stockHistoryTableBody = document.querySelector("#stockHistoryTable tbody");



// Modal
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalCode = document.getElementById("modalCode");
const modalName = document.getElementById("modalName");
const modalPrice = document.getElementById("modalPrice");
const modalStock = document.getElementById("modalStock");
const saveChangesBtn = document.getElementById("saveChangesBtn");
const removeProductBtn = document.getElementById("removeProductBtn");
const cancelBtn = document.getElementById("cancelBtn");

const modalImage = document.getElementById("modalImage"); // NEW: product image input
const imageModal = document.getElementById("imageModal"); // NEW: full-size image modal
const fullImage = document.getElementById("fullImage");   // NEW: img in modal
const imageModalClose = document.getElementById("imageModalClose"); // NEW: close button

const modalUnit = document.getElementById("modalUnit");
const customUnitInput = document.getElementById("customUnitInput");

const favoriteUnitBtn = document.getElementById("favoriteUnitBtn");
const removeUnitBtn = document.getElementById("removeUnitBtn");


const modalMfgDate = document.getElementById("modalMfgDate");
const modalExpDate = document.getElementById("modalExpDate");
const modalComment = document.getElementById("modalComment");


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

let currentEditCode = null; // null = Add mode, code = Edit mode

function store(name, mode = "readonly") {
  return db.transaction(name, mode).objectStore(name);
}



function getDateTime() {
  return new Date().toLocaleString();
}

// =======================
// Unit Storage Helpers
// =======================
const DEFAULT_UNITS = ["pcs", "kg", "g", "ltr"];

function getSavedUnits() {
  return JSON.parse(localStorage.getItem("units")) ||
    DEFAULT_UNITS.map(u => ({ name: u, favorite: false }));
}

function saveUnits(units) {
  localStorage.setItem("units", JSON.stringify(units));
}

function addUnit(unitName) {
  let units = getSavedUnits();

  if (!units.some(u => u.name === unitName)) {
    units.push({ name: unitName, favorite: false });
    saveUnits(units);
  }
}


// =======================
// Load Products
// =======================
function loadProducts(filterLowStock = false, searchTerm = "") {
  productTableBody.innerHTML = "";
  let totalProducts = 0;
  let lowStockCount = 0;

  store("products").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) {
      totalProductsEl.innerText = `Total Products: ${totalProducts}`;
      lowStockCountEl.innerText = `Low Stock Items: ${lowStockCount}`;
      return;
    }

    const p = cursor.value;
    totalProducts++;
    const lowStock = p.stock <= 5;
    if (lowStock) lowStockCount++;

    // Apply filters
    if (
      (filterLowStock && !lowStock) ||
      (searchTerm &&
        !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    ) {
      cursor.continue();
      return;
    }

    const status = lowStock
      ? `<span class="low-stock">Low Stock</span>`
      : `<span class="ok-stock">In Stock</span>`;

    const actions = `<button class="btn blue edit-btn" data-code="${p.code}">Edit</button>`;
    const imgHTML = p.image ? `<img class="table-image" src="${p.image}" onclick="openImage('${p.image}')">` : "";  
    productTableBody.innerHTML += `
      <tr>
        <td>${imgHTML}</td>
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>৳ ${p.price.toFixed(2)}</td>
        <td>${p.stock} ${p.unit || ""}</td>
        <td>${p.mfgDate || "-"}</td>
        <td style="color:${isExpired(p.expDate) ? 'red' : 'inherit'}">
  ${p.expDate || "-"}
</td>
        <td>
  ${
    p.comment
      ? p.comment.match(/.{1,20}/g).join("<br>")
      : "-"
  }
</td>

        <td>${status}</td>
        <td>${actions}</td>
      </tr>
    `;

    cursor.continue();
  };
}
function isExpired(expDate) {
  if (!expDate) return false; // no expiry date
  const today = new Date();
  const exp = new Date(expDate);
  return exp < today; // true if expired
}
// =======================
// Add / Edit Modal
// =======================
productTableBody.addEventListener("click", e => {
  if (e.target.classList.contains("edit-btn")) {
    const code = e.target.dataset.code;

    store("products").get(code).onsuccess = evt => {
      const p = evt.target.result;
      if (!p) return alert("Product not found");

      currentEditCode = code; // Edit mode
      modalTitle.innerText = "Edit Product";

      modalCode.value = p.code;
      modalName.value = p.name;
      modalPrice.value = p.price;
      modalStock.value = p.stock;
      modalMfgDate.value = p.mfgDate || "";
      modalExpDate.value = p.expDate || "";
      modalComment.value = p.comment || "";

/* ===== STEP D STARTS HERE ===== */
modalUnit.value = p.unit || "pcs";
customUnitInput.style.display = "none";

if (p.unit && ![...modalUnit.options].some(o => o.value === p.unit)) {
  const opt = document.createElement("option");
  opt.value = p.unit;
  opt.textContent = p.unit;
  modalUnit.insertBefore(opt, modalUnit.lastElementChild);
}
/* ===== STEP D ENDS HERE ===== */




      removeProductBtn.style.display = "inline-block";
      modal.style.display = "block";
    };
  }
});


// Add product button opens modal in Add mode
addProductBtn.addEventListener("click", () => {
  currentEditCode = null; // Add mode
  modalTitle.innerText = "Add Product";
  modalCode.value = "";
  modalName.value = "";
  modalPrice.value = 0;
  modalStock.value = 0;
  modalMfgDate.value = "";
modalExpDate.value = "";
modalComment.value = "";


  removeProductBtn.style.display = "none";
  modal.style.display = "block";
});

// Close modal
closeModal.addEventListener("click", () => modal.style.display = "none");
window.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

// =======================
// Save Product (Add or Edit)
// =======================
saveChangesBtn.addEventListener("click", () => {

  const code = modalCode.value.trim();
  const name = modalName.value.trim();
  const price = Number(modalPrice.value);
  const stock = Number(modalStock.value);
  const mfgDate = modalMfgDate.value;
const expDate = modalExpDate.value;
const comment = modalComment.value.trim();


  if (!code || !name || price < 0 || stock < 0) {
    alert("Invalid data");
    return;
  }


  /* =======================
     UNIT HANDLING (CLEAR)
  ======================= */

 let unit = modalUnit.value;

if (unit === "custom") {
  unit = customUnitInput.value.trim();

  if (!unit) {
    alert("Enter unit name");
    return;
  }

  // Format nicely (Kg, Box, Packet)
  unit = unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();

  const units = getSavedUnits();

  // Check duplicate (case-insensitive)
  const existing = units.find(
    u => u.name.toLowerCase() === unit.toLowerCase()
  );

  if (existing) {
    unit = existing.name; // use saved one
  } else {
    units.push({ name: unit, favorite: false });
    saveUnits(units);
    loadUnitsIntoDropdown();
  }

  modalUnit.value = unit;
}

  /* =======================
     IMAGE HANDLING
  ======================= */

  const saveData = (imageData) => {
    const product = {
      code,
      name,
      price,
      stock,
      mfgDate,
      expDate,
      comment,
      unit,            // ✅ unit saved here
      image: imageData || "",
      last_updated: new Date().toISOString()
    };
    if (currentEditCode) {
    // EDIT MODE
    store("products").get(currentEditCode).onsuccess = e => {
      const oldProduct = e.target.result;
      const diff = stock - oldProduct.stock;

      if (diff !== 0) {
        addStockHistory({
          code,
          name,
          quantityChange: diff,
          currentStock: stock,
          action: diff > 0 ? "added" : "removed"
        });
      }

      store("products", "readwrite").put(product).onsuccess = async() => {
        await syncSingleProduct(product.code);
        alert("Product updated");
        modal.style.display = "none";
        loadProducts();
      };
    };

  } else {
    // ADD MODE
    addStockHistory({
      code,
      name,
      quantityChange: stock,
      currentStock: stock,
      action: "added"
    });

    store("products", "readwrite").put(product).onsuccess = async() => {
      await syncSingleProduct(product.code);
      alert("Product added");
      modal.style.display = "none";
      loadProducts();
    };
  }
};



  // Image logic
if (modalImage.files[0]) {
  const reader = new FileReader();
  reader.onload = () => saveData(reader.result);
  reader.readAsDataURL(modalImage.files[0]);
} else {
  if (currentEditCode) {
    store("products").get(currentEditCode).onsuccess = e => {
      saveData(e.target.result?.image);
    };
  } else {
    saveData("");
  }
}
}); // ✅ VERY IMPORTANT


function saveProduct(product) {
  store("products", "readwrite").put(product).onsuccess = () => {
    alert("Product saved");
    modal.style.display = "none";
    loadProducts();
  };
}


// =======================
// Remove Product
// =======================   
/*removeProductBtn.addEventListener("click", () => {

  if (!confirm("Are you sure to remove this product?")) return;

  store("products").get(currentEditCode).onsuccess = e => {

    const product = e.target.result;
    if (!product) return;

    // Add history record
    addStockHistory({
      code: product.code,
      name: product.name,
      quantityChange: -product.stock,
      currentStock: 0,
      action: "removed"
    });

    // Delete product
    store("products", "readwrite").delete(currentEditCode).onsuccess = () => {
      alert("Product removed");
      modal.style.display = "none";
      loadProducts();
    };
  };

}); */removeProductBtn.addEventListener("click", () => {

  if (!confirm("Are you sure to delete this product?")) return;

  // 1. Get product from products store
  store("products").get(currentEditCode).onsuccess = e => {

    const product = e.target.result;
    if (!product) return;

    // 2. Add history (optional)
    addStockHistory({
      code: product.code,
      name: product.name,
      quantityChange: -product.stock,
      currentStock: 0,
      action: "removed"
    });

    // 3. Save deleted copy into deleted_products
    const deletedProduct = {
      ...product,
      deleted_at: new Date().toISOString(), // useful for sync
      user_id: USER_ID                      // required for Supabase
    };

    // Insert into deleted_products store
    store("deleted_products", "readwrite").put(deletedProduct).onsuccess = () => {

      // 4. Remove from products store
      store("products", "readwrite").delete(currentEditCode).onsuccess = () => {
        alert("Product moved to deleted list (Soft Deleted)");
        modal.style.display = "none";
        loadProducts();
      };

    };
  };

}); // ✅ THIS WAS MISSING
cancelBtn.addEventListener("click", () => {
  // Clear inputs
  modalCode.value = "";
  modalName.value = "";
  modalPrice.value = 0;
  modalStock.value = 0;

  currentEditCode = null; // reset to Add mode
  modal.style.display = "none";
});
// =======================
// Search
// =======================
searchInput.addEventListener("input", e => {
  const term = e.target.value.trim();
  loadProducts(false, term);
});

// =======================
// Low Stock Filter
// =======================
lowStockBtn.addEventListener("click", () => loadProducts(true));


function downloadFile(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fetchProducts(onlyLow, callback) {
  const rows = [];
  store("products").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const p = cursor.value;
      if (!onlyLow || p.stock <= 5) {
        rows.push({
          Code: p.code,
          Name: p.name,
          Price: `Tk. ${p.price.toFixed(2)}`,
          Stock: `${p.stock} ${p.unit || ""}`,
          "Mfg Date": p.mfgDate || "-",
          "Exp Date": p.expDate || "-",
          Comment: p.comment || "-",
          Status: p.stock <= 5 ? "Low Stock" : "In Stock"
        });
      }
      cursor.continue();
    } else {
      callback(rows);
    }
  };
}

function downloadCSV(data, filename) {
  let csv = "";

  // Shop info
  csv += `${SHOP_NAME}\n`;
  csv += `${SHOP_ADDRESS}\n`;
  csv += `${SHOP_PHONE}\n`;
  csv += `Generated: ${getDateTime()}\n\n`;

  // Table header
  const header = Object.keys(data[0]).join(",");
  csv += header + "\n";

  // Table rows
  const body = data.map(r => Object.values(r).join(",")).join("\n");
  csv += body;

  downloadFile(csv, filename, "text/csv");
}
function downloadExcel(data, filename) {
  const wsData = [];

  // Shop info rows
  wsData.push([SHOP_NAME]);
  wsData.push([SHOP_ADDRESS]);
  wsData.push([SHOP_PHONE]);
  wsData.push([`Generated: ${getDateTime()}`]);
  wsData.push([]); // empty row

  // Table header
  wsData.push(Object.keys(data[0]));

  // Table data
  data.forEach(row => {
    wsData.push(Object.values(row));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");

  XLSX.writeFile(wb, filename);
}
function downloadPDF(data, filename) {
  const doc = new jspdf.jsPDF(); // fixed UMD syntax

  doc.setFontSize(16);
  doc.text(SHOP_NAME, 14, 15);

  doc.setFontSize(10);
  doc.text(SHOP_ADDRESS, 14, 22);
  doc.text(SHOP_PHONE, 14, 27);
  doc.text(`Generated: ${getDateTime()}`, 14, 32);

  // Header and rows
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => Object.values(obj)); // already has Tk in Price

 doc.autoTable({
  startY: 38,
  head: [headers],
  body: rows,
  styles: {
    cellWidth: "wrap"
  },
  columnStyles: {
    6: { cellWidth: 40 } // Comment column index
  }
});


  doc.save(filename);
}


document.querySelectorAll(".dropdown-content a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();

    const type = link.dataset.type;     // all | low
    const format = link.dataset.format; // excel | csv | pdf

    fetchProducts(type === "low", data => {
      if (!data.length) {
        alert("No data to download");
        return;
      }

      if (format === "csv") {
        downloadCSV(
          data,
          type === "low" ? "low_stock_products.csv" : "products_list.csv"
        );
      } 
      else if (format === "excel") {
        downloadExcel(
          data,
          type === "low" ? "low_stock_products.xlsx" : "products_list.xlsx"
        );
      } 
      else if (format === "pdf") {
        downloadPDF(
          data,
          type === "low" ? "low_stock_products.pdf" : "products_list.pdf"
        );
      }
    });
  });
});

function openImage(src) {
  fullImage.src = src;
  imageModal.style.display = "flex";
}

imageModalClose.addEventListener("click", () => imageModal.style.display = "none");

window.addEventListener("click", e => {
  if (e.target === imageModal) imageModal.style.display = "none";
});

modalUnit.addEventListener("change", () => {
  if (modalUnit.value === "custom") {
    customUnitInput.style.display = "block";
    customUnitInput.focus();
  } else {
    customUnitInput.style.display = "none";
    customUnitInput.value = "";
  }
});

function loadUnitsIntoDropdown() {
  const units = getSavedUnits();
  modalUnit.innerHTML = "";

  // favorites first
  const sorted = [
    ...units.filter(u => u.favorite),
    ...units.filter(u => !u.favorite)
  ];

  sorted.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.favorite ? `⭐ ${u.name}` : u.name;
    modalUnit.appendChild(opt);
  });

  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = "➕ Add Custom Unit";
  modalUnit.appendChild(customOpt);
}


favoriteUnitBtn.onclick = () => {
  const unit = modalUnit.value;
  if (unit === "custom") return;

  let units = getSavedUnits();
  units = units.map(u =>
    u.name === unit ? { ...u, favorite: !u.favorite } : u
  );

  saveUnits(units);
  loadUnitsIntoDropdown();
  modalUnit.value = unit;
};

removeUnitBtn.onclick = () => {
  const unit = modalUnit.value;

  if (DEFAULT_UNITS.includes(unit)) {
    alert("Default units cannot be removed");
    return;
  }

  let units = getSavedUnits().filter(u => u.name !== unit);
  saveUnits(units);

  loadUnitsIntoDropdown();
  modalUnit.value = "pcs";
};


function addStockHistory({ code, name, quantityChange, currentStock, action }) {
  if (!historyDb) return;

  const now = new Date();

  const tx = historyDb.transaction("history", "readwrite");
  const store = tx.objectStore("history");

  store.add({
    date: now.toISOString().split("T")[0], // YYYY-MM-DD
    time: now.toLocaleTimeString(),         // optional: HH:MM:SS
    code,
    name,
    quantityChange,
    currentStock,
    action // "added", "removed", "updated"
  });

  tx.oncomplete = () => console.log("Stock history saved!");
  tx.onerror = e => console.error("Error saving history", e);
}



stockHistoryBtn.addEventListener("click", () => {
  window.location.href = "stock-history.html";
});

/* removeProductBtn.addEventListener("click", () => {
  if (!confirm("Are you sure to remove this product?")) return;

  // Use the new removeProduct function
  removeProduct(currentEditCode);
}); */

window.addEventListener("load", async function () {
  console.log("APP START");
 await syncDeletedProducts();   // FIRST
  await restoreProducts();   // Second cloud -> local
  loadProducts();            // render UI

  syncProducts();           // then local -> cloud
//  syncSingleProduct(code);
// startRealtimeProducts(); // 🔥 ADD THIS
});