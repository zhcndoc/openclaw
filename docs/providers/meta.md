---
summary: "Meta 设置、身份验证以及 Muse Wonder 和 Muse Spark 模型选择"
title: "Meta"
read_when:
  - "您想要将 Meta 与 OpenClaw 一起使用"
  - "你需要 MODEL_API_KEY 环境变量或 CLI 认证选项"
---

**Meta API** 将 OpenAI- 兼容的 **Responses API** （`POST /v1/responses`） 用于 Muse Wonder 和 Muse Spark推理模型。 OpenClaw 提供 Meta 作为官方外部插件。

| 属性                   | 值                              |
| -------------------------- | ---------------------------------- |
| 提供方 id                | `meta`                             |
| 插件                     | `@openclaw/meta-provider`          |
| 认证环境变量               | `MODEL_API_KEY`                    |
| 引导标志            | `--auth-choice meta-api-key`       |
| 直接 CLI 标志            | `--meta-api-key <key>`             |
| API                        | 回复 API （`openai-responses`） |
| 基础 URL                   | `https://api.meta.ai/v1`           |
| 默认模型              | `meta/muse-spark-1.3`              |
| OpenClaw 推理默认值 | `high` (`reasoning.effort`)        |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/meta-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="set-the-api-key" title="设置API密钥">
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
  <Step id="verify-models-are-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider meta
    ```

    列出 Meta 目录条目。为 Wonder 选择 `meta/muse-wonder-1.0`。如果 `MODEL_API_KEY` 未解析，`openclaw models status --json` 会报告 `auth.unusableProfiles` 下缺少的凭证。

  </Step>
</Steps>

## <a id="non-interactive-setup"></a> 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice meta-api-key \
  --meta-api-key "$MODEL_API_KEY"
```

`--mode` 默认为 `local`，因此这与上面的 **Direct flag** 命令的运行相同。在网关主机上运行它：远程客户端加入 （`--mode remote`） 仅配置本地客户端连接，不会在服务器上设置提供程序凭据。

## <a id="built-in-catalog"></a> 内置目录

