---
summary: "GLM 模型家族概览及其在 OpenClaw 中的使用方法"
read_when:
  - 你想在 OpenClaw 中使用 GLM 模型
  - 你需要了解模型命名规范和设置方式
title: "GLM（智谱）"
---

GLM 是一个模型家族（不是公司），可通过 [Z.AI](https://z.ai) 平台使用。在 OpenClaw 中，GLM 模型通过内置的 `zai` 提供方访问，引用形式如 `zai/glm-5.1`。

| 属性                | 值                                                                          |
| ------------------- | --------------------------------------------------------------------------- |
| Provider id         | `zai`                                                                       |
| Plugin              | bundled, `enabledByDefault: true`                                           |
| Auth env vars       | `ZAI_API_KEY` or `Z_AI_API_KEY`                                             |
| Onboarding choices  | `zai-api-key`, `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn` |
| API                 | OpenAI 兼容                                                                  |
| Default base URL    | `https://api.z.ai/api/paas/v4`                                              |
| Suggested default   | `zai/glm-5.1`                                                               |
| Default image model | `zai/glm-4.6v`                                                              |

## 开始使用

<Steps>
  <Step title="选择一种认证方式并运行 onboarding">
    选择与你的 Z.AI 套餐和区域相匹配的 onboarding 选项。通用的 `zai-api-key` 选项会根据密钥格式自动检测匹配的端点；当你想强制使用特定的 Coding Plan 或通用 API 接口时，请使用明确的区域选项。

    | 认证选项            | 最适合                                              |
    | ------------------- | --------------------------------------------------- |
    | `zai-api-key`       | 带有端点自动检测的通用 API 密钥                      |
    | `zai-coding-global` | Coding Plan 用户（全球）                            |
    | `zai-coding-cn`     | Coding Plan 用户（中国区）                          |
    | `zai-global`        | 通用 API（全球）                                    |
    | `zai-cn`            | 通用 API（中国区）                                  |

    <CodeGroup>

```bash Auto-detect
openclaw onboard --auth-choice zai-api-key
```

```bash Coding Plan (global)
openclaw onboard --auth-choice zai-coding-global
```

```bash Coding Plan (China)
openclaw onboard --auth-choice zai-coding-cn
```

```bash General API (global)
openclaw onboard --auth-choice zai-global
```

```bash General API (China)
openclaw onboard --auth-choice zai-cn
```

    </CodeGroup>

  </Step>
  <Step title="将 GLM 设置为默认模型">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## 配置示例

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>
  `zai-api-key` 允许 OpenClaw 根据密钥格式自动检测匹配的 Z.AI 端点，并自动应用正确的 base URL。若你想固定使用特定的 Coding Plan 或通用 API 接口，请使用明确的区域选项。
</Tip>

## 内置目录

内置的 `zai` 提供方预置了 13 个 GLM 模型引用。除非另有标注，所有条目都支持推理；`glm-5v-turbo` 和 `glm-4.6v` 除了文本外也接受图像输入。

| 模型引用              | 说明                                               |
| -------------------- | -------------------------------------------------- |
| `zai/glm-5.1`        | 默认模型。支持推理，仅文本，202k 上下文。           |
| `zai/glm-5`          | 支持推理，仅文本，202k 上下文。                     |
| `zai/glm-5-turbo`    | 支持推理，仅文本，202k 上下文。                     |
| `zai/glm-5v-turbo`   | 支持推理，文本 + 图像，202k 上下文。                |
| `zai/glm-4.7`        | 支持推理，仅文本，204k 上下文。                     |
| `zai/glm-4.7-flash`  | 支持推理，仅文本，200k 上下文。                     |
| `zai/glm-4.7-flashx` | 支持推理，仅文本。                                  |
| `zai/glm-4.6`        | 支持推理，仅文本。                                  |
| `zai/glm-4.6v`       | 支持推理，文本 + 图像。默认图像模型。                |
| `zai/glm-4.5`        | 支持推理，仅文本。                                  |
| `zai/glm-4.5-air`    | 支持推理，仅文本。                                  |
| `zai/glm-4.5-flash`  | 支持推理，仅文本。                                  |
| `zai/glm-4.5v`       | 支持推理，文本 + 图像。                              |

<Note>
  GLM 的版本和可用性可能会变化。运行 `openclaw models list --provider zai` 可查看你所安装版本已知的目录行，并查阅 Z.AI 的文档了解新添加或已弃用的模型。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="端点自动检测">
    当你使用 `zai-api-key` 认证选项时，OpenClaw 会检查密钥格式以确定正确的 Z.AI base URL。明确的区域选项（`zai-coding-global`、`zai-coding-cn`、`zai-global`、`zai-cn`）会覆盖自动检测，并直接固定端点。
  </Accordion>

  <Accordion title="提供方详情">
    GLM 模型由 `zai` 运行时提供方提供。关于完整的提供方配置、区域端点以及其他能力，请参见 [Z.AI 提供方页面](/providers/zai)。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Z.AI provider" href="/providers/zai" icon="server">
    完整的 Z.AI 提供方配置和地区端点。
  </Card>
  <Card title="Model providers" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障转移行为。
  </Card>
  <Card title="Thinking modes" href="/tools/thinking" icon="brain">
    适用于具备推理能力的 GLM 家族的 `/think` 等级。
  </Card>
  <Card title="Models FAQ" href="/help/faq-models" icon="circle-question">
    认证配置文件、切换模型，以及排查“no profile”错误。
  </Card>
</CardGroup>
