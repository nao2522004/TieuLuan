from dataclasses import dataclass
from typing import Optional
import io


@dataclass
class VietQrParams:
    bank_bin: str           
    bank_account_no: str    
    bank_account_name: str  
    amount: int            
    order_id: int          


def _tlv(tag: str, value: str) -> str:
    length = str(len(value)).zfill(2)
    return f"{tag}{length}{value}"


def _crc16_ccitt(data: str) -> str:
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
    consumer_account = _tlv("00", params.bank_bin) + _tlv("01", params.bank_account_no)
    beneficiary_info = (
        _tlv("00", "A000000727")
        + _tlv("01", consumer_account)
        + _tlv("02", "QRIBFTTA")
    )

    purpose = f"DH{params.order_id}"[:25]
    additional_data = _tlv("08", purpose)

    merchant_name = (params.bank_account_name or "STORE")[:25]
    amount_str = str(max(0, round(params.amount)))

    payload = (
        _tlv("00", "01")
        + _tlv("01", "12")
        + _tlv("38", beneficiary_info)
        + _tlv("52", "0000")
        + _tlv("53", "704")
        + _tlv("54", amount_str)
        + _tlv("58", "VN")
        + _tlv("59", merchant_name)
        + _tlv("60", "VIETNAM")
        + _tlv("62", additional_data)
    )

    crc = _crc16_ccitt(payload + "6304")
    return payload + f"6304{crc}"


def generate_viet_qr_base64(payload: str, size: int = 300) -> str:
    try:
        import qrcode
        import base64
        qr = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=1,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/png;base64,{b64}"
    except ImportError:
        raise RuntimeError("Cần cài: pip install qrcode[pil]")
