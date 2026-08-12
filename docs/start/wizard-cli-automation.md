---
summary: "OpenClaw CLI 的脚本化 onboarding 和 agent 设置"
read_when:
  - 你正在脚本或 CI 中自动化 onboarding
  - 你需要特定提供商的非交互式示例
title: "CLI 自动化"
sidebarTitle: "CLI 自动化"
---

使用 `openclaw onboard --non-interactive` 来脚本化设置。它需要 `--accept-risk`：非交互式设置可能会在没有确认提示的情况下写入凭据和守护进程配置，因此该标志用于明确确认风险。

每个命令都必须使用 `--install-daemon` 安装一个受管理的 Gateway，使用 `--skip-health` 进行仅配置设置，或在已经运行的兼容 Gateway 上运行。

<Note>
`--json` 并不意味着非交互式模式。请在脚本中显式传入 `--non-interactive --accept-risk`。
</Note>

## 基准非交互式示例

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

如果需要机器可读的摘要，请添加 `--json`。

- `--gateway-port` 默认为 `18789`；只有需要覆盖默认值时才传入。
- `--skip-bootstrap` 会跳过创建默认工作区文件，适用于预先为自身工作区准备文件的自动化流程。
- `--secret-input-mode ref` 会将新凭据存储为由环境变量支持的引用（`{ source: "env", provider: "default", id: "<ENV_VAR>" }`）；在添加凭据或传递内联密钥标志时设置提供商环境变量。现有可解析的命名配置文件及其 `env`、`file`、`exec` 或 `store` 引用会原样复用，不会写入新凭据，也不会额外添加提供商环境变量。现有明文不会被迁移；请运行 `openclaw secrets configure --apply`，然后运行 `openclaw secrets audit --check`。请参阅[机密管理](/gateway/secrets)。

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref
```

## 按提供商划分的示例

<AccordionGroup>
  <Accordion title="Anthropic API key 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice apiKey \
      --anthropic-api-key "$ANTHROPIC_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
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
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Mistral 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Moonshot 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Ollama 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice ollama \
      --custom-model-id "qwen3.5:27b" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="OpenCode 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-bind loopback
    ```
    对于 Go 目录，请切换为 `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"`。
  </Accordion>
  <Accordion title="合成示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="自定义提供商示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
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
    openclaw onboard --non-interactive --accept-risk --skip-health \
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

## 添加另一个代理

`openclaw agents add <name>` 会创建一个独立的代理，拥有自己的工作区、会话和认证配置文件。不带 `--workspace`（且不带任何其他标志）运行时会启动交互式向导；传入 `--workspace`、`--model`、`--agent-dir`、`--bind` 或 `--non-interactive` 中的任意一个都会以非交互方式运行，此时必须提供 `--workspace`。

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.6-sol \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

它写入的配置键（新代理 id 对应的 `agents.entries.*` 条目）：

- `name`
- `workspace`
- `agentDir`
- `model`（仅在传入 `--model` 时）

注意：

- 默认工作区（当交互式向导中省略 `--workspace` 时）：`~/.openclaw/workspace-<agentId>`。
- `--bind <channel[:accountId]>` 可以重复使用；添加绑定以将传入消息路由到新代理（这也可以在向导中以交互方式完成）。
- 代理名称会被规范化为有效的代理 id；`main` 是保留名称。

## 相关文档

- 入门引导（CLI）：[入门引导（CLI）](/start/wizard)
- 完整参考：[CLI 设置参考](/start/wizard-cli-reference)
- 命令参考：[`openclaw onboard`](/cli/onboard)
