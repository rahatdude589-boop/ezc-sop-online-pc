/* ===============================
   BARCODE SCANNER HELPER
   Auto-fill search box from scanner
=============================== */

// Make sure this runs after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");

  if (!search) return console.error("Search box not found!");

  // Always keep the search box focused
  function focusSearch() {
    search.focus();
  }

  // Focus initially
  focusSearch();

  // Refocus on click (optional)
  search.addEventListener("click", focusSearch);

  // Handle barcode scanner input (keyboard-like)
  search.addEventListener("keydown", (e) => {
    // ENTER key is usually sent by scanner at the end of barcode
    if (e.key === "Enter") {
      e.preventDefault();

      const scannedCode = search.value.trim();
      if (!scannedCode) return;

      console.log("Scanned barcode:", scannedCode);

      // Call your existing function to search/add product
      if (typeof searchProduct === "function") {
        searchProduct();
      }

      // Clear search box for next scan
      search.value = "";

      // Refocus just in case
      focusSearch();
    }
  });
});