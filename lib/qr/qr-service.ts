import QRCode from "qrcode";
import jsQR from "jsqr";

export interface QRRenderOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Generates a high-contrast Data URL PNG for a QR payload string.
 */
export async function generateQRDataUrl(
  text: string,
  options: QRRenderOptions = {}
): Promise<string> {
  const {
    width = 360,
    margin = 2,
    darkColor = "#09090b",
    lightColor = "#ffffff",
    errorCorrectionLevel = text.length > 600 ? "L" : "M",
  } = options;

  return QRCode.toDataURL(text, {
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  });
}

/**
 * Decodes a QR code from an image File or Blob (useful when a device lacks a working camera
 * or the user takes a screenshot / photo of the QR code).
 */
export async function decodeQRFromImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Scale down very large photos to 1200px max dimension for fast, accurate QR detection
        const maxDim = 1200;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not initialize 2D canvas context for QR decoding."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        URL.revokeObjectURL(objectUrl);
        if (code && code.data) {
          resolve(code.data);
        } else {
          reject(new Error("No valid QR code found in the selected image."));
        }
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error("Failed to decode QR image."));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image file for QR scanning."));
    };

    img.src = objectUrl;
  });
}

