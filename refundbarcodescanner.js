/* ===============================
   BARCODE SCANNER HELPER
   Auto-fill Bill ID input from scanner
=============================== */

document.addEventListener("DOMContentLoaded", () => {
    const billInput = document.getElementById("billInput");

    if (!billInput) return console.error("Bill ID input not found!");

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

            console.log("Scanned Bill ID:", scannedCode);

            // Trigger the existing Load Sale functionality
            if (typeof loadBtn !== "undefined" && loadBtn instanceof HTMLElement) {
                loadBtn.click();
            }

            // Clear input for next scan
            billInput.value = "";

            // Refocus just in case
            focusBillInput();
        }
    });
});