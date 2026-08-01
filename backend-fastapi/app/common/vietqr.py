import base64
from dataclasses import dataclass
import io
from typing import Optional


@dataclass
class VietQrParams:
    bank_bin: str
    bank_account_no: str
    bank_account_name: str
    amount: float
    order_id: int


def tlv(tag: str, value: str) -> str:
    length = str(len(value)).zfill(2)
    return f"{tag}{length}{value}"


def crc16_ccitt(data: str) -> str:
    crc = 0xFFFF
    for ch in data:
        crc ^= ord(ch) << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return format(crc, "04X")


def build_viet_qr_payload(params: VietQrParams) -> str:
    consumer_account = tlv("00", params.bank_bin) + tlv("01", params.bank_account_no)
    beneficiary_info = (
        tlv("00", "A000000727") + tlv("01", consumer_account) + tlv("02", "QRIBFTTA")
    )

    purpose = f"DH{params.order_id}"[:25]
    additional_data = tlv("08", purpose)

    merchant_name = (params.bank_account_name or "STORE")[:25]
    amount_str = str(max(0, round(params.amount)))

    payload = (
        tlv("00", "01")
        + tlv("01", "12")
        + tlv("38", beneficiary_info)
        + tlv("52", "0000")
        + tlv("53", "704")
        + tlv("54", amount_str)
        + tlv("58", "VN")
        + tlv("59", merchant_name)
        + tlv("60", "VIETNAM")
        + tlv("62", additional_data)
    )

    crc = crc16_ccitt(payload + "6304")
    return payload + f"6304{crc}"


def generate_viet_qr_image(payload: str, width: int = 300) -> str:
    try:
        import qrcode
        from PIL import Image

        qr = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=1,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf)
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/png;base64,{b64}"
    except Exception:
        # Fallback to SVG Data URL when qrcode or Pillow is not installed/fails
        try:
            import qrcode
            import qrcode.image.svg

            qr = qrcode.QRCode(
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=1,
                image_factory=qrcode.image.svg.SvgImage,
            )
            qr.add_data(payload)
            qr.make(fit=True)
            img = qr.make_image()
            buf = io.BytesIO()
            img.save(buf)
            b64 = base64.b64encode(buf.getvalue()).decode()
            return f"data:image/svg+xml;base64,{b64}"
        except Exception:
            import urllib.parse

            encoded = urllib.parse.quote(payload)
            return f"https://api.qrserver.com/v1/create-qr-code/?size={width}x{width}&data={encoded}"


generate_viet_qr_base64 = generate_viet_qr_image
