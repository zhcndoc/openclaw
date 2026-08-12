---
summary: "Meta 设置、身份验证和 Muse Spark 模型选择"
title: "Meta"
read_when:
  - 你想在 OpenClaw 中使用 Meta
  - 你需要 MODEL_API_KEY 环境变量或 CLI 认证选项
---

**Meta API** 使用与 OpenAI 兼容的 **Responses API**（`POST /v1/responses`）
来处理 Muse Spark 推理模型。OpenClaw 将 Meta 作为官方外部插件提供。

| 属性                       | 值                                |
| -------------------------- | ---------------------------------- |
| 提供商 ID                  | `meta`                             |
| 插件                       | `@openclaw/meta-provider`          |
| 认证环境变量               | `MODEL_API_KEY`                    |
| 引导标志                   | `--auth-choice meta-api-key`       |
| 直接 CLI 参数              | `--meta-api-key <key>`             |
| API                        | Responses API（`openai-responses`） |
| 基础 URL                   | `https://api.meta.ai/v1`           |
| 默认模型                   | `meta/muse-spark-1.1`              |
| OpenClaw 推理默认值        | `high`（`reasoning.effort`）       |

## 开始使用

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/meta-provider
    openclaw gateway restart
    ```
  </Step>
  <Step title="设置 API 密钥">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice meta-api-key
```

```bash Direct flag
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice meta-api-key \
  --meta-api-key "$MODEL_API_KEY"
```

```bash Env only
export MODEL_API_KEY=<key>
```

    </CodeGroup>

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider meta
    ```

    列出静态的 Muse Spark catalog 条目。如果 `MODEL_API_KEY` 未解析，
    `openclaw models status --json` 会在 `auth.unusableProfiles` 下报告缺失的凭据。

  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice meta-api-key \
  --meta-api-key "$MODEL_API_KEY"
```

## 内置目录

价格和数据使用条款来自 Meta 的
[定价和速率限制](https://dev.meta.ai/docs/pricing-rate-limits/)
文档。

| 模型引用                         | 名称                       | OpenClaw 输入 | 推理      | 上下文窗口     | 每 1M tokens 的输入／缓存输入／输出             |
| --------------------------------- | -------------------------- | -------------- | --------- | -------------- | ------------------------------------------- |
| `meta/muse-spark-1.1`             | Muse Spark 1.1             | text、image    | 是        | 1,048,576      | $1.25／$0.15／$4.25                       |
| `meta/muse-spark-1.2`             | Muse Spark 1.2             | text、image    | 是        | 1,048,576      | $1.25／$0.15／$4.25                       |
| `meta/muse-spark-1.2-contributor` | Muse Spark 1.2 Contributor | text、image    | 是        | 1,048,576      | $0.10／$0.002／$0.20                      |

<Warning>
Meta 的[定价文档](https://dev.meta.ai/docs/pricing-rate-limits/)和
[服务条款](https://dev.meta.ai/legal/terms-of-service)区分了标准服务
和 Contributor／Discounted 服务：

- 标准服务是默认选项。Meta 表示，提交至标准服务的提示词和补全内容不会用于训练 Meta 模型。
- 通过使用 Contributor／Discounted 服务，你允许 Meta 按照条款中的说明使用提交至这些服务以及由这些服务生成的内容。根据条款，使用 Discounted 服务即表示你认可该许可。你不得向 Discounted 服务提交敏感、机密或个人信息。

Meta 的[地理使用政策](https://dev.meta.ai/legal/geographic-use-policy)
规定了可用性。该政策限制了某些司法管辖区的 API 访问，并对使用 Contributor／Discounted 模型构建的产品增加了终端用户部署限制；
这些额外限制不适用于你自行使用标准服务或使用标准服务构建的产品。
</Warning>

功能：

- 通过 OpenClaw 输入文本和图像
- 工具调用和流式传输
- 推理强度：`minimal`、`low`、`medium`、`high`、`xhigh`（OpenClaw 默认值：`high`）
- 无状态加密推理重放（`store: false`、`include: ["reasoning.encrypted_content"]`）

Meta 的[模型目录](https://dev.meta.ai/docs/models)列出了这些模型支持的文本、图像、视频、
音频和 PDF 输入。OpenClaw 的模型目录仅直接表示文本和图像输入；上游支持的其他模态并不是模型清单中的输入
值。

如果未配置思考级别，OpenClaw 会明确选择 `high`。这是
OpenClaw 的默认行为，而不是 Meta 对省略参数的处理方式：Meta 的
[推理文档](https://dev.meta.ai/docs/reasoning/)说明，当省略
`reasoning.effort` 时，模型会以由模型决定的级别进行推理。

<Warning>
Muse Spark 不接受 `reasoning.effort: "none"`。对于此提供商，OpenClaw 会将
`--thinking off` 映射为 `minimal`。
</Warning>

## 手动配置

```json5
{
  env: { vars: { MODEL_API_KEY: "<key>" } },
  agents: {
    defaults: {
      model: { primary: "meta/muse-spark-1.1" },
      models: {
        "meta/muse-spark-1.1": { alias: "Muse Spark 1.1" },
      },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程运行（launchd、systemd、Docker），请确保该进程可以使用 `MODEL_API_KEY` —— 例如放在
`~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。仅在交互式 shell 中导出的密钥对受管理的服务没有帮助，除非另外导入了 env。
</Note>

## 烟雾测试

```bash
export MODEL_API_KEY=<key>
pnpm test:live -- extensions/meta/meta.live.test.ts
```

实时测试套件会针对 `POST /v1/responses` 执行已启用的 Meta 用例。

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="思考模式" href="/tools/thinking" icon="brain">
    Muse Spark 的推理力度级别。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
