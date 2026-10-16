---
summary: "DeepSeek 设置（认证 + 模型选择）"
title: "DeepSeek"
read_when:
  - "您想要将 DeepSeek 与 OpenClaw 一起使用"
  - "你需要 API 密钥环境变量或 CLI 认证选项"
---

[DeepSeek](https://www.deepseek.com) 提供功能强大的 AI 模型以及与 OpenAI- 兼容的 API。

| 属性 | 值                      |
| -------- | -------------------------- |
| 提供者 | `deepseek`                 |
| 认证     | `DEEPSEEK_API_KEY`         |
| API      | OpenAI-兼容          |
| 基础 URL | `https://api.deepseek.com` |

## <a id="install-plugin"></a> 安装插件

安装官方插件：

```bash
openclaw plugins install @openclaw/deepseek-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="get-your-api-key" title="获取您的 API 密钥">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys). 创建 API 密钥
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    提示输入你的 API 密钥，并将 `deepseek/deepseek-v4-pro` 设置为默认模型。

  </Step>
  <Step id="verify-models-are-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```

    如需在没有运行 Gateway 的情况下查看插件的静态目录：

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

Onboarding 会保留您的模型条目，并将生成的目录行留给发现。对于 `models.mode: "replace"`，它还会写入内置目录，因为该模式会跳过发现。

<AccordionGroup>
  <Accordion id="non-interactive-setup" title="非交互式设置">
    对于脚本化或无头安装，请直接传入所有标志：

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>
如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `DEEPSEEK_API_KEY` 对该进程可用（例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
</Warning>

## <a id="built-in-catalog"></a> 内置目录

| 模型引用                               | 名称                                    | 输入       | 上下文   | 最大输出 | 笔记                            |
| --------------------------------------- | --------------------------------------- | ----------- | --------- | ---------- | -------------------------------- |
| `deepseek/deepseek-flash`               | DeepSeek V4.1 闪存                     | 文本、图像 | 1,000,000 | 384,000    | 主闪光灯模型                 |
| `deepseek/deepseek-v4-flash`            | DeepSeek V4 闪存                       | 文本        | 1,000,000 | 384,000    | 快速、支持 V4 思考能力的界面 |
| `deepseek/deepseek-v4-pro`              | DeepSeek V4 Pro                         | 文本        | 1,000,000 | 384,000    | 入门引导默认设置               |
| `deepseek/deepseek-v4-flash-vision-exp` | DeepSeek V4 Flash 视觉（实验） | 文本、图像 | 1,000,000 | 384,000    | 实验图像理解 |

<Warning>
DeepSeek 于 2026 年 7 月 24 日 15：59 UTC 退役了 `deepseek-chat` 和 `deepseek-reasoner`。这些模型 ID 不再可访问。将配置的模型参考移至 `deepseek/deepseek-v4-flash` 或 `deepseek/deepseek-v4-pro`。
</Warning>

OpenClaw 的本地成本为估算值。 `deepseek/deepseek-flash` 使用 DeepSeek 的峰值费率：每百万个输入代币 $0.30、每百万个输出代币 $1.20 以及每百万个缓存输入代币 $0.006。公布的非高峰费率为该金额的一半。旧行保留其早期捆绑的元数据。 DeepSeek 仍接受 `deepseek-v4-flash` 和 `deepseek-v4-flash-vision-exp`，将它们路由到 V4.1 闪存，并按当前闪存费率对其进行计费。现有显式选择在 OpenClaw 中仍然有效。 DeepSeek 可更改费率；其[Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)页面是计费的权威页面。

对于图像输入，选择 `deepseek/deepseek-flash`。旧版 `deepseek/deepseek-v4-flash-vision-exp` 选择还保留了图像支持。 `deepseek/deepseek-flash` 通过相同的 API 和 API 密钥接受 PNG、JPEG、GIF 和 WebP 图像。有关图像限制，请参阅 [DeepSeek Vision](https://api-docs.deepseek.com/guides/vision)。

<Tip>
Flash和V4模型支持DeepSeek的`thinking`控制。 OpenClaw 还会在后续回合中重放 DeepSeek `reasoning_content`，以便可以继续进行工具调用的思考会话。使用`/think xhigh`或`/think max`搭配DeepSeek V4模型，要求DeepSeek的最大`reasoning_effort`；两者都映射到 `"max"`。
</Tip>

## <a id="thinking-and-tools"></a> Thinking 与工具

当 DeepSeek-format 端点以文本形式发出 DSML 工具标记时，OpenClaw 会将有效的 `calls`、`tool_calls`、`tool_call` 和 `function_calls` 块恢复到工具调用中，而不是在聊天中显示其负载。这包括带有分隔符空间的双全角标记。直接提供程序调用和免工具终结隐藏了这些块，无需恢复工具。格式错误或未完成的块也会被隐藏而不执行；现有工具权限仍然适用于恢复的呼叫。

DeepSeek V4思考会话需要重播来自思考轮的辅助信息，包括`reasoning_content`关于后续请求。OpenClaw's DeepSeek插件会自动回填该字段，因此可以正常使用多轮工具`deepseek/deepseek-flash`， `deepseek/deepseek-v4-flash`， `deepseek/deepseek-v4-flash-vision-exp`， 和`deepseek/deepseek-v4-pro`即使历史来自另一个OpenAI-兼容的提供者（没有本地`reasoning_content`）或来自普通的助理消息。不`/new`会话中途切换提供商后需要。

当 thinking 被禁用时（包括 UI 中选择 **None**），OpenClaw 会发送 `thinking: { type: "disabled" }`，并从外发历史记录中移除重放的 `reasoning_content`， 使会话保持在非 thinking 的 DeepSeek 路径上。

新入门引导选择`deepseek/deepseek-v4-pro`。选择闪存：

```bash
openclaw models set deepseek/deepseek-flash
```

## <a id="live-testing"></a> 在线测试

若只运行现代模型 live 套件中 DeepSeek V4 直接模型检查，请执行：

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

用于验证两个 V4 模型都能完成，并且 thinking/tool 后续轮次会保留 DeepSeek 所需的重放载荷。

使用相同的 `DEEPSEEK_API_KEY` 检查实验视觉模型：

```bash
OPENCLAW_LIVE_DEEPSEEK_MODEL=deepseek-v4-flash-vision-exp \
pnpm test:live extensions/deepseek/deepseek.live.test.ts
```

这将针对所选模型运行文本、生成图像识别和思维回放检查。

## <a id="config-example"></a> 配置示例

```json5
{
  env: { vars: { DEEPSEEK_API_KEY: "sk-..." } },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-v4-pro" },
    },
  },
}
```

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="DS4本地服务器" href="/providers/ds4" icon="server">
    从本地 OpenAI- 兼容 ds4 服务器运行 DeepSeek V4 Flash。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
</CardGroup>
