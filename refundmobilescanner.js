document.addEventListener("DOMContentLoaded", () => {
  const cameraBtn = document.getElementById("cameraBtn");
    const scannerModal = document.getElementById("scannerModal");
  const readerDiv = document.getElementById("reader");
  const billInput = document.getElementById("billInput");

  let html5QrCode = null;
  let scanning = false;
  let timeoutId = null;

  async function stopScanner() {
    if (html5QrCode && scanning) {
      try {
        const state = html5QrCode.getState && html5QrCode.getState();
        if (state === Html5QrcodeScannerState.SCANNING) await html5QrCode.stop();
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
          console.log("Scanned Bill ID:", qrCodeMessage);

          // Fill bill input
          billInput.value = qrCodeMessage;

          // Trigger Load Sale
          if (typeof loadBtn !== "undefined" && loadBtn instanceof HTMLElement) {
            loadBtn.click();
          }

          // Auto close scanner
          stopScanner();
        },
        errorMessage => {
          // Ignore scan errors
        }
      );

      // Auto-stop if no barcode detected in 15s
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

  cameraBtn.addEventListener("click", startScanner);
});