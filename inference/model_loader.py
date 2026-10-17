"""Run local Hugging Face weights. No commercial API, no mock answers."""
import os
import threading

SYSTEM_PROMPT = (
    "Bạn là trợ lý AI giao tiếp tiếng Việt thân thiện và chính xác. "
    "Hỗ trợ học sinh hiểu bài, giải thích rõ ràng. "
    "Nếu thiếu dữ liệu hoặc không chắc chắn, nói rõ giới hạn. "
    "Không tự bịa điểm chuẩn, học phí, quy định tuyển sinh hay nguồn chính thức. "
    "Điểm chuẩn năm trước chỉ mang tính tham khảo cho năm sau. "
    "Không yêu cầu dữ liệu cá nhân nhạy cảm."
)

class LocalModel:
    def __init__(self):
        self.model_id = os.getenv("BASE_MODEL_ID", "Qwen/Qwen3-0.6B")
        self.version = os.getenv("MODEL_VERSION", "qwen3-0.6b-base")
        self.adapter = os.getenv("MODEL_ADAPTER_PATH", "").strip()
        self.context = int(os.getenv("MAX_CONTEXT_TOKENS", "2048"))
        self.tokenizer = None
        self.model = None
        self.error = None
        self.lock = threading.RLock()

    @property
    def ready(self):
        return self.model is not None and self.tokenizer is not None

    def load(self):
        with self.lock:
            if self.ready:
                return
            try:
                import torch
                from transformers import AutoTokenizer, AutoModelForCausalLM
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_id, trust_remote_code=False)
                use_gpu = torch.cuda.is_available()
                dtype = torch.float16 if use_gpu else torch.float32
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_id, torch_dtype=dtype, trust_remote_code=False,
                    device_map="auto" if use_gpu else None
                )
                if self.adapter:
                    from peft import PeftModel
                    self.model = PeftModel.from_pretrained(self.model, self.adapter, is_trainable=False)
                self.model.eval()
                self.error = None
            except Exception as exc:
                self.model = None
                self.tokenizer = None
                self.error = type(exc).__name__
                raise

    def generate(self, question, history, options):
        with self.lock:
            self.load()
            import torch
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            messages.extend({"role": m.role, "content": m.content} for m in history)
            messages.append({"role": "user", "content": question})
            inputs = self.tokenizer.apply_chat_template(
                messages, tokenize=True, add_generation_prompt=True,
                return_tensors="pt", enable_thinking=False
            )
            if inputs.shape[1] > self.context:
                raise ValueError("CONTEXT_TOO_LONG")
            device = next(self.model.parameters()).device
            inputs = inputs.to(device)
            with torch.inference_mode():
                result = self.model.generate(
                    input_ids=inputs, max_new_tokens=options.max_new_tokens,
                    do_sample=True, temperature=options.temperature, top_p=0.8, top_k=20,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id
                )
            text = self.tokenizer.decode(result[0, inputs.shape[1]:], skip_special_tokens=True).strip()
            # Đề phòng template/model không tuân thủ chế độ non-thinking.
            if text.startswith("<think>") and "</think>" in text:
                text = text.split("</think>", 1)[1].strip()
            if not text:
                raise RuntimeError("EMPTY_GENERATION")
            return text

engine = LocalModel()
