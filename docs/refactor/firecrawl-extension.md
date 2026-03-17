---
summary: "设计一个可选择加入的 Firecrawl 扩展，为 Firecrawl 提供搜索/抓取价值，但不将 Firecrawl 硬绑定到核心默认设置中"
read_when:
  - 设计 Firecrawl 集成工作时
  - 评估 web_search/web_fetch 插件接缝时
  - 决定 Firecrawl 应该属于核心还是作为扩展时
title: "Firecrawl 扩展设计"
---

# Firecrawl 扩展设计

## 目标

发布 Firecrawl 作为一个**可选择加入的扩展**，它添加：

- 为代理提供明确的 Firecrawl 工具，
- 可选的 Firecrawl 支持的 `web_search` 集成，
- 自托管支持，
- 比当前核心回退路径更强的安全默认设置，

但不将 Firecrawl 推入默认设置/入门流程。

## 为什么采取这种形态

最近的 Firecrawl 问题/PR 集中在三个方面：

1. **发布/模式漂移**
   - 多个版本拒绝了 `tools.web.fetch.firecrawl`，尽管文档和运行时代码都支持它。
2. **安全加固**
   - 当前 `fetchFirecrawlContent()` 仍然使用原始的 `fetch()` 向 Firecrawl 端点发送请求，而主要的 web-fetch 路径则使用了 SSRF 保护。
3. **产品压力**
   - 用户希望拥有 Firecrawl 本地的搜索/抓取流程，尤其是针对自托管/私有环境。
   - 维护者明确拒绝将 Firecrawl 深度绑定到核心默认设置、设置流程和浏览器行为中。

这一组合说明应采用扩展方式，而不是在默认核心路径中增加更多 Firecrawl 特定逻辑。

## 设计原则

- **可选择加入，供应商范围限定**：无自动启用，无设置劫持，无默认工具配置扩展。
- **扩展拥有 Firecrawl 特定配置**：优先使用插件配置，不要再次增大 `tools.web.*`。
- **开箱即用**：即使核心 `web_search` / `web_fetch` 接缝保持不变，也能工作。
- **安全优先**：端点请求使用与其它网络工具相同的受保护网络姿态。
- **自托管友好**：有配置 + 环境变量回退，显式基础 URL，无仅托管假设。

## 提议的扩展

插件 ID：`firecrawl`

### MVP 功能

注册明确的工具：

- `firecrawl_search`
- `firecrawl_scrape`

后续可选：

- `firecrawl_crawl`
- `firecrawl_map`

首个版本**不添加** Firecrawl 浏览器自动化。这是 PR #32543 中将 Firecrawl 过度拉入核心行为并引起维护担忧的部分。

## 配置结构

使用插件范围的配置：

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          apiKey: "FIRECRAWL_API_KEY",
          baseUrl: "https://api.firecrawl.dev",
          timeoutSeconds: 60,
          maxAgeMs: 172800000,
          proxy: "auto",
          storeInCache: true,
          onlyMainContent: true,
          search: {
            enabled: true,
            defaultLimit: 5,
            sources: ["web"],
            categories: [],
            scrapeResults: false,
          },
          scrape: {
            formats: ["markdown"],
            fallbackForWebFetchLikeUse: false,
          },
        },
      },
    },
  },
}
```

### 凭证解析

优先级：

1. `plugins.entries.firecrawl.config.apiKey`
2. `FIRECRAWL_API_KEY`

基础 URL 优先级：

1. `plugins.entries.firecrawl.config.baseUrl`
2. `FIRECRAWL_BASE_URL`
3. `https://api.firecrawl.dev`

### 兼容桥接

首个版本，扩展也可以**读取**现有核心配置 `tools.web.fetch.firecrawl.*` 作为回退源，这样现有用户无需立即迁移。

写入路径保持插件本地，不要继续扩展核心 Firecrawl 配置接口。

## 工具设计

### `firecrawl_search`

输入：

- `query`
- `limit`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

行为：

- 调用 Firecrawl `v2/search`
- 返回归一化的 OpenClaw 友好结果对象：
  - `title`
  - `url`
  - `snippet`
  - `source`
  - 可选的 `content`
- 将结果内容作为不受信任的外部内容包装
- 缓存键包含查询 + 相关提供者参数

