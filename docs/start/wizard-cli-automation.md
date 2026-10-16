---
summary: "OpenClaw CLI 的脚本化 onboarding 和 agent 设置"
read_when:
  - "你正在脚本或 CI 中自动化 onboarding"
  - "你需要特定提供商的非交互式示例"
title: "CLI 自动化"
sidebarTitle: "CLI 自动化"
---

使用 `openclaw onboard --non-interactive` 来脚本化设置。它需要 `--accept-risk`：非交互式设置可能会在没有确认提示的情况下写入凭据和守护进程配置，因此该标志用于明确确认风险。

每个命令都可以使用 `--install-daemon` 安装托管网关，通过省略守护进程标志来要求已运行的兼容网关，使用 `--skip-daemon` 显式停止网关，或使用 `--skip-health` 进行仅配置设置。显式跳过仍会检查现有网关并报告网关是否可达，但监听器不存在只是提供信息，而不是设置失败。

<Note>
`--json` 并不意味着非交互式模式。请在脚本中显式传入 `--non-interactive --accept-risk`。
</Note>

## <a id="review-required-plugins"></a> 查看所需的插件

OpenClaw 官方目录中的捆绑插件和经过验证的插件在设置过程中不需要功能同意。这包括为 OpenAI 设置安装的官方 Codex 运行时。

非交互式入门不能接受新的第三方插件功能。 `--accept-risk` 仅承认入门引导风险；它不授予插件同意。在自动化需要第三方提供商、运行时或通道插件的设置之前，请检查其来源和声明的功能，然后在明确同意的情况下预安装：

```bash
openclaw plugins install <plugin-spec> --accept-capabilities
```

如果入门引导报告需要审核所需的插件功能，请审核并安装指定的插件，然后重新运行相同的命令。对于已安装且需要批准才能启用的插件，请使用 `openclaw plugins enable <plugin-id> --accept-capabilities`。

同意适用于经过审查的插件操作，而不是每次后续安装。请参阅 [ 能力同意 ](/plugins/manage-plugins#capability-consent) 以了解工件审核、启用和更新规则。

## <a id="baseline-non-interactive-example"></a> 基准非交互式示例

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

- `--gateway-port` 默认为 `18789`。仅传递它来覆盖该默认值。
- Local onboarding 默认情况下以令牌模式生成网关机密，并保留现有密码模式。使用 `--gateway-auth password` 和 `--gateway-password <value>` 显式提供密码；密码标志还可以自行选择密码模式。 Tailscale 漏斗需要密码模式。
- `--skip-bootstrap` 会跳过创建默认工作区文件，适用于预先为自身工作区准备文件的自动化流程。
- `--secret-input-mode ref` 将新凭据存储为环境支持的引用，格式为 `{ source: "env", provider: "default", id: "<ENV_VAR>" }`。添加凭据或传递内联密钥标志时设置提供程序环境变量。现有的可解析命名配置文件及其 `env`、`file`、`exec` 或 `store` 引用将按原样重用，无需新的凭据写入或其他提供程序环境变量。不迁移现有明文。运行 `openclaw secrets configure --apply`，然后运行 ​​`openclaw secrets audit --check`。请参见 [ 机密管理](/gateway/secrets)。
- 网关令牌遵循相同的模式。安装程序会自行生成该值，因此引用模式没有环境变量可指向，除非您提供环境变量。导出 `OPENCLAW_GATEWAY_TOKEN` 后，`gateway.auth.token` 将成为对其的 `env` 引用。否则，令牌将作为 `OPENCLAW_GATEWAY_TOKEN` 进入 SQLite 秘密存储，并且配置保留 `store` 引用。无论哪种方式，`openclaw.json` 都不持有明文网关令牌。检查带有 `openclaw secrets store list` 的条目。
- 在参考模式下，显式 `--gateway-password` 和 `--remote-password` 必须匹配 `OPENCLAW_GATEWAY_PASSWORD`。 `--remote-token` 必须匹配 `OPENCLAW_GATEWAY_TOKEN`。在安装程序更改状态之前，缺少或不匹配的环境值会失败。匹配的凭据存储为 env SecretRefs。

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref
```

## <a id="provider-specific-examples"></a> 按提供商划分的示例

<AccordionGroup>
  <Accordion id="anthropic-api-key-example" title="Anthropic API 密钥示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice apiKey \
      --anthropic-api-key "$ANTHROPIC_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="cloudflare-ai-gateway-example" title="Cloudflare AI 网关示例">
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
  <Accordion id="gemini-example" title="Gemini 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="mistral-example" title="Mistral 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="moonshot-example" title="Moonshot 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="ollama-example" title="Ollama 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice ollama \
      --custom-model-id "qwen3.5:27b" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="opencode-example" title="OpenCode 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-bind loopback
    ```
    对于 Go 目录，请切换为 `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"`。
  </Accordion>
  <Accordion id="synthetic-example" title="Synthetic 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="vercel-ai-gateway-example" title="Vercel AI 网关示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="z-ai-example" title="Z.AI 示例">
    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion id="custom-provider-example" title="自定义提供商示例">
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

    OpenClaw 从已知的视觉模型 ID 模式（`gpt-4o`、`claude-3/4`、`gemini`、`-vl`/`vision` 后缀等）推断图像输入支持。添加 `--custom-image-input` 以强制启用无法识别的视觉模型，或添加 `--custom-text-input` 以强制仅显示文本。

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

Anthropic 设置令牌身份验证仍然受支持，但当本地 Claude CLI 登录可用时，OpenClaw 更喜欢 Claude CLI 重用。对于生产，首选 Anthropic API 密钥。

## <a id="add-another-agent"></a> 添加另一个代理

`openclaw agents add <name>` 会创建一个独立的代理，拥有自己的工作区、会话和认证配置文件。不带 `--workspace`（且不带任何其他标志）运行时会启动交互式向导；传入 `--workspace`、`--model`、`--agent-dir`、`--bind` 或 `--non-interactive` 中的任意一个都会以非交互方式运行，此时必须提供 `--workspace`。

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-6-astra \
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
- 代理名称已标准化为有效的代理 ID。允许使用 `main`，但现有的命名安装可能需要 `openclaw doctor --fix` 在创建之前完成旧会话和共享身份验证所有权迁移。

## <a id="related-docs"></a> 相关文档

- Onboarding 中心：[Onboarding （CLI）](/start/wizard)
- 完整参考：[CLI 设置 Reference](/start/wizard-cli-reference)
- 命令参考：[`openclaw onboard`](/cli/onboard)
