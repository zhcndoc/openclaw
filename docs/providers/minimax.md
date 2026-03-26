---
summary: "在 OpenClaw 中使用 MiniMax 模型"
read_when:
  - 你想在 OpenClaw 中使用 MiniMax 模型
  - 你需要 MiniMax 设置指导
title: "MiniMax"
---

# MiniMax

OpenClaw 的 MiniMax 提供程序默认使用 **MiniMax M2.7**。

## 模型列表

- `MiniMax-M2.7`：默认托管文本模型。
- `MiniMax-M2.7-highspeed`：更快的 M2.7 文本层级。

## 选择一种配置方式

### MiniMax OAuth（Coding Plan）- 推荐

**适合：** 通过 OAuth 快速设置 MiniMax 编码计划，无需 API 密钥。

启用捆绑的 OAuth 插件并进行身份验证：

```bash
openclaw plugins enable minimax  # 如果已加载，跳过此步骤。
openclaw gateway restart  # 如果网关已启动，则重启
openclaw onboard --auth-choice minimax-portal
```

系统会提示选择一个端点：

- **Global** - 国际用户（`api.minimax.io`）
- **CN** - 中国用户（`api.minimaxi.com`）

见 [MiniMax 插件说明](https://github.com/openclaw/openclaw/tree/main/extensions/minimax) 了解详情。

### MiniMax M2.7（API key）

**适合：** 使用支持 Anthropic 兼容 API 的托管 MiniMax。

通过 CLI 配置：

- 运行 `openclaw configure`
- 选择 **Model/auth**
- 选择一个 **MiniMax** 身份验证选项

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 高速版",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### 将 MiniMax M2.7 作为回退方案（示例）

**最佳适用场景：** 保持你最强的最新一代模型作为主模型，在失败时回退到 MiniMax M2.7。
下面的示例使用 Opus 作为具体主模型；请替换为你偏好的最新一代主模型。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

## 通过 `openclaw configure` 进行配置

使用交互式配置向导，无需手动编辑 JSON 即可设置 MiniMax：

1. 运行 `openclaw configure`。
2. 选择 **Model/auth**。
3. 选择一个 **MiniMax** 身份验证选项。
4. 在提示时选择你的默认模型。

## 配置选项

- `models.providers.minimax.baseUrl`：推荐使用 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 可选，支持 OpenAI 兼容负载。
- `models.providers.minimax.api`：推荐用 `anthropic-messages`；`openai-completions` 可选，支持 OpenAI 兼容负载。
- `models.providers.minimax.apiKey`：MiniMax API 密钥（`MINIMAX_API_KEY`）。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：为你允许使用的模型设置别名。
- `models.mode`：如果要在内置模型旁添加 MiniMax，保持为 `merge`。

## 注意事项

- 模型引用格式为 `minimax/<model>`。
- 默认文本模型：`MiniMax-M2.7`。
- 备用文本模型：`MiniMax-M2.7-highspeed`。
- Coding Plan 使用 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需要 coding plan key）。
- 如果你需要精确的成本跟踪，请在 `models.json` 中更新定价值。
- MiniMax Coding Plan 推荐链接（9 折）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 有关提供程序规则，请参见 [/concepts/model-providers](/concepts/model-providers)。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.7` 来切换。

## 故障排查

### "Unknown model: minimax/MiniMax-M2.7"

这通常意味着 **MiniMax 提供程序未配置**（没有 provider 条目，
并且未找到 MiniMax 身份验证配置文件/环境变量密钥）。对此检测的修复已包含在
**2026.1.12** 中。可通过以下方式修复：

- 升级到 **2026.1.12**（或从源码 `main` 运行），然后重启网关。
- 运行 `openclaw configure` 并选择一个 **MiniMax** 身份验证选项，或
- 手动添加 `models.providers.minimax` 配置块，或
- 设置 `MINIMAX_API_KEY`（或 MiniMax 身份验证配置文件），以便注入该提供程序。

确保模型 ID **区分大小写**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`

然后重新确认：

```bash
openclaw models list
```