为何优先显式工具：

- 现有环境无需改变 `tools.web.search.provider` 即可工作
- 避免当前模式/加载器限制
- 立即给予用户 Firecrawl 价值

### `firecrawl_scrape`

输入：

- `url`
- `formats`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

行为：

- 调用 Firecrawl `v2/scrape`
- 返回 markdown/text 及元数据：
  - `title`
  - `finalUrl`
  - `status`
  - `warning`
- 以 `web_fetch` 相同方式包装提取内容
- 在可行时共享缓存语义以符合 Web 工具预期

为何明确抓取工具：

- 避免了核心 `web_fetch` 中未解决的 `Readability -> Firecrawl -> 基本 HTML 清理` 顺序错误
- 为 JS 重度/受 Bot 保护站点给出确定的“总是使用 Firecrawl”路径

## 扩展不应做的事

- 不自动添加 `browser`、`web_search` 或 `web_fetch` 到 `tools.alsoAllow`
- 不在 `openclaw setup` 中添加默认入门步骤
- 不在核心中添加 Firecrawl 特定浏览器会话生命周期
- 扩展 MVP 不改变内置 `web_fetch` 回退语义

## 阶段计划

### 阶段 1：仅扩展，无核心模式变更

实现：

- `extensions/firecrawl/`
- 插件配置模式
- `firecrawl_search`
- `firecrawl_scrape`
- 配置解析、端点选择、缓存、错误处理和 SSRF 保护使用的测试

此阶段足以发布真正的用户价值。

### 阶段 2：可选 `web_search` 提供者集成

修正两个核心限制后支持 `tools.web.search.provider = "firecrawl"`：

1. `src/plugins/web-search-providers.ts` 必须加载配置/已安装的 web-search-provider 插件，而非硬编码捆绑列表。
2. `src/config/types.tools.ts` 和 `src/config/zod-schema.agent-runtime.ts` 必须停止以阻挡插件注册 ID 的方式硬编码提供者枚举。

推荐形态：

- 保持内置提供者文档，
- 运行时允许任何注册的插件提供者 ID，
- 通过提供者插件或通用提供者包验证提供者特定配置。

### 阶段 3：可选 `web_fetch` 提供者接缝

仅在维护者希望供应商特定的抓取后端参与 `web_fetch` 时进行。

所需核心新增：

- `registerWebFetchProvider` 或同等抓取后端接缝

无此接缝，扩展应保持 `firecrawl_scrape` 为显式工具，不试图补丁内置 `web_fetch`。

## 安全要求

扩展必须将 Firecrawl 视为**受信任的运营者配置端点**，但仍加固传输：

- Firecrawl 端点调用使用 SSRF 保护的 fetch，而非原始 `fetch()`
- 使用与其他受信任网络工具相同的端点策略，保持自托管/私网兼容
- 绝不记录 API 密钥
- 保持端点/基础 URL 解析显式且可预测
- 将 Firecrawl 返回内容视为不受信任的外部内容

这与 SSRF 加固 PR 的意图一致，但不假定 Firecrawl 是一个恶意多租户面。

## 为什么不是技能

代码库已关闭了一个 Firecrawl 技能 PR，转向 ClawHub 分发。这适合可选的用户安装提示工作流，但不能解决：

- 确定性的工具可用性，
- 提供者级配置/凭证处理，
- 自托管端点支持，
- 缓存，
- 稳定的类型化输出，
- 网络行为的安全审查。

这应作为扩展，而非提示专用技能。

## 成功标准

- 用户只需安装/启用一款扩展即可获得可靠的 Firecrawl 搜索/抓取，不需触及核心默认设置。
- 自托管 Firecrawl 支持配置/环境变量回退。
- 扩展端点请求使用受保护的网络。
- 不引入新的 Firecrawl 核心入门/默认行为。
- 核心以后可以采用插件原生的 `web_search` / `web_fetch` 接缝，无需重新设计扩展。

## 推荐实现顺序

1. 开发 `firecrawl_scrape`
2. 开发 `firecrawl_search`
3. 补充文档和示例
4. 如有需要，通用化 `web_search` 提供者加载，使扩展能支持 `web_search`
5. 然后考虑真正的 `web_fetch` 提供者接缝
