import QRCode from "qrcode";

export async function qrPngBufferForSessionCode(code: string): Promise<Buffer> {
  const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const url = `${base.replace(/\/$/, "")}/view/${code}`;
  return QRCode.toBuffer(url, { width: 512, margin: 2 });
}
