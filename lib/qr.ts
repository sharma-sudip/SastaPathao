import "server-only";

import QRCode from "qrcode";

/** PNG data URI -- embeddable directly in an <img>/react-email <Img>, no
 *  separate asset hosting needed. */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 360, margin: 1 });
}
