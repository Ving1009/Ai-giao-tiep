# Hướng dẫn TRL + PEFT (không tự chạy GPU)

Mô hình: Qwen/Qwen3-0.6B, license Apache-2.0 (xác minh điều khoản khi phân phối).
Toolchain tham chiếu: trl==1.16.0, PyTorch, Transformers, Datasets,
Accelerate, PEFT; chạy trên Python 3.11+ và GPU CUDA thích hợp.
Tài liệu: https://huggingface.co/docs/trl/sft_trainer

1. Tạo Python venv hoặc dùng notebook notebooks/train_colab.ipynb.
2. Cài đặt: python -m pip install -r training/requirements.txt
3. Kiểm tra dữ liệu: python -m training.prepare_data
4. Kiểm tra cấu hình KHÔNG train: python -m training.train_sft
5. Smoke-test 1 bước với GPU do bạn chủ động cấp:
   python -m training.train_sft --run-training --smoke-test --allow-sample-data
6. Nếu dataset đã qua review và được mở rộng, fine-tune:
   python -m training.train_sft --run-training
7. Xuất adapter trong training/output/; không git commit trọng số.
8. Sau khi fine-tune, so sánh base và adapter với training.evaluate.

Config: training/config/sft.json cho LR/batch/accumulation/epochs/max_length/
seed/gradient checkpoint/save strategy/eval strategy/output/checkpoint resume.
Mặc định dùng LoRA; bật quantization_4bit để chạy QLoRA sau khi
cài bitsandbytes (cần GPU tương thích). Không tự mặc định 4-bit.

**Quan trọng:** 35 mẫu hội thoại hiện chỉ phục vụ kiểm tra pipeline.
Tất cả đều UNREVIEWED. Cần review/đa dạng dữ liệu trước khi kỳ vọng chất lượng.
Một bước smoke-test KHÔNG chứng minh fine-tune tốt.

DPO là tùy chọn sau SFT: tạo preference dataset đã đánh giá và chạy
python -m training.train_dpo --adapter PATH --dataset YOUR_DATA.jsonl --run-training
Bộ preferences.sample.jsonl chỉ minh họa cú pháp, không thể dùng để đánh giá chất lượng.

Xuất trọng số gộp khi tài nguyên cho phép:
python -m training.export_model --adapter PATH --output PATH --run-export

Lưu base model ID, phiên bản thư viện, config, seed, hash dataset và checkpoint để tái lập.
Không chia sẻ dữ liệu học sinh hay token Hugging Face cá nhân.
