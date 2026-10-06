import QRCode from "qrcode";

export async function GET(request: Request) {
  const url = new URL("/demo/guest-entry", request.url).href;
  const svg = await QRCode.toString(url, { type: "svg", margin: 4, errorCorrectionLevel: "M", color: { dark: "#294038", light: "#ffffff" } });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } });
}
