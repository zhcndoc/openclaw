---
summary: "使用共享提供商生成音乐，包括基于工作流的插件"
read_when:
  - 通过代理生成音乐或音频
  - 配置音乐生成提供商和模型
  - 了解 music_generate 工具参数
title: "音乐生成"
---

`music_generate` 工具让代理能够通过已配置提供商（如 Google、MiniMax 以及工作流配置的 ComfyUI）所提供的共享音乐生成功能来创建音乐或音频。

对于基于共享提供商的代理会话，OpenClaw 会将音乐生成作为
后台任务启动，在任务记录中跟踪它，然后在曲目就绪时再次唤醒代理，以便代理可以将完成的音频发布回
原始频道。

<Note>
内置的共享工具仅在至少有一个音乐生成提供商可用时出现。如果在代理的工具中看不到 `music_generate`，请配置 `agents.defaults.musicGenerationModel` 或设置提供商 API 密钥。
</Note>

## 快速开始

### 基于共享提供商的生成

1. 为至少一个提供商设置 API 密钥，例如 `GEMINI_API_KEY` 或
   `MINIMAX_API_KEY`。
2. 可选地设置首选模型：

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
      },
    },
  },
}
```

3. 向代理询问：_"生成一首关于霓虹城市夜行的欢快合成器流行曲目。"_

代理会自动调用 `music_generate`。无需工具允许列表。

对于没有基于会话的代理运行的直接同步上下文，内置
工具仍然回退到内联生成，并在工具结果中返回最终的媒体路径。

示例提示词：

```text
生成一首带有柔和弦乐且无人声的电影感钢琴曲目。
```

```text
生成一段关于在日出时发射火箭的充满活力的芯片音乐循环。
```

### 工作流驱动的 Comfy 生成

捆绑的 `comfy` 插件通过
音乐生成提供商注册表插入到共享 `music_generate` 工具中。

1. 使用工作流 JSON 以及
   提示词/输出节点配置 `plugins.entries.comfy.config.music`。
2. 如果你使用 Comfy Cloud，请设置 `COMFY_API_KEY` 或 `COMFY_CLOUD_API_KEY`。
3. 向代理请求音乐，或直接调用该工具。

示例：

```text
/tool music_generate prompt="温暖的氛围感合成器循环，带柔和磁带质感"
```

## 共享捆绑提供商支持

| 提供商 | 默认模型 | 参考输入 | 支持的控制 | API 密钥 |
| -------- | ---------------------- | ---------------- | --------------------------------------------------------- | -------------------------------------- |
| ComfyUI  | `workflow`             | 最多 1 张图片    | 工作流定义的音乐或音频                           | `COMFY_API_KEY`, `COMFY_CLOUD_API_KEY` |
| Google   | `lyria-3-clip-preview` | 最多 10 张图片  | `lyrics`, `instrumental`, `format`                        | `GEMINI_API_KEY`, `GOOGLE_API_KEY`     |
| MiniMax  | `music-2.5+`           | 无             | `lyrics`, `instrumental`, `durationSeconds`, `format=mp3` | `MINIMAX_API_KEY`                      |

### 声明的能力矩阵

这是 `music_generate`、契约测试
和共享实时扫描使用的显式模式契约。

| 提供商 | `generate` | `edit` | 编辑限制 | 共享实时通道                                                         |
| -------- | ---------- | ------ | ---------- | ------------------------------------------------------------------------- |
| ComfyUI  | Yes        | Yes    | 1 张图片    | 不在共享扫描中；由 `extensions/comfy/comfy.live.test.ts` 覆盖 |
| Google   | Yes        | Yes    | 10 张图片  | `generate`, `edit`                                                        |
| MiniMax  | Yes        | No     | 无       | `generate`                                                                |

使用 `action: "list"` 在
运行时检查可用的共享提供商和模型：

```text
/tool music_generate action=list
```

使用 `action: "status"` 检查活动会话支持的音乐任务：

```text
/tool music_generate action=status
```

直接生成示例：

```text
/tool music_generate prompt="梦幻般的 lo-fi 嘻哈，带黑胶质感和轻柔雨声" instrumental=true
```

## 内置工具参数

| 参数         | 类型     | 描述                                                                                       |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| `prompt`          | string   | 音乐生成提示词（`action: "generate"` 时必填）                                       |
| `action`          | string   | `"generate"`（默认），用于当前会话任务的 `"status"`，或用于检查提供商的 `"list"` |
| `model`           | string   | 提供商/模型覆盖，例如 `google/lyria-3-pro-preview` 或 `comfy/workflow`                    |
| `lyrics`          | string   | 当提供商支持显式歌词输入时可选的歌词                                   |
| `instrumental`    | boolean  | 当提供商支持纯音乐输出时，请求纯音乐输出                                    |
| `image`           | string   | 单个参考图片路径或 URL                                                                |
| `images`          | string[] | 多张参考图片（最多 10 张）                                                              |
| `durationSeconds` | number   | 当提供商支持时长提示时，目标时长（秒）                              |
| `timeoutMs`       | number   | 可选的提供商请求超时时间（毫秒）                                                 |
| `format`          | string   | 当提供商支持时的输出格式提示（`mp3` 或 `wav`）                                 |
| `filename`        | string   | 输出文件名提示                                                                              |

并非所有提供商都支持所有参数。OpenClaw 仍然会在提交前验证硬性限制
例如输入数量。当提供商支持时长但
使用的最大值比请求值短时，OpenClaw 会自动限制
到最接近的支持时长。真正不支持的可选提示在选择
的提供商或模型无法遵循它们时会被忽略并发出警告。

工具结果报告应用的设置。当 OpenClaw 在提供商回退期间限制时长时，返回的 `durationSeconds` 反映提交的值，而 `details.normalization.durationSeconds` 显示请求到应用的映射。

## 基于共享提供商路径的异步行为

- 基于会话的代理运行：`music_generate` 创建后台任务，立即返回已启动/任务响应，并在后续代理消息中稍后发布完成的曲目。
- 重复预防：当该后台任务仍处于 `queued` 或 `running` 状态时，同一会话中后续的 `music_generate` 调用返回任务状态而不是启动另一个生成。
- 状态查询：使用 `action: "status"` 检查活动会话支持的音乐任务而不启动新的。
- 任务跟踪：使用 `openclaw tasks list` 或 `openclaw tasks show <taskId>` 检查生成的 queued、running 和 terminal 状态。
- 完成唤醒：OpenClaw 将内部完成事件注入回同一会话，以便模型可以自己编写面向用户的后续内容。
- 提示词提示：同一会话中后续的用户/手动回合会在音乐任务已在进行时获得小型运行时提示，以便模型不会盲目地再次调用 `music_generate`。
- 无会话回退：没有真实代理会话的直接/本地上下文仍然内联运行并在同一回合中返回最终音频结果。

### 任务生命周期

每个 `music_generate` 请求经过四个状态：

1. **queued** -- 任务已创建，等待提供商接受。
2. **running** -- 提供商正在处理（通常 30 秒到 3 分钟，取决于提供商和时长）。
3. **succeeded** -- 曲目就绪；代理唤醒并将其发布到对话中。
4. **failed** -- 提供商错误或超时；代理唤醒并带有错误详情。

从 CLI 检查状态：

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

重复预防：如果当前会话的音乐任务已经 `queued` 或 `running`，`music_generate` 返回现有任务状态而不是启动新的。使用 `action: "status"` 显式检查而不触发新的生成。

## 配置

### 模型选择

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "google/lyria-3-clip-preview",
        fallbacks: ["minimax/music-2.5+"],
      },
    },
  },
}
```

