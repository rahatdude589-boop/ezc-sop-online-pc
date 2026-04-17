const user = JSON.parse(localStorage.getItem("user"));

if(!user){
window.location.href="login.html";
}

const USER_ID = user.id;

const GLOBAL_DB_VERSION = 5; // ← any number you want

const productSearch = document.getElementById("productSearch");
const barcodeData = document.getElementById("barcodeData");
const labelWidth = document.getElementById("labelWidth");
const labelHeight = document.getElementById("labelHeight");
const fontSize = document.getElementById("fontSize");
const rowsPerPage = document.getElementById("rowsPerPage");
const colsPerPage = document.getElementById("colsPerPage");
const labelSheet = document.getElementById("labelSheet");
const searchResults = document.getElementById("searchResults");

const editText = document.getElementById("editText");
const editFontSize = document.getElementById("editFontSize");
const editColor = document.getElementById("editColor");
const editAlign = document.getElementById("editAlign");

const editFontFamily = document.getElementById("editFontFamily");
const editRotate = document.getElementById("editRotate");

const barcodeWidth = document.getElementById("barcodeWidth");
const barcodeHeight = document.getElementById("barcodeHeight");

const barcodeFormat = document.getElementById("barcodeFormat");


const SHOP_NAME = "My Shop";
const SHOP_ADDRESS = "123 Market Street";
const SHOP_PHONE = "Tel: 123-456-7890";

// Undo/Redo
let undoStack = [], redoStack = [];
let selectedElement = null;
let copiedLabelTemplate = null;


// =================== IndexedDB setup ===================
let db;
const dbName = "POS_DB" + USER_ID;
const req = indexedDB.open(dbName, GLOBAL_DB_VERSION);
req.onupgradeneeded = e => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("products")) {
    const store = db.createObjectStore("products", { keyPath: "code" });
    store.transaction.oncomplete = () => {
      const tx = db.transaction("products", "readwrite").objectStore("products");
      tx.add({ code: "P001", name: "Milk 1L", price: 80, mfg: "2026-01-01", exp: "2026-01-15" });
      tx.add({ code: "P002", name: "Bread Loaf", price: 50, mfg: "2026-01-02", exp: "2026-01-12" });
      tx.add({ code: "P003", name: "Eggs 12pcs", price: 120, mfg: "2026-01-05", exp: "2026-01-20" });
    };
  }
};
req.onsuccess = e => db = e.target.result;

function store(name, mode = "readonly") { return db.transaction(name, mode).objectStore(name); }
function fetchProducts(term, callback) {
  if (!db) return callback([]);
  const products = [];
  store("products").openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) return callback(products);
    const p = cursor.value;
    const t = term.toLowerCase();
    if (!t || p.name.toLowerCase().includes(t) || p.code.toLowerCase().includes(t)) products.push(p);
    cursor.continue();
  };
}

