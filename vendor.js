// ===============================
// VENDOR INDEXEDDB SETUP
// ===============================
const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

let db;
const request = indexedDB.open("VENDOR_DB"+ USER_ID, GLOBAL_DB_VERSION);

request.onupgradeneeded = e => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("vendors")) {
    db.createObjectStore("vendors", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("deleted_vendors")) {
    db.createObjectStore("deleted_vendors", { keyPath: "id" });
  }
};

request.onsuccess = e => {
  db = e.target.result;
  loadVendors();
};

// ===============================
// DOM REFERENCES
// ===============================

const vendorTableBody = document.querySelector("#vendorTable tbody");
const totalVendorsEl = document.getElementById("totalVendors");
const totalDueEl = document.getElementById("totalDue");

const addVendorBtn = document.getElementById("addVendorBtn");
const searchInput = document.getElementById("searchInput");

const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");

const modalId = document.getElementById("modalId");
const modalCompany = document.getElementById("modalCompany");
const modalAddress = document.getElementById("modalAddress");
const modalPhone = document.getElementById("modalPhone");
const modalEmail = document.getElementById("modalEmail");
const purchaseDate = document.getElementById("purchaseDate");
const modalName = document.getElementById("modalName");
const modalTotal = document.getElementById("modalTotal");
const modalDue = document.getElementById("modalDue");
const modalComment = document.getElementById("modalComment");
const modalImage = document.getElementById("modalImage");

const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const deleteBtn = document.getElementById("deleteBtn");

const dailyFilter = document.getElementById("dailyFilter");
const monthlyFilter = document.getElementById("monthlyFilter");
const clearFilter = document.getElementById("clearFilter");
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

let currentEditId = null;

// ===============================
// HELPERS
// ===============================

function store(mode = "readonly") {
  return db.transaction("vendors", mode).objectStore("vendors");
}

function resetModal() {
  modalId.value = "";
  modalCompany.value = "";
  modalAddress.value = "";
  modalPhone.value = "";
  modalEmail.value = "";
  purchaseDate.value = "";
  modalName.value = "";
  modalTotal.value = 0;
  modalDue.value = 0;
  modalComment.value = "";
  modalImage.value = "";
  modalImage.dataset.url = "";
  deleteBtn.style.display = "none";
}

// ===============================
// LOAD VENDORS
// ===============================

