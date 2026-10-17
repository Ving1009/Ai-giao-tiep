"""Optional preference alignment after reviewed SFT. Requires GPU and explicit opt-in."""
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", required=True, help="Path to existing SFT adapter")
    parser.add_argument("--dataset", default="training/datasets/preferences.sample.jsonl")
    parser.add_argument("--output", default="training/output/dpo-adapter")
    parser.add_argument("--run-training", action="store_true")
    parser.add_argument("--allow-sample-data", action="store_true")
    args = parser.parse_args()
    if not Path(args.adapter).exists():
        raise SystemExit("SFT adapter not found")
    if not Path(args.dataset).exists():
        raise SystemExit("Preference dataset not found")
    if not args.run_training:
        print("DRY RUN: SFT adapter:", args.adapter, "| preferences:", args.dataset)
        return
    if args.dataset.endswith("preferences.sample.jsonl") and not args.allow_sample_data:
        raise SystemExit("Review sample preferences first or pass --allow-sample-data for experiment.")
    import torch
    if not torch.cuda.is_available():
        raise SystemExit("CUDA GPU not available: no DPO training started.")
    from datasets import load_dataset
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    from trl import DPOConfig, DPOTrainer
    model_id = "Qwen/Qwen3-0.6B"
    precision = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    base = AutoModelForCausalLM.from_pretrained(model_id, dtype=precision, device_map="auto")
    model = PeftModel.from_pretrained(base, args.adapter, is_trainable=True)
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    dataset = load_dataset("json", data_files=args.dataset, split="train")
    trainer = DPOTrainer(
        model=model,
        args=DPOConfig(
            output_dir=args.output, learning_rate=5e-6, per_device_train_batch_size=1,
            gradient_accumulation_steps=4, num_train_epochs=1, max_length=1024,
            bf16=precision == torch.bfloat16, fp16=precision == torch.float16,
            save_strategy="epoch", report_to="none"
        ),
        train_dataset=dataset, processing_class=tokenizer
    )
    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)
    print("DPO adapter saved to", args.output)

if __name__ == "__main__":
    main()
