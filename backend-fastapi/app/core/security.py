from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Any, expires_delta: Optional[int] = None, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    expire_seconds = expires_delta if expires_delta is not None else settings.JWT_EXPIRATION
    expire = datetime.now(timezone.utc) + timedelta(seconds=expire_seconds)
    
    to_encode = {"sub": str(subject), "exp": expire, "type": "access"}
    if extra_claims:
        to_encode.update(extra_claims)
        
    secret = getattr(settings, "JWT_ACCESS_SECRET", settings.JWT_SECRET)
    return jwt.encode(to_encode, secret, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(subject: Any, expires_delta: Optional[int] = None) -> str:
    expire_seconds = expires_delta if expires_delta is not None else settings.REFRESH_TOKEN_EXPIRATION
    expire = datetime.now(timezone.utc) + timedelta(seconds=expire_seconds)
    
    to_encode = {"sub": str(subject), "exp": expire, "type": "refresh"}
    secret = getattr(settings, "JWT_REFRESH_SECRET", settings.JWT_SECRET)
    return jwt.encode(to_encode, secret, algorithm=settings.JWT_ALGORITHM)

def decode_jwt_token(token: str, secret_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    secret = secret_key or getattr(settings, "JWT_ACCESS_SECRET", settings.JWT_SECRET)
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