function loadVendors(searchTerm = "") {

const dailyValue = dailyFilter.value;
  const monthlyValue = monthlyFilter.value;

  vendorTableBody.innerHTML = "";
  let totalCount = 0;
  let totalDue = 0;

  store().openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) {
      totalVendorsEl.innerText = `Total Vendors: ${totalCount}`;
      totalDueEl.innerText = `Total Due: ৳ ${totalDue.toFixed(2)}`;
      return;
    }

    const v = cursor.value;

    if (
      searchTerm &&
      !v.company.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !v.id.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      cursor.continue();
      return;
    }

     // 📅 DAILY FILTER
    if (dailyValue && v.purchaseDate !== dailyValue) {
      cursor.continue();
      return;
    }

    // 📅 MONTHLY FILTER
    if (monthlyValue && !v.purchaseDate.startsWith(monthlyValue)) {
      cursor.continue();
      return;
    }

    totalCount++;
    totalDue += Number(v.due);

    const status =
      v.due > 0
        ? `<span style="color:red;font-weight:bold">Unpaid</span>`
        : `<span style="color:green;font-weight:bold">Paid</span>`;

    const imageHTML = v.image
      ? `<img src="${v.image}" class="vendor-img" style="width:50px;height:50px;object-fit:cover;border-radius:4px;cursor:pointer;">`
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${imageHTML}</td>
      <td>
        <b>${v.company}</b><br>
        ${v.address}<br>
        ${v.phone}<br>
        ${v.email}
      </td>
      <td>${v.id}</td>
      <td>${v.purchaseDate || "-"}</td>
      <td>${v.item ? v.item.replace(/\n/g, "<br>") : "-"}</td>
      <td>৳ ${Number(v.total).toFixed(2)}</td>
      <td>৳ ${Number(v.due).toFixed(2)}</td>
      <td>${status}</td>
      
      <td>${v.comment || "-"}</td>
      <td>
        <button class="btn blue edit-btn" data-id="${v.id}">Edit</button>
      </td>
    `;
    vendorTableBody.appendChild(tr);

    cursor.continue();
  };
}


// ===============================
// ADD VENDOR
// ===============================

addVendorBtn.onclick = () => {
  currentEditId = null;
  modalTitle.innerText = "Add Vendor";
  resetModal();
  modal.style.display = "block";
};

// ===============================
// EDIT VENDOR
// ===============================

vendorTableBody.addEventListener("click", e => {
  if (!e.target.classList.contains("edit-btn")) return;
  const id = e.target.dataset.id;

  store().get(id).onsuccess = ev => {
    const v = ev.target.result;
    if (!v) return;

    currentEditId = id;
    modalTitle.innerText = "Edit Vendor";

    modalId.value = v.id;
    modalCompany.value = v.company;
    modalAddress.value = v.address;
    modalPhone.value = v.phone;
    modalEmail.value = v.email;
    purchaseDate.value = v.purchaseDate;
    modalName.value = v.item;
    modalTotal.value = v.total;
    modalDue.value = v.due;
    modalComment.value = v.comment;
    modalImage.dataset.url = v.image || "";

    deleteBtn.style.display = "inline-block";
    modal.style.display = "block";
  };
});

// ===============================
// SAVE VENDOR
// ===============================

saveBtn.onclick = () => {
  const id = modalId.value.trim();
  const company = modalCompany.value.trim();
  if (!id || !company) {
    alert("Vendor ID and Company required");
    return;
  }

  const saveData = (imageData) => {
    const vendor = {
      id,
      company,
      address: modalAddress.value.trim(),
      phone: modalPhone.value.trim(),
      email: modalEmail.value.trim(),
      purchaseDate: purchaseDate.value,
      item: modalName.value.trim(),
      total: Number(modalTotal.value),
      due: Number(modalDue.value),
      comment: modalComment.value.trim(),
      image: imageData || "",
      last_updated: new Date().toISOString() // ✅ ADD THIS
    };

    store("readwrite").put(vendor).onsuccess = async() => {
      await syncSingleVendor(vendor.id);
      alert("Vendor saved");
      modal.style.display = "none";
      loadVendors();
    };
  };

  if (modalImage.files[0]) {
    const reader = new FileReader();
    reader.onload = () => saveData(reader.result);
    reader.readAsDataURL(modalImage.files[0]);
  } else {
    if (currentEditId) {
      store().get(currentEditId).onsuccess = e => saveData(e.target.result?.image);
    } else {
      saveData("");
    }
  }
};

// ===============================
// DELETE VENDOR
// ===============================
/*
deleteBtn.onclick = () => {
  if (!confirm("Delete this vendor?")) return;

  store("readwrite").delete(currentEditId).onsuccess = () => {
    alert("Vendor deleted");
    modal.style.display = "none";
    loadVendors();
  };
};  */
deleteBtn.onclick = () => {

  if (!confirm("Delete this vendor?")) return;

  // 1. Get vendor from vendors store
  store().get(currentEditId).onsuccess = e => {

    const vendor = e.target.result;
    if (!vendor) return;

    // 2. Prepare deleted vendor data
    const deletedVendor = {
      ...vendor,
      deleted_at: new Date().toISOString(), // for sync
      user_id: USER_ID                      // for Supabase
    };

    // 3. Save into deleted_vendors
    db.transaction("deleted_vendors", "readwrite")
      .objectStore("deleted_vendors")
      .put(deletedVendor).onsuccess = () => {

        // 4. Remove from vendors
        store("readwrite").delete(currentEditId).onsuccess = () => {
          alert("Vendor moved to deleted list (Soft Deleted)");
          modal.style.display = "none";
          loadVendors();
        };

      };

  };

};
// ===============================
// SEARCH
// ===============================

searchInput.addEventListener("input", e => {
  loadVendors(e.target.value.trim());
});

// ===============================
// CLOSE MODAL
// ===============================

closeModalBtn.onclick = cancelBtn.onclick = () => modal.style.display = "none";
window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

// ===============================
// IMAGE PREVIEW CLICK
// ===============================

document.addEventListener("click", e => {
  if (e.target.classList.contains("vendor-img")) {
    const modalPreview = document.createElement("div");
    modalPreview.style = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
    `;
    const img = document.createElement("img");
    img.src = e.target.src;
    img.style.maxWidth = "90%";
    img.style.maxHeight = "90%";
    img.style.borderRadius = "8px";
    modalPreview.appendChild(img);
    modalPreview.addEventListener("click", () => modalPreview.remove());
    document.body.appendChild(modalPreview);
  }
});