### 提供商选择顺序

生成音乐时，OpenClaw 按此顺序尝试提供商：

1. 来自工具调用的 `model` 参数，如果代理指定了一个
2. 来自配置的 `musicGenerationModel.primary`
3. 按顺序的 `musicGenerationModel.fallbacks`
4. 仅使用基于认证的提供商默认值的自动检测：
   - 首先是当前默认提供商
   - 剩余已注册的音乐生成提供商按提供商 ID 顺序

如果提供商失败，自动尝试下一个候选。如果全部失败，
错误包含每次尝试的详情。

如果你想要
音乐生成仅使用显式的 `model`、`primary` 和 `fallbacks`
条目，设置 `agents.defaults.mediaGenerationAutoProviderFallback: false`。

## 提供商说明

- Google 使用 Lyria 3 批量生成。当前捆绑流程支持
  提示词、可选歌词文本和可选参考图片。
- MiniMax 使用批量 `music_generation` 端点。当前捆绑流程
  支持提示词、可选歌词、纯音乐模式、时长控制和
  mp3 输出。
- ComfyUI 支持是基于工作流的，取决于配置的图加上
  用于提示词/输出字段的节点映射。

## 提供商能力模式

共享音乐生成契约现在支持显式模式声明：

- `generate` 用于仅提示词生成
- `edit` 当请求包含一个或多个参考图片时

新提供商实现应优先使用显式模式块：

```typescript
capabilities: {
  generate: {
    maxTracks: 1,
    supportsLyrics: true,
    supportsFormat: true,
  },
  edit: {
    enabled: true,
    maxTracks: 1,
    maxInputImages: 1,
    supportsFormat: true,
  },
}
```

遗留的平铺字段如 `maxInputImages`、`supportsLyrics` 和
`supportsFormat` 不足以宣传编辑支持。提供商应
显式声明 `generate` 和 `edit`，以便实时测试、契约测试和
共享 `music_generate` 工具可以确定性地验证模式支持。

## 选择正确的路径

- 当您想要模型选择、提供商故障转移和内置的异步任务/状态流程时，请使用共享提供商支持的路径。
- 当您需要自定义工作流图或不属于共享捆绑音乐功能的提供商时，请使用插件路径（例如 ComfyUI）。
- 如果您正在调试 ComfyUI 特定行为，请参阅 [ComfyUI](/providers/comfy)。如果您正在调试共享提供商行为，请从 [Google (Gemini)](/providers/google) 或 [MiniMax](/providers/minimax) 开始。

## 实时测试

选择加入共享捆绑提供商的实时覆盖范围：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts
```

仓库封装：

```bash
pnpm test:live:media music
```

此实时文件从 `~/.profile` 加载缺失的提供商环境变量，默认情况下优先
使用 live/env API 密钥而非存储的认证配置文件，并在提供商启用编辑模式时运行
`generate` 和声明的 `edit` 覆盖范围。

目前这意味着：

- `google`：`generate` 加 `edit`
- `minimax`：仅 `generate`
- `comfy`：单独的 Comfy 实时覆盖范围，不属于共享提供商扫描

选择加入捆绑的 ComfyUI 音乐路径的实时覆盖范围：

```bash
OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
```

当配置了这些部分时，Comfy 实时文件还涵盖 comfy 图像和视频工作流。

## 相关内容

- [Background Tasks](/automation/tasks) - 分离的 `music_generate` 运行的任务跟踪
- [Configuration Reference](/gateway/config-agents#agent-defaults) - `musicGenerationModel` 配置
- [ComfyUI](/providers/comfy)
- [Google (Gemini)](/providers/google)
- [MiniMax](/providers/minimax)
- [模型](/concepts/models) - 模型配置和故障转移
- [工具概览](/tools)