价格和数据使用条款来自 Meta 的 [ 定价和速率限制](https://dev.meta.ai/docs/pricing-rate-limits/) 文档。 Meta 的 [ 模型目录](https://dev.meta.ai/docs/models) 将 Muse Wonder 定位为复杂编码和长时间运行的代理，将 Muse Spark 定位为低成本工作负载。新设置将 Muse Spark 1.3 保留为默认值；奇迹是一种明确的选择。

| 模型引用                         | 名称                       | OpenClaw 输入 | 推理 | 上下文窗口 | 每 1M tokens 的输入／缓存输入／输出 |
| --------------------------------- | -------------------------- | -------------- | --------- | -------------- | ------------------------------------------- |
| `meta/muse-wonder-1.0`            | 缪斯奇迹                | 文本、图像    | 是       | 1,048,576      | $4.00 / $0.20 / $20.00                      |
| `meta/muse-spark-1.3`             | 缪斯火花 1.3             | 文本、图像    | 是       | 1,048,576      | $1.25 / $0.15 / $4.25                       |
| `meta/muse-spark-1.3-contributor` | Muse Spark 1.3 贡献者 | 文本、图像    | 是       | 1,048,576      | $0.10 / $0.002 / $0.20                      |
| `meta/muse-spark-1.2`             | 缪斯火花 1.2             | 文本、图像    | 是       | 1,048,576      | $1.25 / $0.15 / $4.25                       |
| `meta/muse-spark-1.2-contributor` | Muse Spark 1.2 贡献者 | 文本、图像    | 是       | 1,048,576      | $0.10 / $0.002 / $0.20                      |
| `meta/muse-spark-1.1`             | 缪斯火花 1.1             | 文本、图像    | 是       | 1,048,576      | $1.25 / $0.15 / $4.25                       |

Muse Wonder 仅在 Meta 模型 API 上提供标准模式。没有 `muse-wonder-1.0-contributor` API 模型。 **Muse Wonder Full** （`muse-wonder-full-1.0`） 只能通过本机 Muse 代码 CLI 的电源使用和最大使用订阅获得，而不是通过此 API 提供商获得。将 Wonder 的推理工作设置为 `max` 不会选择 Wonder Full。请参阅 [Meta 的可用性表](https://dev.meta.ai/docs/models#muse-wonder-availability)。

<Warning>
Meta 的 [ 定价文档](https://dev.meta.ai/docs/pricing-rate-limits/) 和 [ Service](https://dev.meta.ai/legal/terms-of-service) 的条款将标准服务与 Contributor/Discounted 服务区分开来：

- 标准服务是默认选项。Meta 表示，提交至标准服务的提示词和补全内容不会用于训练 Meta 模型。
- 通过使用 Contributor/Discounted 服务，即表示您允许 Meta 使用条款中所述的提交到这些服务并由这些服务生成的内容。根据条款，使用折扣服务即表示承认该许可。您不得向折扣服务提交敏感、机密或个人信息。

Meta 的 [ 地理使用 Policy](https://dev.meta.ai/legal/geographic-use-policy) 控制可用性。它限制了 API 在某些司法管辖区的访问，并为使用 Contributor/Discounted 模型构建的产品添加了最终用户部署限制；这些附加限制不适用于您自己的使用或使用标准服务构建的产品。
</Warning>

功能：

- 通过 OpenClaw 输入文本和图像
- 工具调用和流式传输
- 推理强度：`minimal`、`low`、`medium`、`high`、`xhigh`（OpenClaw 默认值：`high`）
- `max` Muse Wonder 和 Muse Spark 1.3 标准的努力；不适用于贡献者模型
- 无状态加密推理重放（`store: false`、`include: ["reasoning.encrypted_content"]`）

Meta 的[模型目录](https://dev.meta.ai/docs/models)列出了这些模型支持的文本、图像、视频、 音频和 PDF 输入。OpenClaw 的模型目录仅直接表示文本和图像输入；上游支持的其他模态并不是模型清单中的输入值。

OpenClaw 对这些模型使用 131,072 个代币的目录输出上限。 Meta 没有公布确切的最大输出数字；此上限并不是关于 Meta 最大值的声明。输出标记包括推理和可见文本。

如果未配置思考级别，OpenClaw 会明确选择 `high`。这是 OpenClaw 的默认行为，而不是 Meta 对省略参数的处理方式：Meta 的 [推理文档](https://dev.meta.ai/docs/reasoning/)说明，当省略 `reasoning.effort` 时，模型会以由模型决定的级别进行推理。

<Warning>
Muse Wonder 和 Muse Spark 不接受 `reasoning.effort: "none"`。对于该提供商，OpenClaw 将 `--thinking off` 映射到 `minimal`。
</Warning>

## <a id="manual-config"></a> 手动配置

```json5
{
  env: { vars: { MODEL_API_KEY: "<key>" } },
  agents: {
    defaults: {
      model: { primary: "meta/muse-wonder-1.0" },
      models: {
        "meta/muse-wonder-1.0": { alias: "Muse Wonder" },
      },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程运行（launchd、systemd、Docker），请确保该进程可以使用 `MODEL_API_KEY` —— 例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供。仅在交互式 shell 中导出的密钥对受管理的服务没有帮助，除非另外导入了 env。
</Note>

## <a id="muse-code-runtime"></a> Muse 代码运行时

默认情况下，`meta/*` 模型通过响应 API 在内置 OpenClaw 运行时上运行。要通过 Meta 的 Muse 代码 CLI 运行它们，请安装 `@openclaw/muse` 插件并在模型或提供程序上设置 `agentRuntime: { id: "muse" }`。请参阅 [Muse 代码代理运行时](/plugins/muse)。

在 **设置 → 模型** 中，选择 **连接提供商 → Meta → Muse Code** 登录并批准本机权限。如果 AI 模型已可用，则无需更换当前模型即可启用 Muse Code。当没有可用模型时，AI 设置流程也会选择经过验证的 Muse 模型。

## <a id="smoke-test"></a> 烟雾测试

```bash
export MODEL_API_KEY=<key>
pnpm test:live -- extensions/meta/meta.live.test.ts
```

现场套件练习启用了针对 `POST /v1/responses` 的 Meta 案例。要仅测试 Wonder，请添加 `-t muse-wonder-1.0`。其实际案例涵盖文本、图像输入、推理工作以及带有加密推理重放的工具调用往返。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="思维模式" href="/tools/thinking" icon="brain">
    Meta 模型的推理工作量级别。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
