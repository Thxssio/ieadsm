type PixPayloadOptions = {
  pixKey: string;
  amount?: number | null;
  name?: string;
  city?: string;
  txid?: string;
};

const sanitizePixKey = (value: string) => {
  const cleaned = (value || "").trim();
  if (!cleaned) return "";
  if (cleaned.includes("@")) return cleaned;
  if (/[A-Za-z]/.test(cleaned)) return cleaned;
  return cleaned.replace(/\D/g, "");
};

const emv = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`;

const crc16Ccitt = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

const toAscii = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "");

const sanitizeName = (value: string) => {
  const cleaned = toAscii(value || "")
    .trim()
    .replace(/[^A-Za-z0-9 .\-_/]/g, "");
  return (cleaned || "N").slice(0, 25);
};

const sanitizeCity = (value: string) => {
  const cleaned = toAscii(value || "")
    .trim()
    .replace(/[^A-Za-z0-9 .\-_/]/g, "");
  return (cleaned || "C").slice(0, 15);
};

const sanitizeTxid = (value: string) => {
  const cleaned = toAscii(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9\-._*]/g, "");
  return (cleaned || "***").slice(0, 25);
};

export const generatePixPayload = ({
  pixKey,
  amount = null,
  name = "N",
  city = "C",
  txid = "***",
}: PixPayloadOptions) => {
  const key = sanitizePixKey(pixKey || "");
  if (!key) {
    throw new Error("pix_key vazio");
  }

  const gui = emv("00", "br.gov.bcb.pix");
  const keyField = emv("01", key);
  const mai = emv("26", gui + keyField);

  const parts = [
    emv("00", "01"),
    mai,
    emv("52", "0000"),
    emv("53", "986"),
  ];

  if (amount !== null && amount !== undefined && Number.isFinite(amount)) {
    parts.push(emv("54", Number(amount).toFixed(2)));
  }

  parts.push(
    emv("58", "BR"),
    emv("59", sanitizeName(name)),
    emv("60", sanitizeCity(city)),
    emv("62", emv("05", sanitizeTxid(txid)))
  );

  const withoutCrc = `${parts.join("")}6304`;
  return withoutCrc + crc16Ccitt(withoutCrc);
};

export const generatePixQrDataUrl = async (payload: string) => {
  const qrModule = await import("qrcode");
  const toDataURL = qrModule.toDataURL;

  if (!toDataURL) {
    throw new Error("QRCode export indisponivel");
  }

  return toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 192,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
};
