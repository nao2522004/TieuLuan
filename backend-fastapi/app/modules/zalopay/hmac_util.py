import hashlib
import hmac


def hmac_sha256(data: str, key: str) -> str:
    return hmac.new(
        key.encode("utf-8"), data.encode("utf-8"), hashlib.sha256
    ).hexdigest()
