import hashlib
import json
import time
from typing import Optional, Dict, Any

class SemanticCache:
    """
    In-Memory & Hash-based Semantic Query and AST Symbol Cache.
    Prevents redundant LLM API calls and achieves 0-token hits on repeated queries.
    """
    def __init__(self, max_size: int = 500):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def _make_key(self, repo_id: str, prompt: str, target_scope: str = "") -> str:
        raw = f"{repo_id}:{prompt.strip().lower()}:{target_scope}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, repo_id: str, prompt: str, target_scope: str = "") -> Optional[Dict[str, Any]]:
        key = self._make_key(repo_id, prompt, target_scope)
        if key in self._cache:
            entry = self._cache[key]
            # TTL of 1 hour
            if time.time() - entry["timestamp"] < 3600:
                self.hits += 1
                return entry["data"]
            else:
                del self._cache[key]
        self.misses += 1
        return None

    def set(self, repo_id: str, prompt: str, data: Dict[str, Any], target_scope: str = ""):
        if len(self._cache) >= self.max_size:
            # Evict oldest
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k]["timestamp"])
            del self._cache[oldest_key]

        key = self._make_key(repo_id, prompt, target_scope)
        self._cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

    def stats(self) -> Dict[str, Any]:
        total = max(1, self.hits + self.misses)
        return {
            "size": len(self._cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_pct": round((self.hits / total) * 100, 1)
        }

    def clear(self):
        self._cache.clear()
        self.hits = 0
        self.misses = 0

# Global singleton cache instance
semantic_cache = SemanticCache()

