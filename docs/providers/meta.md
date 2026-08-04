---
summary: "Meta 设置（认证 + muse-spark-1.1 模型选择）"
title: "Meta"
read_when:
  - 你想在 OpenClaw 中使用 Meta
  - 你需要 MODEL_API_KEY 环境变量或 CLI 认证选项
---

**Meta API** 使用与 OpenAI 兼容的 **Responses API**（`POST /v1/responses`）
来调用 `muse-spark-1.1` 推理模型。OpenClaw 将 Meta 作为官方
外部插件提供。

| 属性               | 值                                |
| ------------------ | ---------------------------------- |
| 提供商 ID          | `meta`                             |
| 插件               | `@openclaw/meta-provider`          |
| 认证环境变量       | `MODEL_API_KEY`                    |
| 初始化标志         | `--auth-choice meta-api-key`       |
| 直接 CLI 标志      | `--meta-api-key <key>`             |
| API                | Responses API（`openai-responses`） |
| 基础 URL           | `https://api.meta.ai/v1`           |
| 默认模型           | `meta/muse-spark-1.1`              |
| 默认推理级别       | `high`（`reasoning.effort`）        |

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
openclaw onboard --non-interactive --accept-risk \
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

    列出静态的 `muse-spark-1.1` 目录条目。如果 `MODEL_API_KEY` 未解析，
    `openclaw models status --json` 会在
    `auth.unusableProfiles` 下报告缺失的凭据。

  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk \
  --mode local \
  --auth-choice meta-api-key \
  --meta-api-key "$MODEL_API_KEY"
```

## 内置目录

| 模型引用                 | 名称           | 输入       | 推理 | 上下文窗口     | 最大输出   | 每 1M token 的输入 / 缓存输入 / 输出 |
| ------------------------ | -------------- | ---------- | ---- | -------------- | ---------- | ----------------------------------- |
| `meta/muse-spark-1.1`    | Muse Spark 1.1 | 文本、图像 | 是   | 1,048,576      | 131,072    | $1.25 / $0.15 / $4.25               |

功能：

- 文本和图像输入
- 工具调用和流式传输
- 推理强度：`minimal`、`low`、`medium`、`high`、`xhigh`（默认：`high`）
- 无状态加密推理重放（`store: false`、`include: ["reasoning.encrypted_content"]`）

<Warning>
`muse-spark-1.1` 不接受 `reasoning.effort: "none"`。OpenClaw 会将
`--thinking off` 映射为此提供方的 `minimal`。
</Warning>

## 手动配置

```json5
{
  env: { MODEL_API_KEY: "<key>" },
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

实时测试使用 `muse-spark-1.1` 调用 `POST /v1/responses`。

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="思考模式" href="/tools/thinking" icon="brain">
    muse-spark-1.1 的推理努力级别。
  </Card>
  <Card title="配置参考" href="/gateway/config-agents#agent-defaults" icon="gear">
    代理默认值和模型配置。
  </Card>
</CardGroup>
