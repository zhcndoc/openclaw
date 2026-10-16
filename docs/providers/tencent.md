---
summary: "Tencent Cloud TokenHub 和 TokenPlan hy4-preview 设置"
title: "Tencent Cloud (TokenHub / TokenPlan)"
read_when:
  - "您想将腾讯hy4-preview与OpenClaw一起使用"
  - "你需要 TokenHub 或 TokenPlan 的 API 密钥配置"
---

安装官方的Tencent Cloud接入腾讯混元聊天模型的provider插件（`hy4-preview`， `hy3`） 通过两个端点 —TokenHub （`tencent-tokenhub`） 和TokenPlan （`tencent-tokenplan`） — 使用OpenAI-兼容的API。

| 属性                  | 值                                                 |
| ------------------------- | ----------------------------------------------------- |
| 提供商 ID              | `tencent-tokenhub`, `tencent-tokenplan`               |
| 包裹                   | `@openclaw/tencent-provider`                          |
| TokenHub 身份验证环境变量     | `TOKENHUB_API_KEY`                                    |
| TokenPlan 身份验证环境变量    | `TOKENPLAN_API_KEY`                                   |
| TokenHub 引导标志  | `--auth-choice tokenhub-api-key`                      |
| TokenPlan 引导标志 | `--auth-choice tokenplan-api-key`                     |
| TokenHub 直接 CLI 标志  | `--tokenhub-api-key <key>`                            |
| TokenPlan 直接 CLI 标志 | `--tokenplan-api-key <key>`                           |
| API                       | OpenAI-兼容（`openai-completions`）              |
| TokenHub 基础 URL         | `https://tokenhub.tencentmaas.com/v1`                 |
| TokenHub 全局基础 URL  | `https://tokenhub-intl.tencentmaas.com/v1`（覆盖） |
| TokenPlan 基础 URL        | `https://api.lkeap.cloud.tencent.com/plan/v3`         |
| 默认模型             | `tencent-tokenhub/hy4-preview`                        |

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="create-a-tencent-api-key" title="创建腾讯API密钥">
    创建一个API关键是Tencent Cloud TokenHub和TokenPlan。如果您为密钥选择有限的访问范围，请包括**hy4预览**（和**hy3** / **hy3预览**如果您打算使用它们TokenHub）在允许的模型中。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
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
  <Step id="verify-the-model" title="验证模型">
    ```bash
    openclaw models list --provider tencent-tokenhub
    openclaw models list --provider tencent-tokenplan
    ```
  </Step>
</Steps>

Onboarding 会保留您的模型条目，并将生成的目录行留给发现。对于 `models.mode: "replace"`，它还会写入内置目录，因为该模式会跳过发现。

## <a id="non-interactive-setup"></a> 非交互式设置

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
`--accept-risk` 与 `--non-interactive` 一起需要。 `--mode` 默认为 `local`，因此这些运行与上面的 **direct flag** 命令相同。在网关主机上运行它们：远程客户端加入 （`--mode remote`） 仅配置本地客户端连接，不会在服务器上设置提供程序凭据。
</Note>

## <a id="built-in-catalog"></a> 内置目录

| 模型引用                       | 名称                    | 输入 | 上下文   | 最大输出 | 笔记                          |
| ------------------------------- | ----------------------- | ----- | --------- | ---------- | ------------------------------ |
| `tencent-tokenhub/hy4-preview`  | hy4 预览 （TokenHub）  | 文本  | 1,024,000 | 64,000     | 推理能力强； **默认** |
| `tencent-tokenhub/hy3`          | hy3 (TokenHub)          | 文本  | 256,000   | 128,000    | 推理能力强；上一页 GA |
| `tencent-tokenhub/hy3-preview`  | hy3 预览 （TokenHub）  | 文本  | 256,000   | 128,000    | 已弃用；使用`hy4-preview`  |
| `tencent-tokenplan/hy4-preview` | hy4 预览 （TokenPlan） | 文本  | 1,024,000 | 64,000     | 推理能力强； **默认** |
| `tencent-tokenplan/hy3`         | hy3 (TokenPlan)         | 文本  | 256,000   | 128,000    | 推理能力强；上一页 GA |

`hy4-preview` 是腾讯混元的大型 MoE 语言模型，用于推理、长上下文指令跟踪、代码和代理工作流程。腾讯的 OpenAI- 兼容示例使用 `hy4-preview` 作为模型 ID，并支持标准聊天完成工具调用以及 `reasoning_effort`。

## <a id="existing-tokenhub-configurations"></a> 现有 TokenHub 配置

新加入在两个端点上选择 `hy4-preview`。现有的 TokenHub 配置遵循单独的迁移策略：配置 TokenHub 模型允许列表时，`openclaw doctor --fix` 将已弃用的 `tencent-tokenhub/hy3-preview` 主要更改为 `tencent-tokenhub/hy3`，而不是 Hy4。这适用于字符串和对象主要设置，并保留后备、自定义别名和不相关的设置。显式 `hy3` 和 `hy4-preview` 初选保持不变。

`hy3-preview` 的目录推荐仍然是 `hy4-preview`，但它不是 Doctor 迁移目标。迁移到 Hy4 是一个明确的选择：查看其不同的定价并验证所选端点的模型访问权限。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="endpoint-override" title="端点覆盖">
    OpenClaw 的内置目录使用 Tencent Cloud 的 `https://tokenhub.tencentmaas.com/v1` 端点。仅当您的 TokenHub 帐户或区域需要不同的帐户或区域时才覆盖它：

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://your-endpoint/v1"
    ```

  </Accordion>

  <Accordion id="environment-availability-for-the-daemon" title="守护进程的环境可用性">
    如果 Gateway 作为托管服务运行（launchd、systemd、Docker），`TOKENHUB_API_KEY` 和 `TOKENPLAN_API_KEY` 必须对该进程可见。请在 `~/.openclaw/.env` 中设置它们，或通过 `env.shellEnv` 设置，以便 launchd、systemd 或 Docker exec 环境可以读取它们。

    <Warning>
      仅在交互式 shell 中导出的密钥对托管网关进程不可见。使用 env 文件或配置设置来实现持久可用性。
    </Warning>

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括提供方设置在内的完整配置模式。
  </Card>
  <Card title="腾讯TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    Tencent Cloud 的 TokenHub 产品页面。
  </Card>
  <Card title="Hy3预览模型卡" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    腾讯混元 Hy3 预览版的详细信息和基准测试。
  </Card>
</CardGroup>
