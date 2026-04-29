---
summary: "Tencent Cloud TokenHub 为 Hy3 预览版的设置"
title: "腾讯云（TokenHub）"
read_when:
  - 你想在 OpenClaw 中使用腾讯 Hy3 预览版
  - 你需要设置 TokenHub API 密钥
---

# 腾讯云 TokenHub

Tencent Cloud 作为 OpenClaw 中的 **内置提供商插件** 随附提供。它通过 TokenHub 端点（`tencent-tokenhub`）提供对腾讯 Hy3 预览版的访问。

该提供商使用与 OpenAI 兼容的 API。

| 属性          | 值                                         |
| ------------- | ------------------------------------------ |
| 提供商        | `tencent-tokenhub`                         |
| 默认模型      | `tencent-tokenhub/hy3-preview`             |
| 认证          | `TOKENHUB_API_KEY`                         |
| API           | 与 OpenAI 兼容的聊天补全                   |
| 基础 URL      | `https://tokenhub.tencentmaas.com/v1`      |
| 全局 URL      | `https://tokenhub-intl.tencentmaas.com/v1` |

## 快速开始

<Steps>
  <Step title="创建 TokenHub API 密钥">
    在腾讯云 TokenHub 中创建一个 API 密钥。如果你为该密钥选择了有限的访问范围，请将 **Hy3 预览版** 包含在允许的模型中。
  </Step>
  <Step title="运行引导流程">
    ```bash
    openclaw onboard --auth-choice tokenhub-api-key
    ```
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
模型 id 是 `hy3-preview`。不要将其与腾讯的 `HY-3D-*` 模型混淆，后者是 3D 生成 API，并不是由此提供商配置的 OpenClaw 聊天模型。
</Tip>

## 端点覆盖

OpenClaw 默认使用腾讯云的 `https://tokenhub.tencentmaas.com/v1` 端点。腾讯还提供了一个国际版 TokenHub 端点：

```bash
openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
```

只有在你的 TokenHub 账户或地区要求时，才覆盖该端点。

## 说明

- TokenHub 模型引用使用 `tencent-tokenhub/<modelId>`。
- 当前内置目录包含 `hy3-preview`。
- 该插件将 Hy3 预览版标记为支持推理和流式用量能力。
- 该插件附带分层的 Hy3 定价元数据，因此无需手动覆盖定价即可填充成本估算。
- 仅在需要时才在 `models.providers` 中覆盖定价、上下文或端点元数据。

## 环境说明

如果 Gateway 以守护进程运行（launchd/systemd），请确保 `TOKENHUB_API_KEY`
对该进程可用（例如在 `~/.openclaw/.env` 中，或通过
`env.shellEnv` 提供）。

## 相关文档

- [OpenClaw 配置](/gateway/configuration)
- [模型提供商](/concepts/model-providers)
- [腾讯 TokenHub 产品页](https://cloud.tencent.com/product/tokenhub)
- [腾讯 TokenHub 文本生成](https://cloud.tencent.com/document/product/1823/130079)
- [腾讯 TokenHub 为 Hy3 预览版的 Cline 设置](https://cloud.tencent.com/document/product/1823/130932)
- [腾讯 Hy3 预览版模型卡](https://huggingface.co/tencent/Hy3-preview)
