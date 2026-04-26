---
summary: "Tencent Cloud TokenHub 用于 Hy3 preview 的设置"
title: "腾讯云（TokenHub）"
read_when:
  - 你想将 Tencent Hy3 preview 与 OpenClaw 一起使用
  - 你需要 TokenHub API key 的设置
---

# Tencent Cloud TokenHub

Tencent Cloud 作为 OpenClaw 中的 **内置提供程序插件** 提供。它通过 TokenHub 端点（`tencent-tokenhub`）访问 Tencent Hy3 preview。

该提供程序使用与 OpenAI 兼容的 API。

| Property      | Value                                      |
| ------------- | ------------------------------------------ |
| Provider      | `tencent-tokenhub`                         |
| Default model | `tencent-tokenhub/hy3-preview`             |
| Auth          | `TOKENHUB_API_KEY`                         |
| API           | OpenAI 兼容的 chat completions            |
| Base URL      | `https://tokenhub.tencentmaas.com/v1`      |
| Global URL    | `https://tokenhub-intl.tencentmaas.com/v1` |

## 快速开始

<Steps>
  <Step title="创建 TokenHub API key">
    在 Tencent Cloud TokenHub 中创建一个 API key。如果你为该 key 选择了有限访问范围，请在允许的模型中包含 **Hy3 preview**。
  </Step>
  <Step title="运行 onboarding">
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

| Model ref                      | Name                   | Input | Context | Max output | Notes                      |
| ------------------------------ | ---------------------- | ----- | ------- | ---------- | -------------------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 preview (TokenHub) | text  | 256,000 | 64,000     | Default; 支持推理 |

Hy3 preview 是 Tencent Hunyuan 的大型 MoE 语言模型，适用于推理、长上下文指令遵循、代码以及代理工作流。Tencent 的 OpenAI 兼容示例使用 `hy3-preview` 作为模型 id，并支持标准的 chat-completions 工具调用以及 `reasoning_effort`。

<Tip>
模型 id 是 `hy3-preview`。不要将其与 Tencent 的 `HY-3D-*` 模型混淆，后者是 3D 生成 API，并不是由该提供程序配置的 OpenClaw chat 模型。
</Tip>

## 端点覆盖

OpenClaw 默认使用 Tencent Cloud 的 `https://tokenhub.tencentmaas.com/v1` 端点。Tencent 还提供了国际版 TokenHub 端点文档：

```bash
openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
```

仅当你的 TokenHub 账户或区域要求时，才覆盖该端点。

## 注意事项

- TokenHub model refs 使用 `tencent-tokenhub/<modelId>`。
- 内置目录当前包含 `hy3-preview`。
- 该插件将 Hy3 preview 标记为支持推理和支持 streaming-usage。
- 该插件附带分层的 Hy3 定价元数据，因此无需手动覆盖定价即可填充成本估算。
- 仅在需要时才在 `models.providers` 中覆盖定价、上下文或端点元数据。

## 环境说明

如果 Gateway 以守护进程（launchd/systemd）运行，请确保 `TOKENHUB_API_KEY`
对该进程可用（例如，在 `~/.openclaw/.env` 中，或通过
`env.shellEnv` 提供）。

## 相关文档

- [OpenClaw Configuration](/gateway/configuration)
- [Model Providers](/concepts/model-providers)
- [Tencent TokenHub product page](https://cloud.tencent.com/product/tokenhub)
- [Tencent TokenHub text generation](https://cloud.tencent.com/document/product/1823/130079)
- [Tencent TokenHub Cline setup for Hy3 preview](https://cloud.tencent.com/document/product/1823/130932)
- [Tencent Hy3 preview model card](https://huggingface.co/tencent/Hy3-preview)
