---
summary: "使用 Kilo Gateway 的统一 API 在 OpenClaw 中访问众多模型"
title: "Kilo Gateway"
read_when:
  - "您需要一个 API 密钥来支持多个 LLM"
  - "您想通过 OpenClaw 中的 Kilo Gateway 运行模型"
---

Kilo Gateway 将请求路由到单个 OpenAI- 兼容端点和 API 密钥后面的多个模型。

| 属性 | 值                              |
| -------- | ---------------------------------- |
| 提供者 | `kilocode`（别名：`kilo`）         |
| 认证     | `KILOCODE_API_KEY`                 |
| API      | OpenAI-兼容                  |
| 基础 URL | `https://api.kilo.ai/api/gateway/` |

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/kilocode-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="setup"></a> 设置

<Steps>
  <Step id="create-an-account" title="创建一个帐户">
    Go 到 [app.kilo.ai](https://app.kilo.ai)，登录或创建帐户，然后生成 API 密钥。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --auth-choice kilocode-api-key
    ```

    或直接设置环境变量：

    ```bash
    export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
    ```

  </Step>
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider kilocode
    ```
  </Step>
</Steps>

Onboarding 会保留您的模型条目，并将生成的目录行留给发现。对于 `models.mode: "replace"`，它还会写入内置目录，因为该模式会跳过发现。

## <a id="default-model-and-catalog"></a> 默认模型和目录

默认模型是 `kilocode/kilo-auto/balanced`，即 Kilo Gateway 的平衡智能路由层。 OpenClaw 不会发布任务到上游模型的映射；`kilo-auto/balanced` 背后的路由由 Kilo Gateway 负责。

启动时，OpenClaw 查询 `GET https://api.kilo.ai/api/gateway/models` 并将非空公共列表与静态路由条目组合起来。静态目录仅包含`kilocode/kilo-auto/balanced`（`Auto Balanced`、`input: ["text", "image"]`、`reasoning: true`、`contextWindow: 1000000`、`maxTokens: 65536`）。

网关上的任何模型都可以通过 `kilocode/<upstream-id>` 访问（例如 `kilocode/anthropic/claude-sonnet-4`、`kilocode/openai/gpt-5.5`）。运行 `/models kilocode` 或 `openclaw models list --provider kilocode` 可以查看完整的已发现列表。

## <a id="config-example"></a> 配置示例

```json5
{
  env: { vars: { KILOCODE_API_KEY: "<your-kilocode-api-key>" } }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo-auto/balanced" },
    },
  },
}
```

## <a id="behavior-notes"></a> 行为说明

<AccordionGroup>
  <Accordion id="transport-and-compatibility" title="运输和兼容性">
    Kilo Gateway 与 OpenRouter- 兼容，因此它使用代理样式的 OpenAI- 兼容请求路径，而不是本机 OpenAI 请求整形（没有 `store`，没有 OpenAI 推理工作负载）。

    - Gemini-backed Kilo 引用保留在 proxy-Gemini 路径上：OpenClaw 清理那里的 Gemini 思想签名，但不启用本机 Gemini 重播验证或引导重写。
    - 请求使用由你的 API 密钥生成的 Bearer token。

  </Accordion>

  <Accordion id="stream-wrapper-and-reasoning" title="流包装器和推理">
    Kilo 流包装器会添加一个 `X-KILOCODE-FEATURE` 请求头（默认值为 `openclaw`， 可通过 `KILOCODE_FEATURE` 环境变量覆盖），并为支持该功能的模型规范化 reasoning-effort 负载。

    <Warning>
    `kilocode/kilo-auto/balanced` 和 `x-ai/*` 引用会跳过 reasoning-effort 注入。如果你需要推理支持，请使用具体的模型引用，例如 `kilocode/anthropic/claude-sonnet-4`。
    </Warning>

  </Accordion>

  <Accordion id="troubleshooting" title="故障排查">
    - 如果模型发现失败，OpenClaw 报告目录刷新不可用。它不会用静态行替换失败的请求或将空响应转换为 `kilocode/kilo-auto/balanced`。
    - 确认你的 API 密钥有效，并且你的 Kilo 账户已启用所需的模型。
    - 当网关作为守护进程运行时，使 `KILOCODE_API_KEY` 可用于该进程（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Kilo Gateway" href="https://app.kilo.ai" icon="arrow-up-right-from-square">
    Kilo Gateway 控制面板、API 密钥和账户管理。
  </Card>
</CardGroup>
