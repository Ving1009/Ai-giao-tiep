"""Generate unscored answers for independent manual / automated review.
This script never invents benchmark scores. Use same prompts for base and adapter.
"""
import argparse
import json
import os
import time
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, default=Path("training/datasets/eval_cases.jsonl"))
    parser.add_argument("--adapter", default="")
    parser.add_argument("--output", type=Path, default=Path("training/output/evaluation.jsonl"))
    parser.add_argument("--run-evaluation", action="store_true")
    args = parser.parse_args()
    records = [json.loads(line) for line in args.cases.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert records and all("question" in row and "category" in row for row in records)
    print("Independent cases:", len(records), "adapter:", args.adapter or "(base)")
    if not args.run_evaluation:
        print("DRY RUN ONLY. Use --run-evaluation to generate real answers.")
        return
    from inference.model_loader import LocalModel
    model = LocalModel()
    model.adapter = args.adapter
    model.version = "adapter" if args.adapter else "base"
    model.load()
    class Options:
        max_new_tokens = 192
        temperature = 0.7
    output = []
    for row in records:
        start = time.perf_counter()
        # History is not needed for basic cases; optional history can be added later.
        class Msg:
            def __init__(self, value):
                self.role = value["role"]
                self.content = value["content"]
        history = [Msg(m) for m in row.get("history", [])]
        try:
            answer = model.generate(row["question"], history, Options())
            error = None
        except Exception as exc:
            answer, error = None, type(exc).__name__
        output.append({
            "id": row.get("id"), "category": row["category"], "model": model.model_id,
            "version": model.version, "answer": answer, "error": error,
            "latency_ms": round((time.perf_counter() - start) * 1000, 1),
            "quality_rating": None, "reviewer_notes": None
        })
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in output), encoding="utf-8")
    print("Actual inference results saved:", args.output, "| quality_rating left UNRATED")

if __name__ == "__main__":
    main()
