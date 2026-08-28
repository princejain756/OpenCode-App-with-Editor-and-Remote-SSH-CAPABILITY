# OpenCode IDE — BYOK (Bring Your Own Key) & Custom Models

OpenCode gives you complete control over your AI models. You can configure arbitrary frontier models, local open-source LLMs, or enterprise endpoints.

---

## 1. Supported Providers & Models

- **Anthropic**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus.
- **OpenAI**: GPT-4o, GPT-4o-mini, o1, o3-mini.
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash Thinking.
- **OpenRouter**: Access 200+ models via a single API key.
- **Ollama / Local LLMs**: DeepSeek-R1, Qwen 2.5 Coder, Llama 3.3, Mistral (run 100% locally on localhost:11434).
- **Custom OpenAI-Compatible Endpoints**: vLLM, LM Studio, Azure OpenAI, Together AI, Groq, Fireworks.

---

## 2. Configuration (`opencode.json`)

You can configure models globally in `~/.config/opencode/opencode.json` or per project:

```json
{
  "provider": {
    "anthropic": {
      "apiKey": "sk-ant-...",
      "model": "claude-3-7-sonnet-20250219"
    },
    "custom": {
      "name": "Local DeepSeek",
      "baseURL": "http://127.0.0.1:11434/v1",
      "apiKey": "ollama",
      "model": "deepseek-r1:32b"
    }
  }
}
```

---

## 3. Security & Zero Credential Leakage

- **Encrypted Local Storage**: API keys are stored only on your local machine in protected user state.
- **No Remote Credential Persistence**: When developing over Remote SSH, API keys are passed transiently in-memory for model inference requests and are never written to the remote server disk.
- **No Tracking or Telemetry of Code**: Your code, prompt history, and variables stay strictly between your IDE and your configured model endpoint.
