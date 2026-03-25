---
summary: "Use MiniMax models in OpenClaw"
read_when:
  - 你想在 OpenClaw 中使用 MiniMax 模型
  - 你需要 MiniMax 设置指导
title: "MiniMax"
---

# MiniMax

OpenClaw's MiniMax provider defaults to **MiniMax M2.7** and keeps
**MiniMax M2.5** in the catalog for compatibility.

## Model lineup

- `MiniMax-M2.7`: default hosted text model.
- `MiniMax-M2.7-highspeed`: faster M2.7 text tier.
- `MiniMax-M2.5`: previous text model, still available in the MiniMax catalog.
- `MiniMax-M2.5-highspeed`: faster M2.5 text tier.
- `MiniMax-VL-01`: vision model for text + image inputs.

## 选择一种配置方式

### MiniMax OAuth (Coding Plan) - recommended

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

### MiniMax M2.7 (API key)

**适合：** 使用支持 Anthropic 兼容 API 的托管 MiniMax。

通过 CLI 配置：

- Run `openclaw configure`
- Select **Model/auth**
- Choose a **MiniMax** auth option

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
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: {
              input: 0.3,
              output: 1.2,
              cacheRead: 0.03,
              cacheWrite: 0.12,
            },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5-highspeed",
            name: "MiniMax M2.5 高速版",
            reasoning: true,
            input: ["text"],
            cost: {
              input: 0.3,
              output: 1.2,
              cacheRead: 0.03,
              cacheWrite: 0.12,
            },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### MiniMax M2.7 as fallback (example)

**Best for:** keep your strongest latest-generation model as primary, fail over to MiniMax M2.7.
Example below uses Opus as a concrete primary; swap to your preferred latest-gen primary model.

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

### 可选：通过 LM Studio 本地运行（手动）

**适合：** 使用 LM Studio 本地推断。我们在高性能硬件（例如桌面/服务器）上配合 LM Studio 本地服务器运行 MiniMax M2.5，效果良好。

通过 `openclaw.json` 手动配置：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 通过 `openclaw configure` 配置

使用交互式配置向导，无需手动编辑 JSON 即可设置 MiniMax：

1. Run `openclaw configure`.
2. Select **Model/auth**.
3. Choose a **MiniMax** auth option.
4. Pick your default model when prompted.

## 配置选项

- `models.providers.minimax.baseUrl`：推荐使用 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 可选，支持 OpenAI 兼容负载。
- `models.providers.minimax.api`：推荐用 `anthropic-messages`；`openai-completions` 可选，支持 OpenAI 兼容负载。
- `models.providers.minimax.apiKey`：MiniMax API 密钥（`MINIMAX_API_KEY`）。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：给你允许使用的模型设置别名。
- `models.mode`：如果要在内置模型旁添加 MiniMax，保持为 `merge`。

## 注意事项

- Model refs are `minimax/<model>`.
- Default text model: `MiniMax-M2.7`.
- Alternate text models: `MiniMax-M2.7-highspeed`, `MiniMax-M2.5`, `MiniMax-M2.5-highspeed`.
- Coding Plan usage API: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requires a coding plan key).
- Update pricing values in `models.json` if you need exact cost tracking.
- Referral link for MiniMax Coding Plan (10% off): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- See [/concepts/model-providers](/concepts/model-providers) for provider rules.
- Use `openclaw models list` and `openclaw models set minimax/MiniMax-M2.7` to switch.

## 故障排查

### "Unknown model: minimax/MiniMax-M2.7"

This usually means the **MiniMax provider isn’t configured** (no provider entry
and no MiniMax auth profile/env key found). A fix for this detection is in
**2026.1.12**. Fix by:

- Upgrading to **2026.1.12** (or run from source `main`), then restarting the gateway.
- Running `openclaw configure` and selecting a **MiniMax** auth option, or
- Adding the `models.providers.minimax` block manually, or
- Setting `MINIMAX_API_KEY` (or a MiniMax auth profile) so the provider can be injected.

确保模型 ID **区分大小写**：

- `minimax/MiniMax-M2.7`
- `minimax/MiniMax-M2.7-highspeed`
- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`

然后重新确认：

```bash
openclaw models list
```
