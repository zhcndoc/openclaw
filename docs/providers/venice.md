---
summary: "在 OpenClaw 中使用 Venice AI 隐私聚焦模型"
read_when:
  - 你想在 OpenClaw 中进行隐私聚焦的推理
  - 你需要 Venice AI 的设置指导
title: "Venice AI"
---

# Venice AI（Venice 特色）

**Venice** 是我们重点推荐的 Venice 设置，专注于隐私优先的推理，支持可选的匿名访问专有模型。

Venice AI 提供隐私聚焦的 AI 推理，支持无审查模型，同时通过匿名代理访问主要的专有模型。所有推理默认都是私密的——不会对你的数据进行训练，也不进行日志记录。

## 为什么在 OpenClaw 使用 Venice

- **私密推理**：针对开源模型（无日志）。
- **无审查模型**：当你需要时可用。
- **匿名访问**：在质量重要时，通过匿名代理访问专有模型（Opus/GPT/Gemini）。
- 兼容 OpenAI 的 `/v1` 接口。

## 隐私模式

Venice 提供两种隐私级别——理解它们是选择模型的关键：

| 模式           | 描述                                                                                                             | 模型                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **私密**       | 完全私密。提示/回应**绝不会被存储或记录**。临时性的。                                                             | Llama、Qwen、DeepSeek、Kimi、MiniMax、Venice Uncensored 等   |
| **匿名**       | 通过 Venice 代理，剥离元数据。底层提供商（OpenAI、Anthropic、Google、xAI）看到的是匿名请求。                                     | Claude、GPT、Gemini、Grok                                     |

## 特性

- **隐私聚焦**：可选“私密”（完全私密）或“匿名”（代理）模式
- **无审查模型**：访问无内容限制的模型
- **主要模型访问**：通过 Venice 匿名代理使用 Claude、GPT、Gemini、Grok
- **OpenAI 兼容 API**：标准 `/v1` 端点，便于集成
- **流式传输**：✅ 所有模型支持
- **函数调用**：✅ 选定模型支持（详见模型能力）
- **视觉能力**：✅ 支持带视觉功能的模型
- **无硬性频率限制**：极端使用时可能采取合理使用限速

## 设置

### 1. 获取 API 密钥

