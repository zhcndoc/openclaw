---
summary: "在 OpenClaw 中使用 MiniMax M2.5"
read_when:
  - 你想在 OpenClaw 中使用 MiniMax 模型
  - 你需要 MiniMax 设置指导
title: "MiniMax"
---

# MiniMax

MiniMax 是一家构建 **M2/M2.5** 模型家族的 AI 公司。当前聚焦编码的版本是 **MiniMax M2.5**（2025 年 12 月 23 日发布），适用于现实世界的复杂任务。

来源: [MiniMax M2.5 发布说明](https://www.minimax.io/news/minimax-m25)

## 模型概览（M2.5）

MiniMax 在 M2.5 中突出了以下改进：

- 更强的 **多语言编码**（Rust、Java、Go、C++、Kotlin、Objective-C、TS/JS）。
- 更佳的 **Web/应用开发** 和美观输出质量（包括原生移动端）。
- 改进的 **复合指令** 处理，支持办公类工作流，基于交叉式思维和集成约束执行。
- **响应更简洁**，降低令牌使用量，迭代速度更快。
- 更强的 **工具/代理框架** 兼容性与上下文管理（支持 Claude Code、Droid/Factory AI、Cline、Kilo Code、Roo Code、BlackBox）。
- 更高质量的 **对话和技术写作** 输出。

## MiniMax M2.5 与 MiniMax M2.5 高速版对比

- **速度：** `MiniMax-M2.5-highspeed` 是 MiniMax 文档中的官方高速等级。
- **费用：** MiniMax 价格中高速版的输入费用相同，输出费用更高。
- **兼容性：** OpenClaw 仍支持旧版的 `MiniMax-M2.5-Lightning` 配置，但新建设置建议使用 `MiniMax-M2.5-highspeed`。

## 选择一种配置方式

### MiniMax OAuth（编码计划）— 推荐

**适合：** 通过 OAuth 快速设置 MiniMax 编码计划，无需 API 密钥。

启用捆绑的 OAuth 插件并进行身份验证：

```bash
openclaw plugins enable minimax-portal-auth  # 如果已启用则跳过
openclaw gateway restart  # 如果网关已运行则重启
openclaw onboard --auth-choice minimax-portal
```

系统会提示选择一个端点：

- **Global** - 国际用户（`api.minimax.io`）
- **CN** - 中国用户（`api.minimaxi.com`）

详情见 [MiniMax OAuth 插件说明](https://github.com/openclaw/openclaw/tree/main/extensions/minimax-portal-auth)。

### MiniMax M2.5（API 密钥）

**适合：** 使用支持 Anthropic 兼容 API 的托管 MiniMax。

通过 CLI 配置：

- 运行 `openclaw configure`
- 选择 **Model/auth**
- 选择 **MiniMax M2.5**

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.5" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
          {
            id: "MiniMax-M2.5-highspeed",
            name: "MiniMax M2.5 高速版",
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

### MiniMax M2.5 作为故障切换（示例）

**适合：** 保持你最强的最新一代模型作为主模型，出错时切换到 MiniMax M2.5。以下示例以 Opus 为具体主模型，按需替换成你偏好的最新主模型。

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
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
            reasoning: false,
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

1. 运行 `openclaw configure`。
2. 选择 **Model/auth**。
3. 选择 **MiniMax M2.5**。
4. 按提示选择默认模型。

## 配置选项

- `models.providers.minimax.baseUrl`：推荐使用 `https://api.minimax.io/anthropic`（Anthropic 兼容）；`https://api.minimax.io/v1` 可选，支持 OpenAI 兼容负载。
- `models.providers.minimax.api`：推荐用 `anthropic-messages`；`openai-completions` 可选，支持 OpenAI 兼容负载。
- `models.providers.minimax.apiKey`：MiniMax API 密钥（`MINIMAX_API_KEY`）。
- `models.providers.minimax.models`：定义 `id`、`name`、`reasoning`、`contextWindow`、`maxTokens`、`cost`。
- `agents.defaults.models`：给你允许使用的模型设置别名。
- `models.mode`：如果要在内置模型旁添加 MiniMax，保持为 `merge`。

## 注意事项

- 模型引用格式为 `minimax/<model>`。
- 推荐的模型 ID 为：`MiniMax-M2.5` 和 `MiniMax-M2.5-highspeed`。
- 编码计划用的 API：`https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains`（需编码计划密钥）。
- 如需精确费用跟踪，请更新 `models.json` 中的价格参数。
- MiniMax 编码计划推荐链接（享 10% 折扣）：[https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- 查看 [/concepts/model-providers](/concepts/model-providers) 了解提供商规则。
- 使用 `openclaw models list` 和 `openclaw models set minimax/MiniMax-M2.5` 切换模型。

## 故障排查

### “Unknown model: minimax/MiniMax-M2.5”

通常意味着 **MiniMax 提供商未配置**（无提供商条目，且未找到 MiniMax 认证配置或环境变量）。该检测修复已包含于 **2026.1.12** 版本中（本文撰写时尚未发布）。解决方法：

- 升级到 **2026.1.12**（或从源码 `main` 分支运行），然后重启网关。
- 运行 `openclaw configure` 并选择 **MiniMax M2.5**，或
- 手动添加 `models.providers.minimax` 配置块，或
- 设置 `MINIMAX_API_KEY`（或 MiniMax 认证配置）以注入提供商。

确保模型 ID **区分大小写**：

- `minimax/MiniMax-M2.5`
- `minimax/MiniMax-M2.5-highspeed`
- `minimax/MiniMax-M2.5-Lightning`（旧版）

然后重新确认：

```bash
openclaw models list
```
