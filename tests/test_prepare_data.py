import json
import tempfile
import unittest
from pathlib import Path
from training.prepare_data import prepare

def item(split, question):
    return {"messages":[{"role":"user","content":question},{"role":"assistant","content":"Trả lời minh họa."}],
            "split":split,"category":"A","source_id":"unit-test","license":"CC0-1.0","review_status":"unreviewed"}

class PreparationTests(unittest.TestCase):
    def test_produces_separate_splits(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            src = root / "raw.jsonl"
            src.write_text("\n".join(json.dumps(item(split, text), ensure_ascii=False) for split, text in [
                ("train", "Câu hỏi một"),("validation", "Câu hỏi hai"),("test", "Câu hỏi ba")
            ]) + "\n", encoding="utf-8")
            manifest = prepare(src, root / "out")
            self.assertEqual(manifest["splits"], {"train":1, "validation":1, "test":1})
            self.assertFalse(manifest["ready_for_production_training"])
            self.assertEqual(len((root/"out/train.jsonl").read_text(encoding="utf-8").splitlines()), 1)
    def test_blocks_leakage(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            src=root/"raw.jsonl"
            src.write_text("\n".join(json.dumps(item(split, question),ensure_ascii=False) for split,question in [
                ("train","Cùng câu hỏi"),("validation"," CÙNG  câu hỏi "),("test","Khác hẳn")
            ]),encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate"):
                prepare(src, root/"out")

if __name__ == "__main__":
    unittest.main()