function downloadFile(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function fetchVendors(callback) {
  const rows = [];

  store().openCursor().onsuccess = e => {
    const cursor = e.target.result;

    if (cursor) {
      const v = cursor.value;

      rows.push({
        "Company Details":
          `${v.company}\n${v.address || "-"}\n${v.phone || "-"}\n${v.email || "-"}`,

        "Vendor ID": v.id,
        "Purchase Date": v.purchaseDate || "-",
        "Purchase Item & Qty.": v.item || "-",
        "Total Amount": `Tk. ${Number(v.total).toFixed(2)}`,
        "Due Amount": `Tk. ${Number(v.due).toFixed(2)}`,
        "Status": v.due > 0 ? "Unpaid" : "Paid",
        "Details": v.comment || "-"
      });

      cursor.continue();
    } else {
      callback(rows);
    }
  };
}
function fetchDueVendors(callback) {
  const rows = [];

  store().openCursor().onsuccess = e => {
    const cursor = e.target.result;

    if (cursor) {
      const v = cursor.value;

      if (Number(v.due) > 0) {   // ⭐ ONLY DUE VENDORS
        rows.push({
          "Company Details":
            `${v.company}\n${v.address || "-"}\n${v.phone || "-"}\n${v.email || "-"}`,

          "Vendor ID": v.id,
          "Purchase Date": v.purchaseDate || "-",
          "Purchase Item & Qty.": v.item || "-",
          "Total Amount": `Tk. ${Number(v.total).toFixed(2)}`,
          "Due Amount": `Tk. ${Number(v.due).toFixed(2)}`,
          "Status": "Unpaid",
          "Details": v.comment || "-"
        });
      }

      cursor.continue();
    } else {
      callback(rows);
    }
  };
}
function downloadVendorCSV(data, filename) {
  let csv = "";

  csv += `${SHOP_NAME}\n`;
  csv += `${SHOP_ADDRESS}\n`;
  csv += `${SHOP_PHONE}\n`;
  csv += `Generated: ${new Date().toLocaleString()}\n\n`;

  const header = Object.keys(data[0]).join(",");
  csv += header + "\n";

  const body = data.map(r => Object.values(r).join(",")).join("\n");
  csv += body;

  downloadFile(csv, filename, "text/csv");
}
function downloadVendorExcel(data, filename) {
  const wsData = [];

  wsData.push([SHOP_NAME]);
  wsData.push([SHOP_ADDRESS]);
  wsData.push([SHOP_PHONE]);
  wsData.push([`Generated: ${new Date().toLocaleString()}`]);
  wsData.push([]);

  wsData.push(Object.keys(data[0]));

  data.forEach(row => {
    wsData.push(Object.values(row));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendors");

  XLSX.writeFile(wb, filename);
}
function downloadVendorPDF(data, filename) {
  const doc = new jspdf.jsPDF();

  doc.setFontSize(16);
  doc.text(SHOP_NAME, 14, 15);

  doc.setFontSize(10);
  doc.text(SHOP_ADDRESS, 14, 22);
  doc.text(SHOP_PHONE, 14, 27);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

  const headers = Object.keys(data[0]);
  const rows = data.map(obj => Object.values(obj));

  doc.autoTable({
    startY: 38,
    head: [headers],
    body: rows,
    styles: { cellWidth: "wrap" }
  });

  doc.save(filename);
}

document.querySelectorAll(".dropdown-content a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();

    const format = link.dataset.format;

    // ⭐ NORMAL DOWNLOAD
    if (format === "csv" || format === "excel" || format === "pdf") {

      fetchVendors(data => {
        if (!data.length) {
          alert("No data to download");
          return;
        }

        if (format === "csv") {
          downloadVendorCSV(data, "vendor_list.csv");
        }
        else if (format === "excel") {
          downloadVendorExcel(data, "vendor_list.xlsx");
        }
        else if (format === "pdf") {
          downloadVendorPDF(data, "vendor_list.pdf");
        }
      });

    }

    // ⭐ DUE VENDORS DOWNLOAD
    if (format === "due") {

      fetchDueVendors(data => {
        if (!data.length) {
          alert("No Due Vendors Found");
          return;
        }

        // You can choose default format (PDF recommended)
        downloadVendorPDF(data, "due_vendors_report.pdf");
      });

    }

  });
});


// ===============================
// ADD MULTIPLE ITEMS
// ===============================

const itemName = document.getElementById("itemName");
const itemQty = document.getElementById("itemQty");
const itemPrice = document.getElementById("itemPrice");
const addItemBtn = document.getElementById("addItemBtn");

addItemBtn.onclick = () => {

  const name = itemName.value.trim();
  const qty = itemQty.value.trim();
  const price = itemPrice.value.trim();

  if(!name || !qty || !price){
    alert("Enter item name, qty and price");
    return;
  }

  const line = `${name} - ${qty} - ৳ ${price}`;

  if(modalName.value === ""){
    modalName.value = line;
  } else {
    modalName.value += "\n" + line;
  }

  // clear inputs
  itemName.value = "";
  itemQty.value = "";
  itemPrice.value = "";

  itemName.focus();
};


dailyFilter.addEventListener("change", () => {
  monthlyFilter.value = "";
  loadVendors(searchInput.value.trim());
});

monthlyFilter.addEventListener("change", () => {
  dailyFilter.value = "";
  loadVendors(searchInput.value.trim());
});

clearFilter.onclick = () => {
  dailyFilter.value = "";
  monthlyFilter.value = "";
  loadVendors();
};

window.addEventListener("load", async function () {
  await syncDeletedVendors();
  await restoreVendors();
  loadVendors();
  syncVendors();
});