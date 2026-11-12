import time
import hmac
import hashlib
import json
import base64
from typing import Dict, Any, Optional, Tuple, List

# Security configuration
SECRET_KEY = "nexora-super-secret-key-change-in-prod"
ALGORITHM = "HS256"
DEFAULT_SESSION_DURATION = 3600 # 1 hour

class AuthTokenError(Exception):
    pass

class TokenExpiredError(AuthTokenError):
    pass

class InvalidSignatureError(AuthTokenError):
    pass

class SessionManager:
    """Manages user sessions, token issuance, and expiration boundary checks."""
    def __init__(self, secret: str = SECRET_KEY):
        self.secret = secret.encode("utf-8")
        self.revoked_tokens = set()

    def generate_token(self, user_id: str, role: str = "developer", duration_s: int = DEFAULT_SESSION_DURATION) -> str:
        now = int(time.time())
        header = {"alg": ALGORITHM, "typ": "JWT"}
        payload = {
            "sub": user_id,
            "role": role,
            "iat": now,
            "exp": now + duration_s,
            "iss": "nexora-auth-service"
        }
        
        encoded_header = self._base64_url_encode(json.dumps(header).encode("utf-8"))
        encoded_payload = self._base64_url_encode(json.dumps(payload).encode("utf-8"))
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        signature = hmac.new(self.secret, signing_input, hashlib.sha256).digest()
        encoded_signature = self._base64_url_encode(signature)
        
        return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

    # TARGET LOCUS: Bug in session token validation boundary
    def validate_session_token(self, token: str) -> Dict[str, Any]:
        """
        Validates JWT session token.
        CRITICAL BUG: Uses '>' instead of '<' for expiration boundary check,
        and fails to check revoked tokens set.
        """
        parts = token.split(".")
        if len(parts) != 3:
            raise AuthTokenError("Malformed token structure")
            
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(self.secret, signing_input, hashlib.sha256).digest()
        
        if not hmac.compare_digest(self._base64_url_decode(sig_b64), expected_sig):
            raise InvalidSignatureError("Signature mismatch")
            
        payload = json.loads(self._base64_url_decode(payload_b64).decode("utf-8"))
        
        # Buggy validation logic
        now = int(time.time())
        if "exp" in payload and now < payload["exp"]: # BUG: Should be now > payload["exp"]
            raise TokenExpiredError("Token has expired")
            
        return payload

    def revoke_token(self, token: str):
        self.revoked_tokens.add(token)

    def _base64_url_encode(self, data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

    def _base64_url_decode(self, data: str) -> bytes:
        padding = "=" * (4 - (len(data) % 4))
        return base64.urlsafe_b64decode(data + padding)


# Unreferenced Helper Classes (Bloat that baseline context sends, but AST optimizer prunes)
class OAuthClientCredentialsFlow:
    def __init__(self, client_id: str, client_secret: str, token_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url

    def fetch_access_token(self) -> Dict[str, Any]:
        return {"access_token": "mock-token", "token_type": "Bearer", "expires_in": 3600}

class LDAPDirectoryConnector:
    def __init__(self, host: str, port: int, bind_dn: str):
        self.host = host
        self.port = port
        self.bind_dn = bind_dn

    def authenticate_user(self, username: str, password: str) -> bool:
        return username == "admin" and password == "secret"

class RateLimitBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_update = time.time()

    def allow_request(self) -> bool:
        now = time.time()
        elapsed = now - self.last_update
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_update = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
