/* ===============================
   DUE BARCODE SCANNER HELPER
   Auto-fill Due Bill ID input from scanner
=============================== */

document.addEventListener("DOMContentLoaded", () => {
    const billInput = document.getElementById("due-billID");
    const fetchBtn = document.getElementById("due-fetchBtn");

    if (!billInput) return console.error("Due Bill ID input not found!");
    if (!fetchBtn) return console.error("Fetch Due Details button not found!");

    // Always keep the input focused
    function focusBillInput() {
        billInput.focus();
    }

    // Initial focus
    focusBillInput();

    // Refocus on click
    billInput.addEventListener("click", focusBillInput);

    // Handle barcode scanner input (keyboard-like)
    billInput.addEventListener("keydown", (e) => {
        // Scanner usually sends ENTER after barcode
        if (e.key === "Enter") {
            e.preventDefault();

            const scannedCode = billInput.value.trim();
            if (!scannedCode) return;

            console.log("Scanned Due Bill ID:", scannedCode);

            // Trigger the existing Fetch Due Details functionality
            fetchBtn.click();

            // Clear input for next scan
            billInput.value = "";

            // Refocus just in case
            focusBillInput();
        }
    });
});