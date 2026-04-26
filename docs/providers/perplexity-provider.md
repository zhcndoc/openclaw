---
summary: "Perplexity 网页搜索提供商设置（API 密钥、搜索模式、过滤）"
title: "Perplexity"
read_when:
  - 你想将 Perplexity 配置为网页搜索提供商
  - 你需要 Perplexity API 密钥或 OpenRouter 代理设置
---

Perplexity 插件通过 Perplexity Search API 或通过 OpenRouter 的 Perplexity Sonar 提供网页搜索功能。

<Note>
本页涵盖 Perplexity **提供商**设置。关于 Perplexity **工具**（代理如何使用它），请参阅 [Perplexity 工具](/tools/perplexity-search)。
</Note>

| 属性    | 值                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| 类型        | 网页搜索提供商（非模型提供商）                             |
| 认证        | `PERPLEXITY_API_KEY`（直接）或 `OPENROUTER_API_KEY`（通过 OpenRouter） |
| 配置路径 | `plugins.entries.perplexity.config.webSearch.apiKey`                   |

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    运行交互式网页搜索配置流程：

    ```bash
    openclaw configure --section web
    ```

    或直接设置密钥：

    ```bash
    openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
    ```

  </Step>
  <Step title="开始搜索">
    配置密钥后，代理将自动使用 Perplexity 进行网页搜索。无需额外步骤。
  </Step>
</Steps>

## 搜索模式

插件根据 API 密钥前缀自动选择传输方式：

<Tabs>
  <Tab title="原生 Perplexity API (pplx-)">
    当你的密钥以 `pplx-` 开头时，OpenClaw 使用原生 Perplexity Search API。此传输方式返回结构化结果并支持域名、语言和日期过滤（见下方过滤选项）。
  </Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">
    当你的密钥以 `sk-or-` 开头时，OpenClaw 通过 OpenRouter 使用 Perplexity Sonar 模型路由。此传输方式返回带有引用的 AI 综合答案。
  </Tab>
</Tabs>

| 密钥前缀 | 传输方式                    | 功能                                         |
| ---------- | ---------------------------- | ------------------------------------------------ |
| `pplx-`    | 原生 Perplexity Search API | 结构化结果，域名/语言/日期过滤 |
| `sk-or-`   | OpenRouter (Sonar)           | 带有引用的 AI 综合答案            |

## 原生 API 过滤

<Note>
过滤选项仅在使用原生 Perplexity API（`pplx-` 密钥）时可用。OpenRouter/Sonar 搜索不支持这些参数。
</Note>

使用原生 Perplexity API 时，搜索支持以下过滤条件：

| 过滤条件         | 描述                            | 示例                             |
| -------------- | -------------------------------------- | ----------------------------------- |
| 国家        | 2 字母国家代码                  | `us`, `de`, `jp`                    |
| 语言       | ISO 639-1 语言代码                | `en`, `fr`, `zh`                    |
| 日期范围     | 近期窗口                         | `day`, `week`, `month`, `year`      |
| 域名过滤 | 白名单或黑名单（最多 20 个域名） | `example.com`                       |
| 内容预算 | 每个响应/每页的 Token 限制   | `max_tokens`, `max_tokens_per_page` |

## 高级配置

<AccordionGroup>
  <Accordion title="守护进程的环境变量">
    如果 OpenClaw Gateway 作为守护进程运行（launchd/systemd），请确保该进程可以使用 `PERPLEXITY_API_KEY`。

    <Warning>
    仅在 `~/.profile` 中设置的密钥对 launchd/systemd 守护进程不可见，除非显式导入该环境。请在 `~/.openclaw/.env` 中设置密钥或通过 `env.shellEnv` 设置，以确保网关进程可以读取它。
    </Warning>

  </Accordion>

  <Accordion title="OpenRouter 代理设置">
    如果你希望通过 OpenRouter 路由 Perplexity 搜索，请设置 `OPENROUTER_API_KEY`（前缀 `sk-or-`）而不是原生 Perplexity 密钥。OpenClaw 将检测前缀并自动切换到 Sonar 传输方式。

    <Tip>
    如果你已经拥有 OpenRouter 账户并希望跨多个提供商统一计费，则 OpenRouter 传输方式很有用。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Perplexity 搜索工具" href="/tools/perplexity-search" icon="magnifying-glass">
    代理如何调用 Perplexity 搜索并解释结果。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包括插件条目在内的完整配置参考。
  </Card>
</CardGroup>