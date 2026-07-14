import * as QRCode from "qrcode";

export interface VietQrParams {
  bankBin: string;
  bankAccountNo: string;
  bankAccountName: string;
  amount: number;
  orderId: number;
}

function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildVietQrPayload(params: VietQrParams): string {
  const { bankBin, bankAccountNo, bankAccountName, amount, orderId } = params;

  const consumerAccount = tlv("00", bankBin) + tlv("01", bankAccountNo);
  const beneficiaryInfo =
    tlv("00", "A000000727") +
    tlv("01", consumerAccount) +
    tlv("02", "QRIBFTTA");

  const purpose = `DH${orderId}`.slice(0, 25);
  const additionalData = tlv("08", purpose);

  const merchantName = (bankAccountName || "STORE").slice(0, 25);
  const merchantCity = "VIETNAM";
  const amountStr = Math.max(0, Math.round(amount)).toString();

  let payload = "";
  payload += tlv("00", "01");
  payload += tlv("01", "12");
  payload += tlv("38", beneficiaryInfo);
  payload += tlv("52", "0000");
  payload += tlv("53", "704");
  payload += tlv("54", amountStr);
  payload += tlv("58", "VN");
  payload += tlv("59", merchantName);
  payload += tlv("60", merchantCity);
  payload += tlv("62", additionalData);

  const crcInput = payload + "6304";
  const crc = crc16ccitt(crcInput);
  payload += `6304${crc}`;

  return payload;
}

export async function generateVietQrImage(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 300,
  });
}
