# Data card — mẫu hội thoại tiếng Việt v1

- Origin: examples written specifically for this repository, not scraped from websites or personal chat logs.
- Identifier: project-authored-v1.
- License: CC0-1.0 for the authored example text. Do not infer any third-party dataset permission from this license.
- Review: all rows currently "unreviewed"; these are **synthetic examples**, not human-validated production training data.
- Categories A (natural), B (multi-turn), C (THPT), D (admissions), E (uncertainty/privacy).
- Files: raw_curated.jsonl (training splits), preferences.sample.jsonl (DPO format, illustrative only), eval_cases.jsonl (independent prompts, NO ground-truth model outputs).
- Train/validation/test: curated split labels. First user questions are distinct across all splits. The evaluation prompts are separate and never placed in train.
- Potential weaknesses: small sample, synthetic language diversity, no calibrated safety/admissions benchmark, not sufficient for production-quality Vietnamese fine-tuning.
- Expansion: obtain datasets with audited licenses, anonymize with consent, deduplicate, manual-review every risk-sensitive/admissions claim, split by conversation/source and track versions/hashes. Do not include confidential student records.
