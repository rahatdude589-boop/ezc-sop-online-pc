document.addEventListener("DOMContentLoaded", () => {
  const scanBtn = document.getElementById("scanBtn");
  const scannerModal = document.getElementById("scannerModal");
  const readerDiv = document.getElementById("reader");
  const searchInput = document.getElementById("search");

  let html5QrCode = null;
  let scanning = false;
  let timeoutId = null;

  async function stopScanner() {
    if (html5QrCode && scanning) {
      try {
        const isScanning = html5QrCode.getState() === Html5QrcodeScannerState.SCANNING;
        if (isScanning) await html5QrCode.stop();
      } catch (err) {
        console.warn("Scanner stop error:", err);
      }
      html5QrCode.clear();
    }

    scannerModal.style.display = "none";
    scanning = false;
    clearTimeout(timeoutId);
  }

  async function startScanner() {
    if (scanning) return;

    scannerModal.style.display = "flex";

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    scanning = true;

    //const config = { fps: 10, qrbox: { width: 250, height: 250 } };
     const config = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  formatsToSupport: [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E
  ]
}; 

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        qrCodeMessage => {
          console.log("Scanned barcode:", qrCodeMessage);

          // Fill search input
          searchInput.value = qrCodeMessage;

          // Trigger search if function exists
          if (typeof searchProduct === "function") searchProduct();

          // Auto close scanner
          stopScanner();
        },
        errorMessage => {
          // ignore scan errors
        }
      );

      // Auto-stop if no barcode detected in 15 seconds
      timeoutId = setTimeout(() => {
        alert("No barcode detected. Scanner closing.");
        stopScanner();
      }, 15000);

    } catch (err) {
      console.error("Unable to start scanner:", err);
      alert("Cannot access camera. Scanner closed.");
      scanning = false;
      scannerModal.style.display = "none";
    }
  }

  // Open scanner on button click
  scanBtn.addEventListener("click", startScanner);
});