 <select id="langSelect">
  <option value="en">English</option>
  <option value="bn">বাংলা</option>
</select> 
data-i18n="billing" 
 <script src="lang.js"></script>

/* =========================
   NORMAL + PROFESSIONAL LANGUAGE BUTTON
   ========================= */

#langSelect{
  position:absolute;
  left:50%;
  transform:translateX(-50%);

  min-width:150px;
  height:38px;

  padding:0 34px 0 12px;

  font-size:14px;
  font-family:Arial, sans-serif;
  font-weight:500;
  color:#374151;

  background:#ffffff;
  border:1px solid #d1d5db;
  border-radius:6px;

  cursor:pointer;
  outline:none;

  appearance:none;
  -webkit-appearance:none;
  -moz-appearance:none;

  /* arrow icon */
  background-image:url("data:image/svg+xml;utf8,<svg fill='%236b7280' height='18' viewBox='0 0 20 20' width='18' xmlns='http://www.w3.org/2000/svg'><path d='M5.5 7l4.5 5 4.5-5z'/></svg>");
  background-repeat:no-repeat;
  background-position:right 10px center;
  background-size:15px;

  transition:all 0.2s ease;
}

/* hover */
#langSelect:hover{
  border-color:#f7f7f7;
  background:#f8fafc;
}

/* click/focus */
#langSelect:focus{
  border-color:#ffffff;
  box-shadow:0 0 0 3px rgba(37,99,235,.12);
}



const translations = {  
  en: {
    billing: "Billing",
    sales_report: "Sales Report",
    stock_history: "Stock History",
    refund_report: "Refund Report",
    due_report: "Due Report",
    backup_all: "Backup All",
    restore_all: "Restore All",
    search: "Search",
    scan_search: "Scan or search product",

    item: "Item",
    qty: "Qty",
    price: "Price",
    total: "Total",
    action: "Action",

    subtotal: "Subtotal",
    grand_total: "Grand Total",

    customer_name: "Customer Name",
    phone_number: "Phone Number",
    cashier_name: "Cashier Name",
    comment: "Comment / Note",

    refund: "Refund",
    receive_due: "Receive Due",
    complete_sale: "Complete Sale",
    print_receipt: "Print Receipt",
    print_a4: "Print A4",

    shop_info: "Shop Info",
    shop_name: "Shop Name",
    shop_address: "Shop Address",
    phone: "Phone",

    save: "Save",
    make_label: "Make Label",
    product_list: "Product List",
    vendor_list: "Vendor List"
  },

  bn: {
    billing: "বিলিং",
    sales_report: "বিক্রয় রিপোর্ট",
    stock_history: "স্টক ইতিহাস",
    refund_report: "ফেরত রিপোর্ট",
    due_report: "পাত্তনা রিপোর্ট",
    backup_all: "সব ব্যাকআপ",
    restore_all: "সব পুনরুদ্ধার",
    search: "খুঁজুন",
    scan_search: "স্ক্যান বা পণ্য খুঁজুন",

    item: "আইটেম",
    qty: "পরিমাণ",
    price: "দাম",
    total: "মোট",
    action: "অ্যাকশন",

    subtotal: "মোট",
    grand_total: "সর্বমোট",

    customer_name: "গ্রাহকের নাম",
    phone_number: "ফোন নম্বর",
    cashier_name: "ক্যাশিয়ারের নাম",
    comment: "মন্তব্য",

    refund: "ফেরত",
    receive_due: "পাত্তনা গ্রহণ",
    complete_sale: "বিক্রয় সম্পন্ন",
    print_receipt: "রিসিপ্ট প্রিন্ট",
    print_a4: "A4 প্রিন্ট",

    shop_info: "দোকানের তথ্য",
    shop_name: "দোকানের নাম",
    shop_address: "ঠিকানা",
    phone: "ফোন",

    save: "সেভ",
    make_label: "লেবেল তৈরি",
    product_list: "পণ্যের তালিকা",
    vendor_list: "ভেন্ডর তালিকা"
  }
};

// Apply language
function setLanguage(lang) {
  localStorage.setItem("lang", lang);

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.innerText = translations[lang][key] || el.innerText;
  });
}

// Load saved language
window.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("lang") || "en";
  setLanguage(savedLang);

  const selector = document.getElementById("langSelect");
  if (selector) {
    selector.value = savedLang;

    selector.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }
});