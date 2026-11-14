import tiktoken
from typing import Dict, Tuple, Optional

try:
    _encoder = tiktoken.get_encoding("cl100k_base")
except Exception:
    _encoder = None

# Pricing per million tokens (USD)
# Standard pricing for pay-as-you-go tiers (prompts <= 128k)
MODEL_PRICING: Dict[str, Dict[str, float]] = {
    "gemini-3.1-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-flash-lite-latest": {"input": 0.075, "output": 0.30},
    "gemini-3.5-flash": {"input": 0.075, "output": 0.30},
    "gemini": {"input": 0.075, "output": 0.30},
    "claude-3-7-sonnet": {"input": 3.00, "output": 15.00},
    "claude-3-5-sonnet": {"input": 3.00, "output": 15.00},
    "deepseek-chat-v3": {"input": 0.14, "output": 0.28},
    "deepseek-coder": {"input": 0.14, "output": 0.28},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "qwen2.5-coder:14b": {"input": 0.00, "output": 0.00},
    "bifrost-adaptive-router": {"input": 1.20, "output": 4.50},
    "default": {"input": 2.00, "output": 8.00}
}

def count_tokens(text: str, model_family: str = "standard_bpe") -> int:
    """
    Local Pre-Flight BPE Token Estimator.
    
    Technical Clarification:
    - This function provides a FAST LOCAL ESTIMATE for pre-flight budget checks and AST slicing.
    - Uses OpenAI tiktoken `cl100k_base` BPE as a standardized local reference baseline.
    - IMPORTANT: `cl100k_base` is NOT the exact Google Gemini tokenizer (which uses a SentencePiece
      256k vocabulary). Do NOT treat this local count as exact Gemini usage.
    - Post-execution, the actual source of truth for billed usage MUST ALWAYS be the provider's
      official `usageMetadata` (promptTokenCount + candidatesTokenCount).
    """
    if not text:
        return 0
    if _encoder:
        try:
            raw_count = len(_encoder.encode(text, disallowed_special=()))
            # Model-family specific token boundary calibrations
            if "claude" in model_family.lower():
                return int(raw_count * 1.04) # Anthropic token expansion factor on code
            elif "deepseek" in model_family.lower() or "qwen" in model_family.lower():
                return int(raw_count * 1.02)
            return raw_count
        except Exception:
            pass
    # Fallback heuristic: 1 token ~= 3.8 characters for code
    return max(1, int(len(text) / 3.8))

def calculate_cost(
    model_name: str,
    input_tokens: int,
    output_tokens: int,
    provider_rates: Optional[Tuple[float, float]] = None
) -> float:
    """
    Calculate exact USD cost for a given model and token counts.
    If provider_rates=(cost_per_m_in, cost_per_m_out) is passed, uses those exact rates.
    Otherwise, matches model_name against standardized MODEL_PRICING.
    """
    if input_tokens <= 0 and output_tokens <= 0:
        return 0.0

    if provider_rates and len(provider_rates) == 2:
        in_rate, out_rate = provider_rates
        in_cost = (input_tokens / 1_000_000) * in_rate
        out_cost = (output_tokens / 1_000_000) * out_rate
        return round(in_cost + out_cost, 6)

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

