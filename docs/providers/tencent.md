---
summary: "Tencent Cloud TokenHub 为 Hy3 预览版的设置"
title: "腾讯云（TokenHub）"
read_when:
  - 你想在 OpenClaw 中使用腾讯 Hy3 预览版
  - 你需要设置 TokenHub API 密钥
---

Tencent Cloud 作为一个捆绑的提供方插件随 OpenClaw 一起提供。它通过 TokenHub 端点（`tencent-tokenhub`）使用兼容 OpenAI 的 API，让你可以访问腾讯 Hy3 预览版。

| 属性             | 值                                                    |
| ---------------- | ----------------------------------------------------- |
| 提供方 id        | `tencent-tokenhub`                                    |
| 插件             | bundled, `enabledByDefault: true`                     |
| 身份验证环境变量 | `TOKENHUB_API_KEY`                                    |
| 上线引导标志     | `--auth-choice tokenhub-api-key`                      |
| 直接 CLI 标志    | `--tokenhub-api-key <key>`                            |
| API              | 兼容 OpenAI（`openai-completions`）                   |
| 默认基础 URL     | `https://tokenhub.tencentmaas.com/v1`                 |
| 全局基础 URL     | `https://tokenhub-intl.tencentmaas.com/v1`（覆盖）    |
| 默认模型         | `tencent-tokenhub/hy3-preview`                        |

## 快速开始

<Steps>
  <Step title="创建 TokenHub API 密钥">
    在腾讯云 TokenHub 中创建一个 API 密钥。如果你为该密钥选择了有限的访问范围，请将 **Hy3 预览版** 包含在允许的模型中。
  </Step>
  <Step title="运行 onboarding">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice tokenhub-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY"
```

```bash Env only
export TOKENHUB_API_KEY=...
```

    </CodeGroup>

  </Step>
  <Step title="验证模型">
    ```bash
    openclaw models list --provider tencent-tokenhub
    ```
  </Step>
</Steps>

## 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## 内置目录

| 模型引用                        | 名称                   | 输入  | 上下文  | 最大输出 | 备注                       |
| ------------------------------ | ---------------------- | ----- | ------- | -------- | -------------------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 预览版（TokenHub） | 文本  | 256,000 | 64,000   | 默认；支持推理             |

Hy3 预览版是腾讯混元的大型 MoE 语言模型，适用于推理、长上下文指令跟随、代码以及智能体工作流。腾讯的 OpenAI 兼容示例使用 `hy3-preview` 作为模型 id，并支持标准 chat-completions 工具调用以及 `reasoning_effort`。

<Tip>
  模型 id 是 `hy3-preview`。不要将它与腾讯的 `HY-3D-*` 模型混淆，这些模型是 3D 生成 API，并不是由此提供方配置的 OpenClaw 聊天模型。
</Tip>

## 分层定价

捆绑目录附带分层成本元数据，会随输入窗口长度变化，因此无需手动覆盖即可填充成本估算。

| 输入 tokens 范围 | 输入费率 | 输出费率 | 缓存读取 |
| ---------------- | -------- | -------- | -------- |
| 0 - 16,000       | 0.176    | 0.587    | 0.059    |
| 16,000 - 32,000  | 0.235    | 0.939    | 0.088    |
| 32,000+          | 0.293    | 1.173    | 0.117    |

费率按腾讯公布的标准计算，单位为每百万 tokens 的 USD。只有在你需要不同的展示方式时，才在 `models.providers.tencent-tokenhub` 下覆盖定价。

## 高级配置

<AccordionGroup>
  <Accordion title="端点覆盖">
    OpenClaw 默认使用腾讯云的 `https://tokenhub.tencentmaas.com/v1` 端点。腾讯也提供了国际版 TokenHub 端点：

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
    ```

    只有当你的 TokenHub 账户或地区需要时，才覆盖该端点。

  </Accordion>

  <Accordion title="守护进程的环境可用性">
    如果 Gateway 作为托管服务运行（launchd、systemd、Docker），`TOKENHUB_API_KEY` 必须对该进程可见。请将其设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，这样 launchd、systemd 或 Docker exec 环境才能读取它。

    <Warning>
      只设置在 `~/.profile` 中的密钥对托管的 gateway 进程不可见。为了持久可用，请使用 env 文件或配置缝合点。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration" icon="gear">
    包括提供方设置在内的完整配置 schema。
  </Card>
  <Card title="腾讯 TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    腾讯云 TokenHub 的产品页面。
  </Card>
  <Card title="Hy3 预览版模型卡" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    腾讯混元 Hy3 预览版详情和基准测试。
  </Card>
</CardGroup>