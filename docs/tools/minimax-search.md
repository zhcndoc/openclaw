---
summary: "通过 Coding Plan 搜索 API 使用 MiniMax Search"
read_when:
  - 你想将 MiniMax 用于 web_search
  - 你需要一个 MiniMax Coding Plan 密钥
  - 你想了解 MiniMax 中国区/全球搜索主机的指导
title: "MiniMax 搜索"
---

OpenClaw 通过 MiniMax Coding Plan 搜索 API 支持将 MiniMax 作为 `web_search` 提供方。它会返回结构化的搜索结果，包括标题、URL、摘要以及相关查询。

## 获取 Coding Plan 密钥

<Steps>
  <Step title="创建密钥">
    从 [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key) 创建或复制一个 MiniMax Coding Plan 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 也接受 `MINIMAX_CODING_API_KEY` 作为环境变量别名。如果 `MINIMAX_API_KEY` 已经指向一个 coding-plan 令牌，它仍会作为兼容性回退被读取。

## 配置

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // 如果已设置 MINIMAX_CODE_PLAN_KEY，则为可选
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

**环境变量替代方案：** 在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`。
对于 gateway 安装，请将其放在 `~/.openclaw/.env` 中。

## 区域选择

MiniMax Search 使用以下端点：

- 全球：`https://api.minimax.io/v1/coding_plan/search`
- 中国区：`https://api.minimaxi.com/v1/coding_plan/search`

如果 `plugins.entries.minimax.config.webSearch.region` 未设置，OpenClaw 会按以下顺序解析区域：

1. `tools.web.search.minimax.region` / 归插件所有的 `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

这意味着中国区接入，或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`，会自动让 MiniMax Search 也使用中国区主机。

即使你通过 OAuth 的 `minimax-portal` 路径对 MiniMax 进行了身份验证，web search 仍会以 provider id `minimax` 注册；OAuth 提供方的 base URL 仅作为中国区/全球主机选择的区域提示。

## 支持的参数

MiniMax Search 支持：

- `query`
- `count`（OpenClaw 会将返回的结果列表裁剪到请求的数量）

目前不支持提供方特定的筛选器。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [MiniMax](/providers/minimax) -- 模型、图像、语音和认证设置
