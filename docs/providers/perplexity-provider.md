---
summary: "Perplexity 网页搜索提供方设置（API 密钥、搜索模式、过滤）"
title: "Perplexity"
read_when:
  - 你想将 Perplexity 配置为网页搜索提供方
  - 你需要 Perplexity API 密钥或 OpenRouter 代理设置
---

Perplexity 插件通过 Perplexity
Search API 或通过 OpenRouter 的 Perplexity Sonar 提供网页搜索能力。

<Note>
本页是 Perplexity **提供方** 设置。关于 Perplexity **工具**（代理如何使用它），请参见 [Perplexity 工具](/tools/perplexity-search)。
</Note>

| Property    | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| 类型        | 网页搜索提供方（不是模型提供方）                                         |
| 认证        | `PERPLEXITY_API_KEY`（直连）或 `OPENROUTER_API_KEY`（通过 OpenRouter） |
| 配置路径    | `plugins.entries.perplexity.config.webSearch.apiKey`                   |

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
    一旦配置好密钥，代理就会自动使用 Perplexity 进行网页搜索。无需其他步骤。
  </Step>
</Steps>

## 搜索模式

插件会根据 API 密钥前缀自动选择传输方式：

<Tabs>
  <Tab title="原生 Perplexity API (pplx-)">
    当你的密钥以 `pplx-` 开头时，OpenClaw 会使用原生 Perplexity Search
    API。此传输方式返回结构化结果，并支持域名、语言和日期过滤（见下方过滤选项）。
  </Tab>
  <Tab title="OpenRouter / Sonar (sk-or-)">
    当你的密钥以 `sk-or-` 开头时，OpenClaw 会通过 OpenRouter 路由，并使用
    Perplexity Sonar 模型。此传输方式返回带引用的 AI 合成答案。
  </Tab>
</Tabs>

| Key prefix | Transport                    | Features                                         |
| ---------- | ---------------------------- | ------------------------------------------------ |
| `pplx-`    | 原生 Perplexity Search API    | 结构化结果、域名/语言/日期过滤                    |
| `sk-or-`   | OpenRouter（Sonar）          | 带引用的 AI 合成答案                              |

## 原生 API 过滤

<Note>
只有在使用原生 Perplexity API
（`pplx-` 密钥）时才可使用过滤选项。OpenRouter/Sonar 搜索不支持这些参数。
</Note>

使用原生 Perplexity API 时，搜索支持以下过滤器：

| Filter         | Description                            | Example                             |
| -------------- | -------------------------------------- | ----------------------------------- |
| 国家           | 2 位国家代码                             | `us`, `de`, `jp`                    |
| 语言           | ISO 639-1 语言代码                      | `en`, `fr`, `zh`                    |
| 日期范围       | 时效窗口                                 | `day`, `week`, `month`, `year`      |
| 域名过滤       | 白名单或黑名单（最多 20 个域名）          | `example.com`                       |
| 内容预算       | 每次响应 / 每页的 token 限制             | `max_tokens`, `max_tokens_per_page` |

## 高级配置

<AccordionGroup>
  <Accordion title="守护进程的环境变量">
    如果 OpenClaw Gateway 作为守护进程运行（launchd/systemd），请确保
    `PERPLEXITY_API_KEY` 对该进程可用。

    <Warning>
    仅在交互式 shell 中导出的密钥对 launchd/systemd 守护进程不可见，除非显式导入该环境。请将
    密钥设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，以确保网关进程可以读取它。
    </Warning>

  </Accordion>

  <Accordion title="OpenRouter 代理设置">
    如果你希望通过 OpenRouter 路由 Perplexity 搜索，请改为设置一个
    `OPENROUTER_API_KEY`（前缀为 `sk-or-`），而不是原生 Perplexity 密钥。
    OpenClaw 会自动检测前缀并切换到 Sonar 传输方式。

    <Tip>
    如果你已经有 OpenRouter 账户，并希望在多个提供方之间统一计费，那么 OpenRouter 传输方式会很有用。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Perplexity 搜索工具" href="/tools/perplexity-search" icon="magnifying-glass">
    代理如何调用 Perplexity 搜索并解释结果。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包含插件条目的完整配置参考。
  </Card>
</CardGroup>