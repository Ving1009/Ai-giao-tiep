"""Optional export from LoRA adapter; potentially high RAM/VRAM usage."""
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", required=True)
    parser.add_argument("--output", default="training/output/merged")
    parser.add_argument("--run-export", action="store_true")
    args = parser.parse_args()
    if not Path(args.adapter).exists():
        raise SystemExit("Adapter directory missing; train first.")
    if not args.run_export:
        print("DRY RUN: merge adapter", args.adapter, "into", args.output)
        return
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    model_id = "Qwen/Qwen3-0.6B"
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    base = AutoModelForCausalLM.from_pretrained(model_id, device_map="cpu", dtype="float32")
    model = PeftModel.from_pretrained(base, args.adapter, is_trainable=False)
    merged = model.merge_and_unload()
    merged.save_pretrained(args.output, safe_serialization=True)
    tokenizer.save_pretrained(args.output)
    print("Merged model written:", args.output)

if __name__ == "__main__":
    main()