// =================== Search autofill ===================
productSearch.addEventListener("input", () => {
  searchResults.innerHTML = "";
  const term = productSearch.value.trim();
  if (!term) return;
  fetchProducts(term, products => {
    products.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.name} (${p.code})`;
      li.addEventListener("click", () => {
        productSearch.value = p.name;
        barcodeData.value = p.code;
        searchResults.innerHTML = "";
      });
      searchResults.appendChild(li);
    });
  });
});

// =================== Drag & Select ===================
const dragListeners = {
  move(event) {
    const target = event.target;

    const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
    const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;
    const r = target.getAttribute("data-rotate") || 0;

    target.style.transform =
      `translate(${x}px, ${y}px) rotate(${r}deg)`;

    target.setAttribute("data-x", x);
    target.setAttribute("data-y", y);
  }
};

function makeDraggable(el) {
  interact(el).draggable({
    modifiers: [interact.modifiers.restrict({ restriction: el.parentNode })],
    listeners: dragListeners
  });

  // Add rotate handle only once
  if (!el.querySelector(".rotate-handle")) {
    const handle = document.createElement("div");
    handle.className = "rotate-handle";
    el.appendChild(handle);

    interact(handle).draggable({
      listeners: {
        start(event) {
          const rect = el.getBoundingClientRect();
          el._center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          el._startAngle = parseFloat(el.getAttribute("data-rotate")) || 0;
        },
        move(event) {
          const dx = event.clientX - el._center.x;
          const dy = event.clientY - el._center.y;
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const rotate = angle + 90; // Adjust for handle
          const x = el.getAttribute("data-x") || 0;
          const y = el.getAttribute("data-y") || 0;
          el.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;
          el.setAttribute("data-rotate", rotate);

          if (selectedElement === el) editRotate.value = Math.round(rotate);
        }
      }
    });
  }

  el.addEventListener("click", () => selectElement(el));
}



function selectElement(el) {
  selectedElement = el;

  // If barcode selected
 if (el.classList.contains("barcode-container")) {
  const txt = el.querySelector("text");
  barcodeData.value = txt ? txt.textContent : "";
}


  editText.value = el.innerText;
  editFontSize.value = parseInt(window.getComputedStyle(el).fontSize);
  editColor.value = window.getComputedStyle(el).color;
  editAlign.value = window.getComputedStyle(el).textAlign;

const r = el.getAttribute("data-rotate") || 0;
editRotate.value = r;

}

// =================== Edit Inputs ===================
editText.addEventListener("input", () => {
  if (!selectedElement) return;
  selectedElement.innerText = editText.value;
  saveUndo();
});

editFontSize.addEventListener("input", () => { if(selectedElement){ selectedElement.style.fontSize = editFontSize.value+"px"; saveUndo(); }});
editColor.addEventListener("input", () => { if(selectedElement){ selectedElement.style.color = editColor.value; saveUndo(); }});
editAlign.addEventListener("change", () => { if(selectedElement){ selectedElement.style.textAlign = editAlign.value; saveUndo(); }});

editFontFamily.addEventListener("change", () => {
  if (!selectedElement) return;
  selectedElement.style.fontFamily = editFontFamily.value;
  saveUndo();
});

barcodeData.addEventListener("input", () => {
  if (!selectedElement) return;
  if (!selectedElement.classList.contains("barcode-container")) return;

  const svg = selectedElement.querySelector("svg");
  if (!svg) return;

 JsBarcode(svg, barcodeData.value || "000000", {
  format: barcodeFormat.value,  // <-- dynamic format
  width: parseInt(barcodeWidth.value),
  height: parseInt(barcodeHeight.value),
  displayValue: true,
  background: "transparent",
  margin: 0
});


  saveUndo();
});

function updateBarcodeSize() {
  if (!selectedElement) return;
  if (!selectedElement.classList.contains("barcode-container")) return;

  const svg = selectedElement.querySelector("svg");
  if (!svg) return;

  JsBarcode(svg, barcodeData.value || "000000", {
    format: barcodeFormat.value,   // <-- use selected format
    width: parseInt(barcodeWidth.value),
    height: parseInt(barcodeHeight.value),
    displayValue: true,
    background: "transparent",
    margin: 0
  });

  saveUndo();
}

barcodeWidth.addEventListener("input", updateBarcodeSize);
barcodeHeight.addEventListener("input", updateBarcodeSize);


editRotate.addEventListener("input", () => {
  if (!selectedElement) return;

  const r = editRotate.value || 0;
  const x = selectedElement.getAttribute("data-x") || 0;
  const y = selectedElement.getAttribute("data-y") || 0;

  selectedElement.style.transform =
    `translate(${x}px, ${y}px) rotate(${r}deg)`;

  selectedElement.setAttribute("data-rotate", r);
  saveUndo();
});





// =================== Generate Labels ===================
function applyTemplate(label, template) {
  if (!template) return;

  label.querySelectorAll(".draggable").forEach(el => {
    const key = el.classList.contains("shop-info") ? "shop" :
                el.classList.contains("product-info") ? "product" :
                el.classList.contains("dates") ? "dates" :
                el.classList.contains("barcode-container") ? "barcode" :
                null;

    if (!key || !template[key]) return;

    const t = template[key];

    el.style.transform =
      `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg)`;

    el.setAttribute("data-x", t.x);
    el.setAttribute("data-y", t.y);
    el.setAttribute("data-rotate", t.rotate);

    el.style.fontSize = t.fontSize;
    el.style.color = t.color;
    el.style.fontFamily = t.fontFamily;
    el.style.textAlign = t.align;

    if (key === "barcode") {
      const svg = el.querySelector("svg");
      JsBarcode(svg, t.value, {
        format: "CODE128",
        width: t.width,
        height: t.height,
        displayValue: true,
        margin: 0
      });
    }
  });
}


function generateLabels() {
  const term = productSearch.value.trim();
  if (!db) return alert("POS database not loaded yet");

  fetchProducts(term, products => {
    if (!products.length) return alert("No products found");

    labelSheet.innerHTML = "";
    labelSheet.style.gridTemplateRows = `repeat(${rowsPerPage.value}, ${labelHeight.value}mm)`;
    labelSheet.style.gridTemplateColumns = `repeat(${colsPerPage.value}, ${labelWidth.value}mm)`;

    const totalLabels = rowsPerPage.value * colsPerPage.value;

    for (let i = 0; i < totalLabels; i++) {
      const product = products[i % products.length];
      const label = document.createElement("div");
      label.className = "label";
      label.style.fontSize = fontSize.value + "px";

      // Shop
      const shop = document.createElement("div");
      shop.className = "shop-info draggable";
      shop.innerHTML = `${SHOP_NAME}<br>${SHOP_ADDRESS}<br>${SHOP_PHONE}`;
      label.appendChild(shop);
      makeDraggable(shop);

      // Product
      const prodInfo = document.createElement("div");
      prodInfo.className = "product-info draggable";
      prodInfo.innerHTML = `${product.name} - ৳${product.price}`;
      label.appendChild(prodInfo);
      makeDraggable(prodInfo);

      // Dates
      const dates = document.createElement("div");
      dates.className = "dates draggable";
      dates.innerHTML = `MFG:${product.mfgDate} EXP:${product.expDate}`;
      label.appendChild(dates);
      makeDraggable(dates);

      // Barcode
      const barcodeContainer = document.createElement("div");
      barcodeContainer.className = "barcode-container draggable";
      const code = barcodeData.value || product.code;
      const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
  JsBarcode(svg, code, {
  format: barcodeFormat.value, // dynamic format
  width: parseInt(barcodeWidth.value),
  height: parseInt(barcodeHeight.value),
  displayValue: true,
  background: "transparent",
  margin: 0
});


      barcodeContainer.appendChild(svg);
      label.appendChild(barcodeContainer);
      makeDraggable(barcodeContainer);

      if (product.labelTemplate) {
  applyTemplate(label, product.labelTemplate);
}

      labelSheet.appendChild(label);
    }
    saveUndo();
  });
}

// =================== Buttons ===================
document.getElementById("generateLabelsBtn").addEventListener("click", generateLabels);
document.getElementById("printLabelsBtn").addEventListener("click", () => window.print());
document.getElementById("saveLabelsBtn").addEventListener("click", () => {
  html2canvas(labelSheet).then(canvas => {
    const link = document.createElement("a");
    link.download = "label_sheet.png";
    link.href = canvas.toDataURL();
    link.click();
  });
});

document.getElementById("saveForProductBtn")
  .addEventListener("click", saveLabelForProduct);

document.getElementById("saveForAllBtn")
  .addEventListener("click", saveLabelForAll);


// =================== Undo/Redo ===================
function saveUndo() {
  undoStack.push(labelSheet.innerHTML);
  redoStack = [];
}

function rebindDraggable() {
  document.querySelectorAll(".draggable").forEach(el => {
    makeDraggable(el);
  });
}

document.getElementById("undoBtn").addEventListener("click", () => {
  if (!undoStack.length) return;
  redoStack.push(labelSheet.innerHTML);
  labelSheet.innerHTML = undoStack.pop();
  rebindDraggable();
});

document.getElementById("redoBtn").addEventListener("click", () => {
  if(!redoStack.length) return;
  undoStack.push(labelSheet.innerHTML);
  labelSheet.innerHTML = redoStack.pop();
  rebindDraggable();
});


function saveLabelForProduct() {
  if (!selectedElement) {
    alert("Select any label element first");
    return;
  }

  const label = selectedElement.closest(".label");
  if (!label) return;

  const template = {};

  label.querySelectorAll(".draggable").forEach(el => {
    const key = el.classList.contains("shop-info") ? "shop" :
                el.classList.contains("product-info") ? "product" :
                el.classList.contains("dates") ? "dates" :
                el.classList.contains("barcode-container") ? "barcode" :
                null;

    if (!key) return;

    template[key] = {
      x: el.getAttribute("data-x") || 0,
      y: el.getAttribute("data-y") || 0,
      rotate: el.getAttribute("data-rotate") || 0,
      fontSize: window.getComputedStyle(el).fontSize,
      color: window.getComputedStyle(el).color,
      fontFamily: window.getComputedStyle(el).fontFamily,
      align: window.getComputedStyle(el).textAlign
    };

    if (key === "barcode") {
      template.barcode.width = barcodeWidth.value;
      template.barcode.height = barcodeHeight.value;
      template.barcode.value = barcodeData.value;
    }
  });

  const code = barcodeData.value;

  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  store.get(code).onsuccess = e => {
    const product = e.target.result;
    if (!product) return alert("Product not found");

    product.labelTemplate = template;
    store.put(product);

    alert("✅ Label layout saved for " + product.name);
  };
}

function saveLabelForAll() {
  if (!selectedElement) {
    alert("Select any label element first");
    return;
  }

  const label = selectedElement.closest(".label");
  if (!label) return;

  const template = {};

  label.querySelectorAll(".draggable").forEach(el => {
    const key = el.classList.contains("shop-info") ? "shop" :
                el.classList.contains("product-info") ? "product" :
                el.classList.contains("dates") ? "dates" :
                el.classList.contains("barcode-container") ? "barcode" :
                null;

    if (!key) return;

    template[key] = {
      x: el.getAttribute("data-x") || 0,
      y: el.getAttribute("data-y") || 0,
      rotate: el.getAttribute("data-rotate") || 0,
      fontSize: window.getComputedStyle(el).fontSize,
      color: window.getComputedStyle(el).color,
      fontFamily: window.getComputedStyle(el).fontFamily,
      align: window.getComputedStyle(el).textAlign
    };

    if (key === "barcode") {
      template.barcode.width = barcodeWidth.value;
      template.barcode.height = barcodeHeight.value;
      template.barcode.value = barcodeData.value;
    }
  });

  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) {
      alert("✅ Label saved for ALL products");
      return;
    }
    const product = cursor.value;
    product.labelTemplate = template;
    cursor.update(product);
    cursor.continue();
  };
}

document.getElementById("copyLabelBtn").addEventListener("click", () => {
  if (!selectedElement) {
    alert("Select any label element first");
    return;
  }

  const label = selectedElement.closest(".label");
  if (!label) return;

  copiedLabelTemplate = {};

  label.querySelectorAll(".draggable").forEach(el => {
    const key = el.classList.contains("shop-info") ? "shop" :
                el.classList.contains("product-info") ? "product" :
                el.classList.contains("dates") ? "dates" :
                el.classList.contains("barcode-container") ? "barcode" :
                null;

    if (!key) return;

    copiedLabelTemplate[key] = {
      x: el.getAttribute("data-x") || 0,
      y: el.getAttribute("data-y") || 0,
      rotate: el.getAttribute("data-rotate") || 0,
      fontSize: window.getComputedStyle(el).fontSize,
      color: window.getComputedStyle(el).color,
      fontFamily: window.getComputedStyle(el).fontFamily,
      align: window.getComputedStyle(el).textAlign,
      width: key === "barcode" ? barcodeWidth.value : null,
      height: key === "barcode" ? barcodeHeight.value : null,
      value: key === "barcode" ? barcodeData.value : null
    };
  });

  alert("📋 Label layout copied");
});

document.getElementById("pasteLabelBtn").addEventListener("click", () => {
  if (!copiedLabelTemplate) {
    alert("Copy a label first");
    return;
  }

  const code = barcodeData.value;
  if (!code) return alert("Select a product first");

  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  store.get(code).onsuccess = e => {
    const product = e.target.result;
    if (!product) return alert("Product not found");

    product.labelTemplate = copiedLabelTemplate;
    store.put(product);

    alert("✅ Label pasted to " + product.name);
  };
});


// Optional: update when format changes
barcodeFormat.addEventListener("change", updateBarcodeSize);