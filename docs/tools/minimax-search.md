---
summary: "通过 Token 计划搜索 API 使用 MiniMax 搜索"
read_when:
  - 你想将 MiniMax 用于 web_search
  - 你需要 MiniMax Token Plan 密钥或 OAuth 令牌
  - 你想了解 MiniMax 中国区/全球搜索主机的使用指引
title: "MiniMax 搜索"
---

OpenClaw 通过 MiniMax Token 计划搜索 API 支持将 MiniMax 作为 `web_search` 提供方。它会返回结构化的搜索结果，包括标题、URL、摘要以及相关查询。

## 获取 Token Plan 凭据

<Steps>
  <Step title="创建密钥">
    从 [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key) 创建或复制一个 MiniMax Token Plan 密钥。
    OAuth 配置也可以改用 `MINIMAX_OAUTH_TOKEN`。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 还接受 `MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN` 和
`MINIMAX_API_KEY` 作为环境别名，会在
`MINIMAX_CODE_PLAN_KEY` 之后按此顺序检查。`MINIMAX_API_KEY` 应指向一个支持搜索的
Token Plan 凭据；普通的 MiniMax 模型 API 密钥可能不被
Token Plan 搜索端点接受。

## 配置

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // 如果已设置 MiniMax Token Plan 环境变量，则为可选项
            region: "global", // 或 "cn"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "minimax",
      },
    },
  },
}
```

**环境变量替代方案：** 在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、
`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`。
对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

## 区域选择

MiniMax Search 使用以下端点：

- 全球：`https://api.minimax.io/v1/coding_plan/search`
- 中国区：`https://api.minimaxi.com/v1/coding_plan/search`

如果未设置 `plugins.entries.minimax.config.webSearch.region`，OpenClaw 会按以下顺序解析区域：

1. Plugin-owned `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

这意味着中国区接入，或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`，会自动让 MiniMax Search 也使用中国区主机。

即使你通过 OAuth `minimax-portal` 路径对 MiniMax 进行了身份验证，
web search 的注册 provider id 仍然是 `minimax`；OAuth 提供方的 base URL
会作为中国区/全球主机选择的区域提示，且 `MINIMAX_OAUTH_TOKEN`
可以满足 MiniMax Search 的 bearer 凭据要求。

## 支持的参数

| Parameter | Type    | Constraints     | Description                                                                 |
| --------- | ------- | --------------- | --------------------------------------------------------------------------- |
| `query`   | string  | required        | 搜索查询字符串。                                                        |
| `count`   | integer | 1-10, default 5 | 返回结果的数量。OpenClaw 会将返回的列表截断为此大小。 |

目前不支持提供方特定的筛选器。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [MiniMax](/providers/minimax) -- 模型、图像、语音和认证设置
