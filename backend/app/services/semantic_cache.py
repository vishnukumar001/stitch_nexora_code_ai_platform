import hashlib
import json
import time
from typing import Optional, Dict, Any, Tuple

class SemanticCache:
    """
    In-Memory & Hash-based Semantic Query and AST Symbol Cache.
    Prevents redundant LLM API calls and achieves 0-token hits on repeated queries.
    Supports both instance usage (semantic_cache.get) and class-level usage (SemanticCache.get).
    """
    _default_instance: Optional['SemanticCache'] = None

    def __init__(self, max_size: int = 500):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def _make_key(self, repo_id: str, prompt: str, target_scope: str = "") -> str:
        raw = f"{repo_id}:{prompt.strip().lower()}:{target_scope}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _normalize_args(a: str, b: str) -> Tuple[str, str]:
        # Accepts either (repo_id, prompt) or (prompt, repo_id)
        if str(a).startswith("repo-"):
            return str(a), str(b)
        if str(b).startswith("repo-"):
            return str(b), str(a)
        return str(a), str(b)

    def _instance_get(self, a: str, b: str, target_scope: str = "") -> Optional[Dict[str, Any]]:
        repo_id, prompt = self._normalize_args(a, b)
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

    def _instance_set(self, a: str, b: str, data: Dict[str, Any], target_scope: str = ""):
        repo_id, prompt = self._normalize_args(a, b)
        if len(self._cache) >= self.max_size:
            # Evict oldest
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k]["timestamp"])
            del self._cache[oldest_key]

        key = self._make_key(repo_id, prompt, target_scope)
        self._cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

    def _instance_stats(self) -> Dict[str, Any]:
        total = max(1, self.hits + self.misses)
        return {
            "size": len(self._cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_pct": round((self.hits / total) * 100, 1)
        }

    def _instance_clear(self):
        self._cache.clear()
        self.hits = 0
        self.misses = 0

    @classmethod
    def get(cls, a: str, b: str, target_scope: str = "") -> Optional[Dict[str, Any]]:
        target = semantic_cache if semantic_cache is not None else cls._get_default()
        return target._instance_get(a, b, target_scope)

    @classmethod
    def set(cls, a: str, b: str, data: Dict[str, Any], target_scope: str = ""):
        target = semantic_cache if semantic_cache is not None else cls._get_default()
        target._instance_set(a, b, data, target_scope)

    @classmethod
    def stats(cls) -> Dict[str, Any]:
        target = semantic_cache if semantic_cache is not None else cls._get_default()
        return target._instance_stats()

    @classmethod
    def clear(cls):
        target = semantic_cache if semantic_cache is not None else cls._get_default()
        target._instance_clear()

    @classmethod
    def _get_default(cls) -> 'SemanticCache':
        if cls._default_instance is None:
            cls._default_instance = SemanticCache()
        return cls._default_instance


# Global singleton cache instance
semantic_cache = SemanticCache()
SemanticCache._default_instance = semantic_cache
