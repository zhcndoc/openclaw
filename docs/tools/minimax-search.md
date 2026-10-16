---
summary: "MiniMax 通过代币计划搜索 API"
read_when:
  - "你想将 MiniMax 用于 web_search"
  - "你需要 MiniMax Token Plan 密钥或 OAuth 令牌"
  - "您想要MiniMax CN/global搜索主机指导"
title: "MiniMax 搜索"
---

OpenClaw 通过 MiniMax 代币计划搜索 API 支持 MiniMax 作为 `web_search` 提供商。它返回包含标题、URL、片段和相关查询的结构化搜索结果。

## <a id="get-a-token-plan-credential"></a> 获取 Token Plan 凭据

<Steps>
  <Step id="create-a-key" title="创建密钥">
    从 [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key) 创建或复制一个 MiniMax Token Plan 密钥。 OAuth 配置也可以改用 `MINIMAX_OAUTH_TOKEN`。
  </Step>
  <Step id="store-the-key" title="存储密钥">
    在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 还接受 `MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN` 和 `MINIMAX_API_KEY` 作为环境别名，会在 `MINIMAX_CODE_PLAN_KEY` 之后按此顺序检查。`MINIMAX_API_KEY` 应指向一个支持搜索的 Token Plan 凭据；普通的 MiniMax 模型 API 密钥可能不被 Token Plan 搜索端点接受。

## <a id="config"></a> 配置

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if a MiniMax Token Plan env var is set
            region: "global", // or "cn"
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

**环境变量替代方案：** 在 Gateway 环境中设置 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、 `MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`。 对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

## <a id="region-selection"></a> 区域选择

MiniMax Search 使用以下端点：

- 全球：`https://api.minimax.io/v1/coding_plan/search`
- CN: `https://api.minimaxi.com/v1/coding_plan/search`

OpenClaw 按以下顺序解析区域：

1. 插件拥有的 `plugins.entries.minimax.config.webSearch.region`，设置后。
2. `MINIMAX_API_HOST`，当它指向 `minimaxi.com` 主机时。
3. `models.providers.minimax.baseUrl` 或 `models.providers.minimax-portal.baseUrl`，当任一指向 `minimaxi.com` 主机时。

步骤2和3仅检测CN主机；其他任何内容都会解析为 `global`。

这意味着 CN 载入或 `MINIMAX_API_HOST=https://api.minimaxi.com/...` 也会自动将 MiniMax 搜索保留在 CN 主机上。

即使您通过 OAuth `minimax-portal` 路径验证了 MiniMax，Web 搜索仍会注册为提供商 ID `minimax`； OAuth提供者基础URL用作CN/global主机选择的区域提示，`MINIMAX_OAUTH_TOKEN`可以满足MiniMax搜索承载凭证。

## <a id="supported-parameters"></a> 支持的参数

| 参数 | 类型    | 约束条件     | 描述                                                                 |
| --------- | ------- | --------------- | --------------------------------------------------------------------------- |
| `query`   | 字符串  | 必填        | 搜索查询字符串。                                                        |
| `count`   | 整数 | 1-10，默认5 | 返回结果的数量。OpenClaw 会将返回的列表截断为此大小。 |

目前不支持提供方特定的筛选器。

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- [MiniMax](/providers/minimax) -- 模型、图像、语音和认证设置
