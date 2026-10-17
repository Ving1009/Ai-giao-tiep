"use strict";
// Giao diện demo: không dùng API và KHÔNG chạy mô hình AI.
const KEY = "ai-giao-tiep-demo-v1";
const el = id => document.getElementById(id);
const historyEl = el("chat-history");
const messagesEl = el("messages");
const input = el("message-input");
const send = el("send");
const scroll = el("conversation-scroll");
const sidebar = el("sidebar");
const backdrop = el("backdrop");
const menu = el("menu-button");

function newConversation() {
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title: "Cuộc trò chuyện mới", updated: Date.now(), messages: [] };
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(saved)) return [];
    return saved.slice(0, 20).filter(c => c && typeof c.id === "string" &&
      typeof c.title === "string" && Array.isArray(c.messages)).map(c => ({
        id: c.id.slice(0, 80), title: c.title.slice(0, 80),
        updated: Number(c.updated) || Date.now(),
        messages: c.messages.slice(-100).filter(m => m && typeof m.text === "string" &&
          (m.role === "user" || m.role === "assistant")).map(m => ({
          role: m.role, text: m.text.slice(0, 4000), time: Number(m.time) || Date.now()
        }))
      }));
  } catch (_) { return []; }
}
let conversations = restore();
if (!conversations.length) conversations = [newConversation()];
let activeId = conversations[0].id;
let pending = false;
const current = () => conversations.find(c => c.id === activeId);
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(conversations.slice(0, 20))); }
  catch (_) { /* Giao diện vẫn hoạt động khi trình duyệt chặn lưu trữ. */ }
}
function closeMenu() {
  sidebar.classList.remove("open");
  backdrop.hidden = true;
  menu.setAttribute("aria-expanded", "false");
}
function renderHistory() {
  conversations.sort((a, b) => b.updated - a.updated);
  historyEl.replaceChildren();
  for (const chat of conversations) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = chat.id === activeId ? "active" : "";
    if (chat.id === activeId) item.setAttribute("aria-current", "page");
    const icon = document.createElement("span");
    icon.textContent = "▤";
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = chat.title;
    item.append(icon, label);
    item.addEventListener("click", () => {
      activeId = chat.id;
      renderHistory();
      renderMessages();
      closeMenu();
    });
    historyEl.append(item);
  }
}
function renderMessages() {
  const chat = current();
  messagesEl.replaceChildren();
  el("welcome").hidden = chat.messages.length > 0;
  for (const message of chat.messages) {
    const wrapper = document.createElement("article");
    wrapper.className = "message" + (message.role === "user" ? " user" : "");
    const icon = document.createElement("div");
    icon.className = "message-icon";
    icon.textContent = message.role === "user" ? "B" : "✦";
    icon.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "message-content";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message.text; // Chặn việc thực thi HTML trong tin nhắn.
    const time = document.createElement("time");
    time.className = "message-time";
    time.dateTime = new Date(message.time).toISOString();
    time.textContent = (message.role === "user" ? "Bạn" : "Demo") + " · " +
      new Date(message.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    content.append(bubble, time);
    wrapper.append(icon, content);
    messagesEl.append(wrapper);
  }
  el("typing").hidden = !(pending && activeId === pendingChatId);
  requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
}
function addMessage(role, text, id) {
  const chat = conversations.find(c => c.id === id);
  if (!chat) return;
  chat.messages.push({ role, text, time: Date.now() });
  chat.messages = chat.messages.slice(-100);
  chat.updated = Date.now();
  if (role === "user" && chat.title === "Cuộc trò chuyện mới")
    chat.title = text.replace(/\s+/g, " ").slice(0, 38);
  persist();
  renderHistory();
  if (activeId === id) renderMessages();
}
// Không có phản hồi mẫu: mọi câu trả lời chỉ đến từ API mô hình thật.
let controller = null;
let pendingChatId = null;
function setModelStatus(ready, label) {
  el("model-status").textContent = label;
  el("status-dot").classList.toggle("ready", ready);
}
async function checkModelStatus() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const info = await response.json();
    if (!response.ok || info.status !== "ready") throw Error("Mô hình chưa khả dụng");
    setModelStatus(true, (info.model || "AI") + " · " + (info.version || "base"));
  } catch (_) {
    setModelStatus(false, "Chưa kết nối mô hình AI");
  }
}
async function requestModel(question, history, signal) {
  const response = await fetch("/api/chat", {
    method: "POST", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history, options: { max_new_tokens: 256, temperature: 0.7 } })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "ok" || payload?.mode !== "model" ||
      typeof payload?.answer !== "string") {
    setModelStatus(false, "Mô hình chưa khả dụng");
    throw Error(payload?.message || "Máy chủ mô hình hiện không phản hồi.");
  }
  setModelStatus(true, (payload.model || "AI") + " · " + (payload.version || "base"));
  return payload.answer;
}
function refreshComposer() {
  send.disabled = pending || !input.value.trim();
  el("stop").hidden = !pending;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}
async function submitMessage() {
  const text = input.value.trim();
  if (!text || pending) return;
  const id = activeId;
  const history = current().messages.filter(m => m.role === "user" || m.role === "assistant")
    .slice(-12).map(m => ({ role: m.role, content: m.text }));
  input.value = "";
  addMessage("user", text, id);
  pending = true;
  pendingChatId = id;
  controller = new AbortController();
  const activeController = controller;
  const timeout = setTimeout(() => activeController.abort(), 47000);
  renderMessages();
  refreshComposer();
  try {
    const answer = await requestModel(text, history, activeController.signal);
    addMessage("assistant", answer, id);
  } catch (error) {
    const stopped = activeController.signal.aborted;
    addMessage("assistant", stopped
      ? "⚠️ [Hệ thống] Đã dừng hoặc hết thời gian chờ. Không có phản hồi AI."
      : "⚠️ [Hệ thống] " + (error.message || "Không thể kết nối mô hình AI."), id);
  } finally {
    clearTimeout(timeout);
    if (controller === activeController) controller = null;
    pending = false;
    pendingChatId = null;
    renderMessages();
    refreshComposer();
  }
}
el("composer").addEventListener("submit", e => { e.preventDefault(); submitMessage(); });
input.addEventListener("input", refreshComposer);
el("stop").addEventListener("click", () => { if (controller) controller.abort(); });
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submitMessage();
  }
});
document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => {
  input.value = button.dataset.prompt;
  refreshComposer();
  submitMessage();
}));
el("new-chat").addEventListener("click", () => {
  if (current().messages.length) {
    const chat = newConversation();
    conversations.unshift(chat);
    activeId = chat.id;
    persist();
  }
  renderHistory();
  renderMessages();
  closeMenu();
  input.focus();
});
el("clear-chat").addEventListener("click", () => {
  if (!current().messages.length) return;
  if (!confirm("Xóa tất cả tin nhắn trong cuộc trò chuyện này?")) return;
  current().messages = [];
  current().title = "Cuộc trò chuyện mới";
  current().updated = Date.now();
  persist();
  renderHistory();
  renderMessages();
});
menu.addEventListener("click", () => {
  const open = !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", open);
  backdrop.hidden = !open;
  menu.setAttribute("aria-expanded", String(open));
});
backdrop.addEventListener("click", closeMenu);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
renderHistory();
renderMessages();
refreshComposer();

checkModelStatus();
