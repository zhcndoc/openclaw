---
summary: "通过 Coding Plan 搜索 API 使用 MiniMax 搜索"
read_when:
  - 你想使用 MiniMax 进行 web_search
  - 你需要一个 MiniMax Coding Plan key
  - 你想了解 MiniMax CN/global 搜索主机的指导
title: "MiniMax search"
---

OpenClaw 通过 MiniMax Coding Plan 搜索 API 支持将 MiniMax 作为 `web_search` 提供方。它会返回结构化的搜索结果，包括标题、URL、摘要和相关查询。

## 获取 Coding Plan key

<Steps>
  <Step title="创建密钥">
    从 [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key) 创建或复制一个 MiniMax Coding Plan key。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 也接受 `MINIMAX_CODING_API_KEY` 作为环境别名。当 `MINIMAX_API_KEY` 已经指向一个 coding-plan token 时，它仍会被读取作为兼容性回退。

## 配置

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // 如果已设置 MINIMAX_CODE_PLAN_KEY，则为可选项
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

**环境替代方案：** 在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`。
对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

## 区域选择

MiniMax Search 使用以下端点：

- Global: `https://api.minimax.io/v1/coding_plan/search`
- CN: `https://api.minimaxi.com/v1/coding_plan/search`

如果未设置 `plugins.entries.minimax.config.webSearch.region`，OpenClaw 会按以下顺序解析区域：

1. `tools.web.search.minimax.region` / 插件拥有的 `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

这意味着 CN 接入或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`
会自动让 MiniMax Search 也使用 CN 主机。

即使你通过 OAuth `minimax-portal` 路径对 MiniMax 进行了认证，web search 仍然会注册为 provider id `minimax`；OAuth 提供方的 base URL 仅用作 CN/global 主机选择的区域提示。

## 支持的参数

MiniMax Search 支持：

- `query`
- `count`（OpenClaw 会将返回的结果列表裁剪为请求的 count）

当前不支持提供方特定的过滤器。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [MiniMax](/providers/minimax) -- 模型、图像、语音和认证设置
