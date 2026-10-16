---
summary: "Fireworks 设置（认证 + 模型选择）"
title: "Fireworks"
read_when:
  - "您想要将 Fireworks 与 OpenClaw 一起使用"
  - "你需要 Fireworks API key 环境变量或默认模型 id"
  - "您正在调试 Fireworks 上的 Kimi 思考行为"
---

[Fireworks](https://fireworks.ai) 通过 OpenAI- 兼容的 API 公开开放重量和路由模型。安装官方 Fireworks 提供程序插件，以在运行时使用当前的 Fire Pass GLM 路由器和任何 Fireworks 模型或路由器 ID。

| 属性        | 值                                               |
| --------------- | --------------------------------------------------- |
| 提供方 id     | `fireworks`（别名：`fireworks-ai`）                 |
| 包裹         | `@openclaw/fireworks-provider`                      |
| 认证环境变量    | `FIREWORKS_API_KEY`                                 |
| 引导标志 | `--auth-choice fireworks-api-key`                   |
| 直接 CLI 标志 | `--fireworks-api-key <key>`                         |
| API             | OpenAI-兼容（`openai-completions`）            |
| 基础 URL        | `https://api.fireworks.ai/inference/v1`             |
| 默认模型   | `fireworks/accounts/fireworks/routers/glm-5p3-fast` |
| 默认别名   | `GLM 5.3 Fast`                                      |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/fireworks-provider
    ```
  </Step>
  <Step id="set-the-fireworks-api-key" title="设置 Fireworks API 密钥">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice fireworks-api-key
```

```bash Direct flag
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY"
```

```bash Env only
export FIREWORKS_API_KEY=fw-...
```

    </CodeGroup>

    Onboarding 将针对 `fireworks` 提供商的密钥存储在您的身份验证配置文件中，并将 Fireworks 的当前 [Fire Pass](https://docs.fireworks.ai/firepass) GLM 5.3 快速路由器设置为默认模型。

  </Step>
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider fireworks
    ```

    该列表应包括 `GLM 5.3 Fast`。如果 `FIREWORKS_API_KEY` 未解析，`openclaw models status --json` 会报告 `auth.unusableProfiles` 下缺少的凭证。

  </Step>
</Steps>

## <a id="non-interactive-setup"></a> 非交互式设置

对于脚本或 CI 安装，请在命令行中传入所有参数：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

`--mode` 默认为 `local`，因此这与上面的 **Direct flag** 命令的运行相同。在网关主机上运行它：远程客户端加入 （`--mode remote`） 仅配置本地客户端连接，不会在服务器上设置提供程序凭据。

## <a id="built-in-catalog"></a> 内置目录

安装程序会保存连接设置和别名，而无需将生成的目录行复制到您的配置中。显式 `models.mode: "replace"` 保持目录播种启用；自定义模型行保持不变。

| 模型引用                                           | 名称         | 输入 | 上下文 | 最大输出 | 思考     |
| --------------------------------------------------- | ------------ | ----- | ------- | ---------- | ------------ |
| `fireworks/accounts/fireworks/routers/glm-5p3-fast` | GLM 5.3 快速 | 文本  | 256,000 | 256,000    | 开启（默认） |

OpenClaw 为 GLM 5.3 Fast 保留保守的 256,000 个代币上下文和输出上限。 Fireworks 记录了一个更大的 [native 上下文窗口](https://fireworks.ai/models/fireworks/glm-5p3)； [快速模式](https://docs.fireworks.ai/serverless/serverless-modes)以更高的速度服务于相同的模型。该目录使用[快速定价](https://docs.fireworks.ai/serverless/pricing)，而不是标准费率。

<Note>
  OpenClaw 将所有 Fireworks Kimi 模型固定到 `thinking: off`，因为 Fireworks 上的 Kimi 可以将思想链泄漏到可见回复中，除非请求明确禁用思考。通过 [Moonshot](/providers/moonshot) 路由相同模型，直接保留 Kimi 推理输出。请参阅 [ 在提供商之间切换的思维模式 ](/tools/thinking)。
</Note>

## <a id="prompt-caching"></a> 提示词缓存

Fireworks 自动启用 [ 前缀缓存](https://docs.fireworks.ai/guides/prompt-caching)。对于其本机 OpenAI- 兼容端点，OpenClaw 将现有提示缓存密钥或会话 ID 作为 `prompt_cache_key` 发送，因此重复轮流可以到达同一副本。 Fireworks 拥有缓存保留； `cacheRetention: "none"` 抑制 OpenClaw 的关联提示，但不禁用 Fireworks 的自动缓存。

缓存使用情况来自响应正文的 `prompt_tokens_details.cached_tokens`。对于仅在响应标头中报告缓存的专用部署，当 `fireworks-prompt-tokens` 与正文用法匹配时，OpenClaw 使用 `fireworks-cached-prompt-tokens`。正文缓存计数器优先，包括显式零。自定义代理端点保留其配置的缓存行为。

## <a id="custom-fireworks-model-ids"></a> 自定义 Fireworks 模型 id

OpenClaw 在运行时接受任何 Fireworks 模型或路由器 ID。使用 Fireworks 显示的确切 ID 并添加 `fireworks/` 前缀。动态分辨率使用 Fire Pass 模板的 OpenAI- 兼容 API 并将 GLM id 标记为纯文本；其他动态 ID 广告文本+图像输入。当 id 与 Kimi 模式匹配时，思考会自动禁用。对于具有不同功能的模型，请使用其支持的输入类型配置自定义模型条目。

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/models/<your-model-id>",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion id="how-model-id-prefixing-works" title="模型 ID 前缀如何工作">
    OpenClaw 中的每个 Fireworks 模型参考均以 `fireworks/` 开头，后跟来自 Fireworks 平台的确切 ID 或路由器路径。例如：

    - 路由器模型：`fireworks/accounts/fireworks/routers/glm-5p3-fast`
    - 直接模型：`fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw 在构造 API 请求时剥离 `fireworks/` 前缀，并将剩余路径作为 OpenAI- 兼容的 `model` 字段发送到 Fireworks 端点。

  </Accordion>

  <Accordion id="why-thinking-is-forced-off-for-kimi" title="为什么Kimi的思考被强制关闭">
    Fireworks 为 Kimi 提供服务时没有单独的推理通道，因此思维链可能会出现在可见的 `content` 流中。每次 Fireworks Kimi 请求时，OpenClaw 都会发送 `thinking: { type: "disabled" }`，并从负载中移除 `reasoning`、`reasoning_effort` 和 `reasoningEffort`（`extensions/fireworks/stream.ts`）。提供方策略（`extensions/fireworks/thinking-policy.ts`）仅为 Kimi 模型 id 宣告 `off` thinking 级别，因此手动 `/think` 切换和提供方策略界面会与运行时契约保持一致。

    若要端到端使用 Kimi 推理，请配置 [Moonshot 提供方](/providers/moonshot) 并通过它路由同一个模型。

  </Accordion>

  <Accordion id="environment-availability-for-the-daemon" title="守护进程的环境可用性">
    如果 Gateway 作为受管服务运行（launchd、systemd、Docker），Fireworks 密钥必须对该进程可见——而不仅仅对你的交互式 shell 可见。

    <Warning>
      仅在交互式 shell 中导出的密钥不会对 launchd 或 systemd 守护进程有帮助，除非该环境也在那里导入。在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置密钥，使其可从网关进程中读取。
    </Warning>

    OpenClaw 在加载配置时会加载 `~/.openclaw/.env`，因此存放在其中的密钥会在所有平台上送达受管的网关服务。轮换密钥后，请重启网关（或重新运行 `openclaw doctor --fix`）。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/tools/thinking" icon="brain">
    `/think` 级别、提供方策略，以及路由具备推理能力的模型。
  </Card>
  <Card title="Moonshot" href="/providers/moonshot" icon="moon">
    通过Moonshot自己的API以原生思维输出运行Kimi。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>