1. 前往 [venice.ai](https://venice.ai) 注册账号  
2. 进入 **设置 → API 密钥 → 创建新密钥**  
3. 复制你的 API 密钥（格式：`vapi_xxxxxxxxxxxx`）  

### 2. 配置 OpenClaw

**选项 A：环境变量方式**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**选项 B：交互式设置（推荐）**

```bash
openclaw onboard --auth-choice venice-api-key
```

该命令将：

1. 提示你输入 API 密钥（或使用已有的 `VENICE_API_KEY`）  
2. 显示所有可用的 Venice 模型  
3. 让你选择默认模型  
4. 自动配置提供商  

**选项 C：非交互式方式**

```bash
openclaw onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. 验证设置

```bash
openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
```

## 模型选择

设置完成后，OpenClaw 会显示所有可用的 Venice 模型。根据你的需求选择：

- **默认模型**：`venice/kimi-k2-5`，强劲的私密推理加视觉支持  
- **高性能选项**：`venice/claude-opus-4-6`，Venice 代理下最强的匿名选项  
- **隐私需求**：选择“私密”模型确保完全私密推理  
- **功能需求**：选择“匿名”模型通过 Venice 代理访问 Claude、GPT、Gemini  

随时更改默认模型：

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

列出所有可用模型：

```bash
openclaw models list | grep venice
```

## 通过 `openclaw configure` 配置

1. 运行 `openclaw configure`  
2. 选择 **模型/身份验证**  
3. 选择 **Venice AI**  

## 应该使用哪个模型？

| 用例                       | 推荐模型                         | 原因                                   |
| -------------------------- | -------------------------------- | -------------------------------------- |
| **通用聊天**               | `kimi-k2-5`                    | 强劲的私密推理加视觉支持               |
| **最佳整体质量**           | `claude-opus-4-6`              | 最强的匿名 Venice 途径                 |
| **隐私 + 编程**            | `qwen3-coder-480b-a35b-instruct` | 私密编程模型，支持大上下文              |
| **私密视觉**               | `kimi-k2-5`                    | 支持视觉，且保持私密模式                |
| **快速且低成本**           | `qwen3-4b`                     | 轻量级推理模型                         |
| **复杂私密任务**           | `deepseek-v3.2`                | 强推理能力，无 Venice 工具支持          |
| **无审查模型**             | `venice-uncensored`            | 无内容限制                            |

## 可用模型（共 41 个）

### Private Models (26) - Fully Private, No Logging

| 模型 ID                        | 名称                              | 上下文（token） | 特性                       |
| ------------------------------ | --------------------------------- | --------------- | -------------------------- |
| `kimi-k2-5`                    | Kimi K2.5                        | 256k            | 默认，推理，视觉           |
| `kimi-k2-thinking`             | Kimi K2 思考版                   | 256k            | 推理                       |
| `llama-3.3-70b`                | Llama 3.3 70B                   | 128k            | 通用                       |
| `llama-3.2-3b`                 | Llama 3.2 3B                    | 128k            | 通用                       |
| `hermes-3-llama-3.1-405b`      | Hermes 3 Llama 3.1 405B          | 128k            | 通用，工具禁用             |
| `qwen3-235b-a22b-thinking-2507`| Qwen3 235B 思考版               | 128k            | 推理                       |
| `qwen3-235b-a22b-instruct-2507`| Qwen3 235B 指令版               | 128k            | 通用                       |
| `qwen3-coder-480b-a35b-instruct`| Qwen3 代码版 480B               | 256k            | 编程                       |
| `qwen3-coder-480b-a35b-instruct-turbo`| Qwen3 代码加速版 480B       | 256k            | 编程                       |
| `qwen3-5-35b-a3b`              | Qwen3.5 35B A3B                 | 256k            | 推理，视觉                 |
| `qwen3-next-80b`               | Qwen3 Next 80B                  | 256k            | 通用                       |
| `qwen3-vl-235b-a22b`           | Qwen3 视觉版 235B               | 256k            | 视觉                       |
| `qwen3-4b`                    | Venice 小型 (Qwen3 4B)           | 32k             | 快速，推理                 |
| `deepseek-v3.2`               | DeepSeek V3.2                   | 160k            | 推理，工具禁用             |
| `venice-uncensored`           | Venice 无审查 (Dolphin-Mistral) | 32k             | 无审查，工具禁用           |
| `mistral-31-24b`              | Venice 中型 (Mistral)            | 128k            | 视觉                       |
| `google-gemma-3-27b-it`       | Google Gemma 3 27B 指令版        | 198k            | 视觉                       |
| `openai-gpt-oss-120b`         | OpenAI GPT OSS 120B             | 128k            | 通用                       |
| `nvidia-nemotron-3-nano-30b-a3b`| NVIDIA Nemotron 3 Nano 30B      | 128k            | 通用                       |
| `olafangensan-glm-4.7-flash-heretic`| GLM 4.7 Flash Heretic         | 128k            | 推理                       |
| `zai-org-glm-4.6`             | GLM 4.6                        | 198k            | 通用                       |
| `zai-org-glm-4.7`             | GLM 4.7                        | 198k            | 推理                       |
| `zai-org-glm-4.7-flash`       | GLM 4.7 Flash                  | 128k            | 推理                       |
| `zai-org-glm-5`               | GLM 5                          | 198k            | 推理                       |
| `minimax-m21`                 | MiniMax M2.1                  | 198k            | 推理                       |
| `minimax-m25`                 | MiniMax M2.5                  | 198k            | 推理                       |

### Anonymized Models (15) - Via Venice Proxy

| 模型 ID                     | 名称                           | 上下文（token） | 特性                       |
| --------------------------- | ------------------------------ | --------------- | -------------------------- |
| `claude-opus-4-6`           | Claude Opus 4.6 (Via Venice)   | 1M              | 推理，视觉                 |
| `claude-opus-4-5`           | Claude Opus 4.5 (Via Venice)   | 198k            | 推理，视觉                 |
| `claude-sonnet-4-6`         | Claude Sonnet 4.6 (Via Venice) | 1M              | 推理，视觉                 |
| `claude-sonnet-4-5`         | Claude Sonnet 4.5 (Via Venice) | 198k            | 推理，视觉                 |
| `openai-gpt-54`             | GPT-5.4 (Via Venice)           | 1M              | 推理，视觉                 |
| `openai-gpt-53-codex`       | GPT-5.3 Codex (Via Venice)     | 400k            | 推理，视觉，编程           |
| `openai-gpt-52`             | GPT-5.2 (Via Venice)           | 256k            | 推理                       |
| `openai-gpt-52-codex`       | GPT-5.2 Codex (Via Venice)     | 256k            | 推理，视觉，编程           |
| `openai-gpt-4o-2024-11-20`  | GPT-4o (Via Venice)            | 128k            | 视觉                       |
| `openai-gpt-4o-mini-2024-07-18`| GPT-4o Mini (Via Venice)    | 128k            | 视觉                       |
| `gemini-3-1-pro-preview`    | Gemini 3.1 Pro (Via Venice)    | 1M              | 推理，视觉                 |
| `gemini-3-pro-preview`      | Gemini 3 Pro (Via Venice)      | 198k            | 推理，视觉                 |
| `gemini-3-flash-preview`    | Gemini 3 Flash (Via Venice)    | 256k            | 推理，视觉                 |
| `grok-41-fast`              | Grok 4.1 快速版 (Via Venice)   | 1M              | 推理，视觉                 |
| `grok-code-fast-1`          | Grok 代码快版 1 (Via Venice)   | 256k            | 推理，编程                 |

## 模型发现

当设置了 `VENICE_API_KEY` 后，OpenClaw 会自动从 Venice API 发现模型。如果 API 无法连接，则会回退到静态目录。

`/models` 端点是公开的（列出模型不需身份认证），但推理需要有效的 API 密钥。

## 流式和工具支持

| 功能                | 支持情况                                       |
| -------------------- | ----------------------------------------------|
| **流式传输**         | ✅ 所有模型支持                                |
| **函数调用**         | ✅ 大多数模型支持（查看 API 中 `supportsFunctionCalling` 字段） |
| **视觉/图像**        | ✅ 带“视觉”特性的模型支持                      |
| **JSON 模式**        | ✅ 通过 `response_format` 支持                  |

## 价格

Venice 使用基于信用点的计费系统。详情请查看 [venice.ai/pricing](https://venice.ai/pricing)：

- **私密模型**：通常成本较低  
- **匿名模型**：价格类似直接 API，加上少量 Venice 费用  

## Venice 与直接 API 对比

| 方面         | Venice（匿名代理）                   | 直接 API              |
| ------------ | ---------------------------------- | --------------------- |
| **隐私**     | 剥离元数据，匿名化                  | 绑定你的账号          |
| **延迟**     | 额外 10-50ms（代理导致）           | 直连                  |
| **功能**     | 支持大多数功能                      | 全功能支持            |
| **计费**     | 使用 Venice 信用点                  | 供应商直接计费        |

## 使用示例

```bash
# 使用默认私密模型
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# 通过 Venice 使用 Claude（匿名）
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# 使用无审查模型
openclaw agent --model venice/venice-uncensored --message "起草方案"

# 使用带图像的视觉模型
openclaw agent --model venice/qwen3-vl-235b-a22b --message "查看附加图片"

# 使用编程模型
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "重构这个函数"
```

## 故障排查

### API 密钥未识别

```bash
echo $VENICE_API_KEY
openclaw models list | grep venice
```

确保密钥以 `vapi_` 开头。

### 模型不可用

Venice 模型目录动态更新。运行 `openclaw models list` 查看当前可用模型。部分模型可能暂时离线。

### 连接问题

Venice API 地址是 `https://api.venice.ai/api/v1`。请确保你的网络允许 HTTPS 连接。

## 配置文件示例

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2-5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## 相关链接

- [Venice AI 官网](https://venice.ai)
- [API 文档](https://docs.venice.ai)
- [价格说明](https://venice.ai/pricing)
- [状态页](https://status.venice.ai)
