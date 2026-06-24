---
summary: "Tencent Cloud TokenHub 的 Hy3 预览版设置"
title: "腾讯云（TokenHub）"
read_when:
  - 你想在 OpenClaw 中使用腾讯 Hy3 预览版
  - 你需要设置一个 TokenHub API 密钥
---

安装官方的腾讯云提供方插件，通过 TokenHub 端点（`tencent-tokenhub`）使用兼容 OpenAI 的 API 来访问腾讯 Hy3 预览版。

| 属性             | 值                                                   |
| ---------------- | ---------------------------------------------------- |
| 提供方 id        | `tencent-tokenhub`                                   |
| 包                | `@openclaw/tencent-provider`                         |
| 认证环境变量      | `TOKENHUB_API_KEY`                                   |
| 引导标志          | `--auth-choice tokenhub-api-key`                     |
| 直接 CLI 标志     | `--tokenhub-api-key <key>`                           |
| API              | 兼容 OpenAI（`openai-completions`）                  |
| 默认基础 URL      | `https://tokenhub.tencentmaas.com/v1`                |
| 全局基础 URL      | `https://tokenhub-intl.tencentmaas.com/v1`（覆盖）   |
| 默认模型          | `tencent-tokenhub/hy3-preview`                    |

## 快速开始

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/tencent-provider
    ```
  </Step>
  <Step title="创建 TokenHub API 密钥">
    在腾讯云 TokenHub 中创建一个 API 密钥。如果你为该密钥选择了受限访问范围，请将 **Hy3 preview** 包含在允许的模型中。
  </Step>
  <Step title="运行引导">
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

| 模型引用                       | 名称                      | 输入 | 上下文    | 最大输出 | 备注                     |
| ------------------------------ | ------------------------- | ---- | --------- | -------- | ------------------------ |
| `tencent-tokenhub/hy3-preview` | Hy3 preview（TokenHub）   | 文本 | 256,000   | 64,000   | 默认；支持推理           |

Hy3 preview 是腾讯混元推出的大型 MoE 语言模型，适用于推理、长上下文指令跟随、代码和智能体工作流。腾讯的 OpenAI 兼容示例使用 `hy3-preview` 作为模型 id，并支持标准的 chat-completions 工具调用以及 `reasoning_effort`。

<Tip>
  模型 id 是 `hy3-preview`。不要将其与腾讯的 `HY-3D-*` 模型混淆，后者是 3D 生成 API，并不是此提供方配置的 OpenClaw 聊天模型。
</Tip>

## 分层定价

提供方目录包含随输入窗口长度变化的分层成本元数据，因此无需手动覆盖即可填充成本估算。

| 输入 token 范围 | 输入费率 | 输出费率 | 缓存读取 |
| ---------------- | -------- | -------- | -------- |
| 0 - 16,000      | 0.176    | 0.587    | 0.059    |
| 16,000 - 32,000 | 0.235    | 0.939    | 0.088    |
| 32,000+         | 0.293    | 1.173    | 0.117    |

费率按照腾讯公布的标准计算，以每百万 token 的美元计价。仅当你需要不同的展示方式时，才在 `models.providers.tencent-tokenhub` 下覆盖定价。

## 高级配置

<AccordionGroup>
  <Accordion title="端点覆盖">
    OpenClaw 默认使用腾讯云的 `https://tokenhub.tencentmaas.com/v1` 端点。腾讯还提供了一个国际版 TokenHub 端点：

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
    ```

    仅当你的 TokenHub 账户或区域要求时，才覆盖此端点。

  </Accordion>

  <Accordion title="守护进程环境可用性">
    如果 Gateway 作为托管服务运行（launchd、systemd、Docker），`TOKENHUB_API_KEY` 必须对该进程可见。将其设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，以便 launchd、systemd 或 Docker exec 环境可以读取它。

    <Warning>
      仅在交互式 shell 中导出的密钥对受管理的 gateway 进程不可见。请使用 env 文件或 config seam 以确保持久可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供方" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration" icon="gear">
    包括提供方设置在内的完整配置 schema。
  </Card>
  <Card title="腾讯 TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    腾讯云 TokenHub 的产品页面。
  </Card>
  <Card title="Hy3 preview 模型卡" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    腾讯混元 Hy3 preview 的详细信息和基准测试。
  </Card>
</CardGroup>