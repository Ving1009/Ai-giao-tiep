"""Validate original Vietnamese conversations and produce TRL conversational JSONL.
No third-party datasets, scraping, or personal conversations are imported.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

SPLITS = ("train", "validation", "test")
ROLES = ("user", "assistant")

def fingerprint(text):
    normalized = unicodedata.normalize("NFKC", text).casefold()
    return re.sub(r"\s+", " ", normalized).strip()

def validate(item, line):
    for field in ("messages", "split", "category", "source_id", "license", "review_status"):
        if field not in item:
            raise ValueError(f"Line {line}: missing {field}")
    if item["split"] not in SPLITS:
        raise ValueError(f"Line {line}: invalid split")
    if item["review_status"] not in ("reviewed", "unreviewed"):
        raise ValueError(f"Line {line}: invalid review status")
    if not item["source_id"] or not item["license"]:
        raise ValueError(f"Line {line}: missing source or license")
    messages = item["messages"]
    if not isinstance(messages, list) or len(messages) < 2 or len(messages) > 10 or len(messages) % 2:
        raise ValueError(f"Line {line}: expected 2-10 alternating messages")
    cleaned = []
    for index, msg in enumerate(messages):
        if not isinstance(msg, dict) or msg.get("role") != ROLES[index % 2]:
            raise ValueError(f"Line {line}: roles must alternate user/assistant")
        value = msg.get("content")
        if not isinstance(value, str) or not value.strip() or len(value) > 4000:
            raise ValueError(f"Line {line}: empty/oversized content")
        if re.search(r"\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b", value):
            raise ValueError(f"Line {line}: possible email/PII")
        cleaned.append({"role": msg["role"], "content": value.strip()})
    return cleaned

def prepare(source, destination):
    destination.mkdir(parents=True, exist_ok=True)
    splits = {split: [] for split in SPLITS}
    hashes, questions = set(), set()
    category_counts = Counter()
    source_counts = Counter()
    review_counts = Counter()
    with source.open(encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, 1):
            if not raw.strip():
                continue
            item = json.loads(raw)
            messages = validate(item, line_number)
            key = fingerprint(json.dumps(messages, ensure_ascii=False))
            first_question = fingerprint(messages[0]["content"])
            if key in hashes or first_question in questions:
                raise ValueError(f"Line {line_number}: duplicate dialogue or first question")
            hashes.add(key)
            questions.add(first_question)
            splits[item["split"]].append({"messages": messages})
            category_counts[item["category"]] += 1
            source_counts[item["source_id"]] += 1
            review_counts[item["review_status"]] += 1
    if any(not records for records in splits.values()):
        raise ValueError("All train/validation/test splits must be nonempty")
    for split, records in splits.items():
        with (destination / f"{split}.jsonl").open("w", encoding="utf-8") as handle:
            for record in records:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    manifest = {
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "splits": {name: len(rows) for name, rows in splits.items()},
        "categories": dict(category_counts),
        "sources": dict(source_counts),
        "review": dict(review_counts),
        "ready_for_production_training": review_counts["unreviewed"] == 0,
        "note": "Synthetic project-authored sample; human review required before production."
    }
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("training/datasets/raw_curated.jsonl"))
    parser.add_argument("--output", type=Path, default=Path("training/datasets/processed"))
    args = parser.parse_args()
    print(json.dumps(prepare(args.input, args.output), indent=2, ensure_ascii=False))
