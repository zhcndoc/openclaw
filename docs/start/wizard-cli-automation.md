---
summary: "OpenClaw CLI 的脚本化 onboarding 和 agent 设置"
read_when:
  - 你正在脚本或 CI 中自动化 onboarding
  - 你需要特定提供商的非交互式示例
title: "CLI 自动化"
sidebarTitle: "CLI 自动化"
---

使用 `openclaw onboard --non-interactive` 来脚本化设置。它需要 `--accept-risk`：非交互式设置可能会在没有确认提示的情况下写入凭据和守护进程配置，因此该标志用于明确确认风险。

<Note>
`--json` 并不意味着非交互式模式。请在脚本中显式传入 `--non-interactive --accept-risk`。
</Note>

## 基线非交互式示例

```bash
openclaw onboard --non-interactive --accept-risk \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --secret-input-mode plaintext \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-bootstrap \
  --skip-skills
```

如需机器可读的摘要，请添加 `--json`。

- `--gateway-port` 默认为 `18789`；仅在需要覆盖时传入。
- `--skip-bootstrap` 会跳过创建默认工作区文件，适用于自动化场景中已预先填充自身工作区的情况。
- `--secret-input-mode ref` 会在认证配置中存储一个基于环境变量的引用（`{ source: "env", provider: "default", id: "<ENV_VAR>" }`），而不是明文密钥。在非交互式 `ref` 模式下，provider 环境变量必须已经设置在进程环境中：如果传入内联密钥标志却没有对应的环境变量，将会快速失败。

```bash
openclaw onboard --non-interactive --accept-risk \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref
```

## 按提供商划分的示例

<AccordionGroup>
  <Accordion title="Anthropic API key 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice apiKey \
      --anthropic-api-key "$ANTHROPIC_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice cloudflare-ai-gateway-api-key \
      --cloudflare-ai-gateway-account-id "your-account-id" \
      --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
      --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Gemini 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Mistral 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Moonshot 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Ollama 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice ollama \
      --custom-model-id "qwen3.5:27b" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="OpenCode 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-bind loopback
    ```
    对于 Go 目录，请切换为 `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"`。
  </Accordion>
  <Accordion title="合成示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="自定义提供商示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --custom-api-key "$CUSTOM_API_KEY" \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --custom-image-input \
      --gateway-bind loopback
    ```

    `--custom-api-key` 是可选的；某些端点不需要认证。如果省略，onboarding 会检查环境变量中的 `CUSTOM_API_KEY`。`--custom-provider-id` 也是可选的，省略时会根据 base URL 自动推导。`--custom-compatibility` 的默认值为 `openai`（其他值：`openai-responses`、`anthropic`）。

    OpenClaw 会根据已知的视觉模型 ID 模式推断是否支持图像输入（`gpt-4o`、`claude-3/4`、`gemini`、以 `-vl`/`vision` 结尾的模型，以及类似模式）。如果是未识别的视觉模型，可添加 `--custom-image-input` 强制启用；或添加 `--custom-text-input` 强制仅文本。

    ref 模式变体，将 `apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`：

    ```bash
    export CUSTOM_API_KEY="your-key"
    openclaw onboard --non-interactive --accept-risk \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --secret-input-mode ref \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --custom-image-input \
      --gateway-bind loopback
    ```

  </Accordion>
</AccordionGroup>

Anthropic 的 setup-token 认证仍然受支持，但当本地 Claude CLI 已登录可用时，OpenClaw 会优先复用 Claude CLI。用于生产环境时，建议优先使用 Anthropic API key。

## 添加另一个 agent

`openclaw agents add <name>` 会创建一个独立的 agent，拥有自己的工作区、会话和认证配置文件。不带 `--workspace`（且没有其他标志）运行时会启动交互式向导；传入 `--workspace`、`--model`、`--agent-dir`、`--bind` 或 `--non-interactive` 中的任意一个时，则会以非交互方式运行，然后需要提供 `--workspace`。

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

它写入的配置键（新 agent id 的 `agents.list[]` 条目）：

- `name`
- `workspace`
- `agentDir`
- `model`（仅在传入 `--model` 时）

注意：

- 默认工作区（当交互式向导中省略 `--workspace` 时）：`~/.openclaw/workspace-<agentId>`。
- `--bind <channel[:accountId]>` 可重复使用；添加绑定以将传入消息路由到新 agent（向导也可以交互式完成此操作）。
- agent 名称会被规范化为有效的 agent id；`main` 是保留名称。

## 相关文档

- Onboarding 入口：[Onboarding (CLI)](/start/wizard)
- 完整参考：[CLI 设置参考](/start/wizard-cli-reference)
- 命令参考：[`openclaw onboard`](/cli/onboard)
