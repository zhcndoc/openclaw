---
summary: "腾讯云 TokenHub 和 TokenPlan 的 hy3 配置"
title: "腾讯云（TokenHub / TokenPlan）"
read_when:
  - 你想在 OpenClaw 中使用腾讯 hy3
  - 你需要 TokenHub 或 TokenPlan 的 API 密钥配置
---

安装官方腾讯云提供商插件，即可通过两个端点访问腾讯 Hy3——TokenHub（`tencent-tokenhub`）和 TokenPlan（`tencent-tokenplan`）——并使用兼容 OpenAI 的 API。

| 属性                     | 值                                                     |
| ------------------------ | ------------------------------------------------------ |
| 提供商 ID                | `tencent-tokenhub`、`tencent-tokenplan`                |
| 软件包                   | `@openclaw/tencent-provider`                           |
| TokenHub 身份验证环境变量 | `TOKENHUB_API_KEY`                                     |
| TokenPlan 身份验证环境变量 | `TOKENPLAN_API_KEY`                                    |
| TokenHub 引导标志        | `--auth-choice tokenhub-api-key`                       |
| TokenPlan 引导标志       | `--auth-choice tokenplan-api-key`                      |
| TokenHub 直接 CLI 标志    | `--tokenhub-api-key <key>`                             |
| TokenPlan 直接 CLI 标志   | `--tokenplan-api-key <key>`                            |
| API                      | OpenAI 兼容（`openai-completions`）                   |
| TokenHub 基础 URL         | `https://tokenhub.tencentmaas.com/v1`                  |
| TokenHub 全局基础 URL     | `https://tokenhub-intl.tencentmaas.com/v1`（覆盖）    |
| TokenPlan 基础 URL        | `https://api.lkeap.cloud.tencent.com/plan/v3`          |
| 默认模型                 | `tencent-tokenhub/hy3`                                 |

## 快速开始

<Steps>
  <Step title="创建腾讯 API 密钥">
    为 Tencent Cloud TokenHub 和 TokenPlan 创建一个 API 密钥。如果你为该密钥选择了受限访问范围，请在允许的模型中包含 **hy3**（如果你计划在 TokenHub 上使用它，还要包含 **hy3 preview**）。
  </Step>
  <Step title="运行引导">
    <CodeGroup>

```bash TokenHub onboarding
openclaw onboard --auth-choice tokenhub-api-key
```

```bash TokenHub direct flag
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY"
```

```bash TokenPlan onboarding
openclaw onboard --auth-choice tokenplan-api-key
```

```bash TokenPlan direct flag
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice tokenplan-api-key \
  --tokenplan-api-key "$TOKENPLAN_API_KEY"
```

```bash Env only
export TOKENHUB_API_KEY=...
export TOKENPLAN_API_KEY=...
```

    </CodeGroup>

  </Step>
  <Step title="验证模型">
    ```bash
    openclaw models list --provider tencent-tokenhub
    openclaw models list --provider tencent-tokenplan
    ```
  </Step>
</Steps>

## 非交互式设置

```bash
# TokenHub
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk

# TokenPlan
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenplan-api-key \
  --tokenplan-api-key "$TOKENPLAN_API_KEY" \
  --skip-health \
  --accept-risk
```

<Note>
与 `--non-interactive` 一起使用时，需要指定 `--accept-risk`。
</Note>

## 内置目录

| 模型引用                       | 名称                   | 输入 | 上下文  | 最大输出   | 备注                         |
| ------------------------------ | ---------------------- | ----- | ------- | ---------- | ---------------------------- |
| `tencent-tokenhub/hy3-preview` | hy3 preview（TokenHub） | text  | 256,000 | 128,000    | 已弃用；请使用 `hy3`          |
| `tencent-tokenhub/hy3`         | hy3（TokenHub）         | text  | 256,000 | 128,000    | 支持推理；当前版本             |
| `tencent-tokenplan/hy3`        | hy3（TokenPlan）        | text  | 256,000 | 128,000    | 支持推理；当前版本             |

hy3 是腾讯混元用于推理、长上下文指令遵循、代码和代理工作流的大型 MoE 语言模型。腾讯的 OpenAI 兼容示例使用 `hy3` 作为模型 id，并支持标准的 chat-completions 工具调用以及 `reasoning_effort`。

<Tip>
  模型 id 是 `hy3`。不要将其与腾讯的 `HY-3D-*` 模型混淆，后者是 3D 生成 API，并不是此提供商配置的 OpenClaw 聊天模型。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="端点覆盖">
    OpenClaw 内置目录使用腾讯云的 `https://tokenhub.tencentmaas.com/v1` 端点。仅当你的 TokenHub 账号或区域需要不同端点时才进行覆盖：

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://your-endpoint/v1"
    ```

  </Accordion>

  <Accordion title="守护进程的环境可用性">
    如果 Gateway 作为托管服务运行（launchd、systemd、Docker），`TOKENHUB_API_KEY` 和 `TOKENPLAN_API_KEY` 必须对该进程可见。请在 `~/.openclaw/.env` 中设置它们，或通过 `env.shellEnv` 设置，以便 launchd、systemd 或 Docker exec 环境可以读取它们。

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
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="腾讯 TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    腾讯云 TokenHub 的产品页面。
  </Card>
  <Card title="Hy3 预览模型卡" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    腾讯混元 Hy3 预览版的详细信息和基准测试。
  </Card>
</CardGroup>