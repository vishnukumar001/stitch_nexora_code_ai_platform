import tiktoken
from typing import Dict, Tuple

try:
    _encoder = tiktoken.get_encoding("cl100k_base")
except Exception:
    _encoder = None

# Pricing per million tokens (USD)
MODEL_PRICING: Dict[str, Dict[str, float]] = {
    "claude-3-7-sonnet": {"input": 3.00, "output": 15.00},
    "deepseek-chat-v3": {"input": 0.14, "output": 0.28},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "qwen2.5-coder:14b": {"input": 0.00, "output": 0.00},
    "bifrost-adaptive-router": {"input": 1.20, "output": 4.50},
    "default": {"input": 2.00, "output": 8.00}
}

def count_tokens(text: str) -> int:
    """Exact token counting using tiktoken BPE tokenizer."""
    if not text:
        return 0
    if _encoder:
        try:
            return len(_encoder.encode(text, disallowed_special=()))
        except Exception:
            pass
    # Fallback heuristic: 1 token ~= 3.8 characters for code
    return max(1, int(len(text) / 3.8))

def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate exact USD cost for a given model and token counts."""
    pricing = None
    for key, val in MODEL_PRICING.items():
        if key in model_name.lower():
            pricing = val
            break
    if not pricing:
        pricing = MODEL_PRICING["default"]

    in_cost = (input_tokens / 1_000_000) * pricing["input"]
    out_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(in_cost + out_cost, 6)

def calculate_savings(
    raw_tokens: int,
    compressed_tokens: int,
    output_tokens: int,
    target_model: str,
    baseline_model: str = "gpt-4o"
) -> Tuple[int, float, float, float]:
    """
    Returns:
    (tokens_saved, compression_ratio_pct, baseline_cost_usd, optimized_cost_usd)
    """
    tokens_saved = max(0, raw_tokens - compressed_tokens)
    compression_ratio = round((tokens_saved / max(1, raw_tokens)) * 100, 1)

    # Cost of uncompressed prompt using frontier baseline
    baseline_cost = calculate_cost(baseline_model, raw_tokens, output_tokens)

    # Cost using NEXORA compression + target cascade model
    optimized_cost = calculate_cost(target_model, compressed_tokens, output_tokens)

    dollars_saved = round(max(0.0, baseline_cost - optimized_cost), 4)

    return tokens_saved, compression_ratio, baseline_cost, dollars_saved

