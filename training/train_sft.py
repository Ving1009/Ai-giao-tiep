"""GPU-only SFT. Requires explicit --run-training; demo data needs extra opt-in."""
import argparse
import json
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=Path("training/config/sft.json"))
    parser.add_argument("--run-training", action="store_true")
    parser.add_argument("--smoke-test", action="store_true", help="One training step, not a model quality test")
    parser.add_argument("--allow-sample-data", action="store_true")
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    manifest_path = Path("training/datasets/processed/manifest.json")
    if not manifest_path.exists():
        raise SystemExit("First run: python -m training.prepare_data")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    print("Base model:", config["model_id"], "| dataset:", manifest["splits"])
    print("Review:", manifest["review"], "| requested smoke:", args.smoke_test)
    if not args.run_training:
        print("DRY RUN ONLY: pass --run-training to start GPU fine-tuning.")
        return
    if not manifest["ready_for_production_training"] and not args.allow_sample_data:
        raise SystemExit("Dataset contains unreviewed samples. Use --allow-sample-data for experimental runs only.")
    import torch
    if not torch.cuda.is_available():
        raise SystemExit("CUDA GPU not available: no training started.")
    from datasets import load_dataset
    from peft import LoraConfig
    from transformers import AutoTokenizer, BitsAndBytesConfig
    from trl import SFTConfig, SFTTrainer
    train_path = "training/datasets/processed/train.jsonl"
    eval_path = "training/datasets/processed/validation.jsonl"
    dataset = load_dataset("json", data_files={"train": train_path, "validation": eval_path})
    tokenizer = AutoTokenizer.from_pretrained(config["model_id"], trust_remote_code=False)
    precision = "bf16" if torch.cuda.is_bf16_supported() else "fp16"
    output = config["output_dir"]
    if args.smoke_test:
        output = str(Path(output) / "smoke-test")
    training_args = SFTConfig(
        output_dir=output,
        num_train_epochs=config["epochs"],
        max_steps=1 if args.smoke_test else -1,
        learning_rate=config["learning_rate"],
        per_device_train_batch_size=config["batch_size"],
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=config["gradient_accumulation_steps"],
        max_length=config["max_length"],
        assistant_only_loss=True,
        eos_token="<|im_end|>",
        bf16=precision == "bf16",
        fp16=precision == "fp16",
        eval_strategy="no" if args.smoke_test else config["eval_strategy"],
        save_strategy="no" if args.smoke_test else config["save_strategy"],
        save_total_limit=config["save_total_limit"],
        gradient_checkpointing=config["gradient_checkpointing"],
        logging_steps=config["logging_steps"],
        report_to="none",
        seed=config["seed"],
        model_init_kwargs={"dtype": "bfloat16" if precision == "bf16" else "float16",
                           "trust_remote_code": False}
    )
    lora = LoraConfig(
        r=config["lora_r"], lora_alpha=config["lora_alpha"],
        lora_dropout=config["lora_dropout"], bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "up_proj", "down_proj", "gate_proj"]
    )
    quant = None
    if config["quantization_4bit"]:
        try:
            import bitsandbytes  # noqa: F401
        except ImportError:
            raise SystemExit("Install bitsandbytes>=0.45.1 for QLoRA on supported CUDA GPUs")
        quant = BitsAndBytesConfig(
            load_in_4bit=True, bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16 if precision == "bf16" else torch.float16,
            bnb_4bit_use_double_quant=True
        )
    trainer = SFTTrainer(
        model=config["model_id"],
        args=training_args, train_dataset=dataset["train"], eval_dataset=dataset["validation"],
        peft_config=lora, processing_class=tokenizer, quantization_config=quant
    )
    trainer.train(resume_from_checkpoint=None if args.smoke_test else config.get("resume_from_checkpoint"))
    trainer.save_model(output)
    tokenizer.save_pretrained(output)
    print("Saved adapter to", output, "(not a verified quality improvement)")

if __name__ == "__main__":
    main()
