---
summary: "使用 OpenClaw 的 Qwen Portal provider id"
read_when:
  - 你想配置 qwen-oauth provider id
  - 你之前使用过 Qwen Portal OAuth 凭据
  - 你需要 Qwen Portal 端点或迁移指引
title: "Qwen OAuth / Portal"
---

`qwen-oauth` 是由 Qwen 插件（`@openclaw/qwen-provider`）注册的 Qwen Portal provider id。它面向 Qwen Portal 端点 `https://portal.qwen.ai/v1`，并通过一个独立的 provider id 让旧版 Qwen OAuth / portal 配置继续可访问，与标准的 `qwen` provider 相互分离。

如果你已经有可用的 Qwen Portal token，正在从旧版 Qwen OAuth 或 Qwen CLI 工作流迁移，或者需要专门测试 Qwen Portal 端点，请选择 `qwen-oauth`。对于新配置，建议使用带有 Standard ModelStudio 端点的 [Qwen](/providers/qwen)：它支持新的 API key 配置、更多端点选择、Standard 按量计费、Coding Plan 以及完整的 Qwen 插件目录。

## 设置

如果你还没有安装 Qwen 插件，请先安装：

```bash
openclaw plugins install @openclaw/qwen-provider
openclaw gateway restart
```

通过 onboarding 提供你的门户令牌：

```bash
openclaw onboard --auth-choice qwen-oauth
```

非交互式运行会从 `--qwen-oauth-token <token>` 读取令牌，或设置：

```bash
export QWEN_API_KEY="<your-qwen-portal-token>" # pragma: allowlist secret
```

Onboarding 会将令牌存储在 `qwen-oauth` 身份验证配置文件下，初始化门户
模型目录，并在未配置默认模型时将 `qwen-oauth/qwen3.5-plus` 设置为默认模型。

## 默认值

- 提供方：`qwen-oauth`
- 别名：`qwen-portal`、`qwen-cli`
- 基础 URL：`https://portal.qwen.ai/v1`
- 环境变量：`QWEN_API_KEY`
- API 风格：兼容 OpenAI
- 默认模型：`qwen-oauth/qwen3.5-plus`

## 与 Qwen 的区别

OpenClaw 有两个面向 Qwen 的 provider id：

| Provider     | Endpoint family                                          | Best for                                                                               |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `qwen`       | Qwen Cloud / Alibaba DashScope and Coding Plan endpoints | 新的 API key 配置、Standard 按量计费、Coding Plan、多模态 DashScope 功能 |
| `qwen-oauth` | Qwen Portal endpoint at `portal.qwen.ai/v1`              | 现有的 Qwen Portal token 和旧版 Qwen OAuth / CLI 配置                         |

两个 provider 都使用兼容 OpenAI 的请求结构，但它们是彼此独立的认证面。为 `qwen-oauth` 存储的 token 不应被当作 DashScope 或 ModelStudio key；新的 DashScope key 应改用标准的 `qwen` provider。

## 模型

Qwen 插件为 Qwen Portal 端点预置了这个静态目录。所有
条目都使用 65,536 个 token 的最大输出；可用性取决于当前的 Qwen
Portal 账户和 token。

| Model ref                         | 输入        | 上下文      | 备注          |
| --------------------------------- | ----------- | --------- | ------------- |
| `qwen-oauth/qwen3.5-plus`         | text, image | 1,000,000 | 默认模型      |
| `qwen-oauth/qwen3.6-plus`         | text, image | 1,000,000 |               |
| `qwen-oauth/qwen3-max-2026-01-23` | text        | 262,144   |               |
| `qwen-oauth/qwen3-coder-next`     | text        | 262,144   |               |
| `qwen-oauth/qwen3-coder-plus`     | text        | 1,000,000 |               |
| `qwen-oauth/MiniMax-M2.5`         | text        | 1,000,000 | 推理          |
| `qwen-oauth/glm-5`                | text        | 202,752   |               |
| `qwen-oauth/glm-4.7`              | text        | 202,752   |               |
| `qwen-oauth/kimi-k2.5`            | text, image | 262,144   |               |

如果你的账户改用 ModelStudio / DashScope API 密钥，请改为配置
标准的 `qwen` 提供方：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
openclaw models set qwen/qwen3-coder-plus
```

## 迁移

旧版 Qwen Portal OAuth 配置文件无法刷新；`openclaw doctor` 会将其标记出来。如果某个门户配置文件停止工作，请使用当前令牌重新运行 onboarding，或者切换到 Standard Qwen 提供程序：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

Standard global ModelStudio 使用：

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## 故障排查

- Portal OAuth 刷新失败：旧版 Qwen Portal OAuth 配置文件无法
  刷新。请使用当前令牌重新运行 onboarding。
- 端点错误：使用 portal 令牌时，请确认模型 ref 以 `qwen-oauth/` 开头。
  仅在使用 canonical Qwen provider 时才使用 `qwen/` refs。
- `QWEN_API_KEY` 混淆：两个 Qwen 页面都提到了这个环境变量，但 onboarding
  会将凭据存储在所选 provider id 下。当你在同一台机器上同时保留 `qwen` 和 `qwen-oauth` 时，优先使用 onboarding。

## 相关

- [Qwen](/providers/qwen)
- [Alibaba Model Studio](/providers/alibaba)
- [模型提供商](/concepts/model-providers)
- [所有提供商](/providers/index)
