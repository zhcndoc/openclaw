---
title: "内存"
summary: "OpenClaw 内存的工作原理（工作区文件 + 自动内存刷新）"
read_when:
  - 你想了解内存文件布局和工作流程
  - 你想调优自动预压缩内存刷新
---

# 内存

OpenClaw 的内存是**以 Markdown 格式存储于代理工作区**。这些文件是事实的源头；模型仅“记住”写入磁盘的内容。

内存搜索工具由活跃的内存插件（默认：`memory-core`）提供。可通过 `plugins.slots.memory = "none"` 禁用内存插件。

## 内存文件（Markdown）

默认工作区布局使用两层内存：

- `memory/YYYY-MM-DD.md`
  - 每日日志（追加式）。
  - 会话开始时读取当天和前一天的日志。
- `MEMORY.md`（可选）
  - 精选的长期记忆。
  - **仅在主私有会话中加载**（群组上下文绝不加载）。

这些文件存放于工作区目录下（`agents.defaults.workspace`，默认 `~/.openclaw/workspace`）。完整布局详见[代理工作区](/concepts/agent-workspace)。

## 内存工具

OpenClaw 提供两个面向代理的工具操作这些 Markdown 文件：

- `memory_search` — 对已索引片段进行语义检索。
- `memory_get` — 针对特定 Markdown 文件/行范围的精确读取。

`memory_get` 在文件不存在时现**支持优雅降级**（例如，首次写入前的当天日志）。内置管理器和 QMD 后端都会返回 `{ text: "", path }`，而不是抛出 `ENOENT` 异常，方便代理处理“尚无记录”状态，避免用 try/catch 包裹调用。

## 何时写入内存

- 决策、偏好和持久事实写入 `MEMORY.md`。
- 日常笔记和持续上下文写入 `memory/YYYY-MM-DD.md`。
- 若有人说“记住这个”，就写入磁盘（不要只存于内存中）。
- 这部分仍在发展中，帮助模型存储记忆会让它知道该怎么做。
- 想让信息持久化，**务必让机器人写入内存**。

## 自动内存刷新（预压缩提醒）

当会话接近**自动压缩**时，OpenClaw 会触发**静默、代理式的回合**，提醒模型在上下文被压实前写入持久内存。默认提示语明确说明模型“可以回复”，但通常 `NO_REPLY` 是正确答案，这样用户看不到这回合。

该行为由 `agents.defaults.compaction.memoryFlush` 控制：

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

细节：

- **软阈值**：当会话令牌估计数越过 `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- 默认**静默**：提示包含 `NO_REPLY`，因此不会输出响应。
- 包含两条提示：用户提示 + 系统提示追加提醒。
- 每个压缩周期仅触发一次刷新（状态记录于 `sessions.json`）。
- 工作区必须可写：如会话沙箱运行且 `workspaceAccess` 设为 `"ro"` 或 `"none"`，则跳过刷新。

完整压缩生命周期详见
[会话管理 + 压缩](/reference/session-management-compaction)。

## 向量内存检索

OpenClaw 可为 `MEMORY.md` 和 `memory/*.md` 构建小型向量索引，
语义查询可找到用词不同但相关的笔记。

默认配置：

- 默认启用。
- 监听内存文件变更（有防抖处理）。
- 内存检索配置于 `agents.defaults.memorySearch`（非顶层 `memorySearch`）。
- 默认使用远程向量嵌入。如未设置 `memorySearch.provider`，OpenClaw 按优先级自动选择：
  1. 若配置且文件存在 `memorySearch.local.modelPath`，使用 `local`。
  2. 如果检测到 OpenAI API 密钥，使用 `openai`。
  3. 如果检测到 Gemini API 密钥，使用 `gemini`。
  4. 如果检测到 Voyage API 密钥，使用 `voyage`。
  5. 如果检测到 Mistral API 密钥，使用 `mistral`。
  6. 否则内存检索保持禁用，直到被配置。
- 本地模式使用 node-llama-cpp，可能需要执行 `pnpm approve-builds`。
- 使用 sqlite-vec（若支持）加速 SQLite 内的向量搜索。
- 也支持设置 `memorySearch.provider = "ollama"` 用于本地/自托管 Ollama 嵌入（`/api/embeddings`），但不会自动选中。

远程嵌入**需要**相应 API 密钥。OpenClaw 会从认证配置、`models.providers.*.apiKey` 或环境变量解析密钥。Codex OAuth 只覆盖聊天/补全，不满足内存搜索嵌入要求。  
Gemini 使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`，  
Voyage 使用 `VOYAGE_API_KEY` 或 `models.providers.voyage.apiKey`，  
Mistral 使用 `MISTRAL_API_KEY` 或 `models.providers.mistral.apiKey`。  
Ollama 通常不需要真实密钥（占位符如 `OLLAMA_API_KEY=ollama-local` 即可满足本地策略需求）。

使用自定义 OpenAI 兼容端点时，需设置 `memorySearch.remote.apiKey`（及可选的 `memorySearch.remote.headers`）。

### QMD 后端（实验性）

将 `memory.backend = "qmd"` 可用 QMD 替换内置 SQLite 索引器：[QMD](https://github.com/tobi/qmd) 是一个本地优先的搜索伴生程序，融合 BM25 + 向量 + 重排序。Markdown 保持事实源头，OpenClaw 调用 QMD 进行检索。重点说明：

**先决条件**

- 默认禁用，需要显式启用 `memory.backend = "qmd"`。
- 需单独安装 QMD CLI（`bun install -g https://github.com/tobi/qmd` 或手动下载发布版本），并保证命令行能识别 `qmd`。
- QMD 需支持扩展的 SQLite 版本（macOS 可用 `brew install sqlite`）。
- QMD 完全本地运行，基于 Bun + `node-llama-cpp`，初次使用会自动从 HuggingFace 下载 GGUF 模型（不依赖 Ollama 守护进程）。
- 网关将通过设置 `XDG_CONFIG_HOME` 和 `XDG_CACHE_HOME` 在 `~/.openclaw/agents/<agentId>/qmd/` 创建 QMD 自包含运行环境。
- 支持的平台：macOS、Linux 原生，Windows 推荐通过 WSL2。

**副进程如何运行**

- 网关在 `~/.openclaw/agents/<agentId>/qmd/` 下写入包含配置、缓存及 SQLite 数据库的 QMD 运行环境。
- 利用 `qmd collection add` 创建集合，来源于 `memory.qmd.paths` 加默认的工作区内存文件，启动及定时运行 `qmd update` 和 `qmd embed`（通过配置项 `memory.qmd.update.interval`，默认 5 分钟）。
- 启动时初始化 QMD 管理器，定时器提前激活，即使没调用 `memory_search` 也能运行。
- 启动刷新默认异步后台执行，避免阻塞聊天启动；如需同步阻塞可设置 `memory.qmd.update.waitForBootSync = true`。
- 搜索通过 `memory.qmd.searchMode` 执行（默认 `qmd search --json`，也支持 `vsearch` 和 `query`）。若选中的模式不支持某些标志，OpenClaw 会尝试用 `qmd query`。QMD 出错或缺失二进制时，自动回退到内置 SQLite 管理器，保证内存工具正常。
- 当前不支持调整 QMD 嵌入批量大小，批量行为由 QMD 控制。
- **首次搜索或较慢**：QMD 可能在首次 `qmd query` 调用时下载本地 GGUF 模型（重排序器/查询扩展）。
  - OpenClaw 自动设置 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` 运行 QMD。
  - 若想提前手动下载模型（预热 OpenClaw 使用的相同索引），可以在代理的 XDG 目录下运行一次查询：

    OpenClaw 的 QMD 状态位于你的 **状态目录**（默认 `~/.openclaw`）。  
    你可以使用以下命令指向同一个索引并执行预热：

    ```bash
    # 选择 OpenClaw 使用的状态目录
    STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

    export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
    export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"

    # （可选）强制刷新索引和嵌入
    qmd update
    qmd embed

    # 预热，触发首次模型下载
    qmd query "test" -c memory-root --json >/dev/null 2>&1
    ```

**配置项（`memory.qmd.*`）**

- `command`（默认 `qmd`）：覆盖可执行文件路径。
- `searchMode`（默认 `search`）：选择支持 `memory_search` 的 QMD 命令（`search`、`vsearch`、`query`）。
- `includeDefaultMemory`（默认 `true`）：自动索引 `MEMORY.md` 和 `memory/**/*.md`。
- `paths[]`：增加额外目录/文件（支持 `path`，可选 `pattern` 和稳定的 `name` 标识）。
- `sessions`：启用会话 JSONL 索引支持（`enabled`、保留天数 `retentionDays`、导出目录 `exportDir`）。
- `update`：控制刷新周期和维护行为（`interval`，防抖 `debounceMs`，启动时执行 `onBoot`，启动同步等待 `waitForBootSync`，嵌入频率 `embedInterval`，命令超时 `commandTimeoutMs`，更新超时 `updateTimeoutMs`，嵌入超时 `embedTimeoutMs`）。
- `limits`：限制检索负载（`maxResults`、`maxSnippetChars`、`maxInjectedChars`、`timeoutMs`）。
- `scope`：与 [`session.sendPolicy`](/gateway/configuration#session) 结构相同，默认为仅 DM（黑名单全部，允许直接聊天），可放宽以支持群组/频道检索。
  - `match.keyPrefix` 匹配**归一化后的**会话键（小写，且去除前缀 `agent:<id>:`），例：`discord:channel:`。
  - `match.rawKeyPrefix` 匹配**原始会话键**（小写，包括前缀），例：`agent:main:discord:`。
  - 兼容：`match.keyPrefix: "agent:..."` 被视作原始键前缀，推荐使用 `rawKeyPrefix` 更明确。
- 搜索被 scope 拒绝时，会在日志输出带有频道和聊天类型的警告，便于调试。
- 工作区外的片段源在 `memory_search` 结果中前缀显示为 `qmd/<collection>/<relative-path>`，`memory_get` 支持此类前缀并从对应 QMD 集合根路径读取。
- `memory.qmd.sessions.enabled = true` 时，OpenClaw 会将清理后的会话对话记录（用户/助理回合）导出到专门 QMD 集合 `~/.openclaw/agents/<id>/qmd/sessions/`，使 `memory_search` 可检索近期对话而无需使用内置 SQLite 索引。
- 当 `memory.citations` 为 `auto`/`on`，`memory_search` 片段包括 `Source: <path#line>` 脚注；设置为 `"off"` 可隐藏路径元数据（代理仍可通过 `memory_get` 获得路径，但片段文本无脚注，系统提示提醒代理不引用路径）。

**示例**

```json5
memory: {
  backend: "qmd",
  citations: "auto",
  qmd: {
    includeDefaultMemory: true,
    update: { interval: "5m", debounceMs: 15000 },
    limits: { maxResults: 6, timeoutMs: 4000 },
    scope: {
      default: "deny",
      rules: [
        { action: "allow", match: { chatType: "direct" } },
        // 归一化会话键前缀（剥离 `agent:<id>:`）
        { action: "deny", match: { keyPrefix: "discord:channel:" } },
        // 原始会话键前缀（含 `agent:<id>:`）
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ]
    },
    paths: [
      { name: "docs", path: "~/notes", pattern: "**/*.md" }
    ]
  }
}
```

**引用 & 回退**

- `memory.citations` 无论后端如何都有效 (`auto`/`on`/`off`)。
- 运行 QMD 时，`status().backend = "qmd"` 帮助诊断展示使用的引擎。若 QMD 子进程退出或 JSON 解析失败，索引管理器记录警告并启用内置提供器（原有 Markdown 嵌入），直到 QMD 恢复。

### 额外内存路径

若需索引工作区默认布局外的 Markdown 文件，可添加额外路径：

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

注意：

- 路径可为绝对或相对于工作区。
- 目录会递归扫描 `.md` 文件。
- 仅索引 Markdown 文件。
- 忽略符号链接（文件或目录）。

### Gemini 嵌入（原生）

将提供者设为 `gemini`，直接使用 Gemini 嵌入 API：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

注意：

- `remote.baseUrl` 可选（默认 Gemini API 基础地址）。
- `remote.headers` 支持添加额外请求头。
- 默认模型为 `gemini-embedding-001`。

若需使用**自定义 OpenAI 兼容端点**（如 OpenRouter、vLLM 或代理），可配合 OpenAI 提供者使用 `remote` 配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_OPENAI_COMPAT_API_KEY",
        headers: { "X-Custom-Header": "value" }
      }
    }
  }
}
```

若不想配置 API 密钥，则使用 `memorySearch.provider = "local"` 或设置 `memorySearch.fallback = "none"`。

回退：

- `memorySearch.fallback` 支持 `openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` 或 `none`。
- 仅在主嵌入提供者失败时启用回退服务。

批量索引（OpenAI + Gemini + Voyage）：

- 默认禁用。设置 `agents.defaults.memorySearch.remote.batch.enabled = true` 以支持大规模索引（OpenAI、Gemini、Voyage）。
- 默认阻塞批处理完成；可调节 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 控制并发批处理数（默认 2）。
- 批处理模式适用 `memorySearch.provider` 为 `openai` 或 `gemini`，并需对应 API 密钥。
- Gemini 批处理调用异步嵌入批量端点，需启用 Gemini 批处理 API。

OpenAI 批处理快且成本低原因：

- 大型补录时，OpenAI 通常最速，因为可在单个批次提交大量请求，异步处理。
- OpenAI 针对 Batch API 有折扣，批量大规模索引成本通常低于同步请求。
- 相关文档：
  - [https://platform.openai.com/docs/api-reference/batch](https://platform.openai.com/docs/api-reference/batch)
  - [https://platform.openai.com/pricing](https://platform.openai.com/pricing)

配置示例：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

工具：

- `memory_search` — 返回带文件和行范围的片段。
- `memory_get` — 根据路径读取内存文件内容。

本地模式：

- 设置 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 可选设置 `agents.defaults.memorySearch.fallback = "none"` 禁止远程回退。

### 内存工具工作原理

- `memory_search` 对来自 `MEMORY.md` 和 `memory/**/*.md` 的 Markdown 块（目标约 400 令牌，重叠 80 令牌）执行语义搜索，返回片段文本（限制约 700 字符）、文件路径、行范围、得分、提供者/模型和是否从本地切换远程。不会返回完整文件内容。
- `memory_get` 读取指定的工作区相对路径 Markdown 内存文件，可选指定起始行和读取行数。路径必须在 `MEMORY.md` 或 `memory/` 内，其他拒绝访问。
- 仅当 `memorySearch.enabled` 解析为真时，工具才启用。

### 索引内容及时机

- 文件类型：仅 Markdown 文件（`MEMORY.md`，`memory/**/*.md`）。
- 索引存储：每代理一个 SQLite 文件，位于 `~/.openclaw/memory/<agentId>.sqlite`（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` 变量）。
- 新鲜度：监控 `MEMORY.md` 和 `memory/` 变更（防抖 1.5秒），标记索引失效。同步在会话启动、搜索时或定时异步执行。会话记录使用差异阈值触发后台同步。
- 重新索引触发：索引存储嵌入提供者/模型及端点指纹与拆分参数，若参数更改则重置索引并重新构建。

### 混合搜索（BM25 + 向量）

启用后，OpenClaw 结合：

- **向量相似度**（语义匹配，用词可不同）
- **BM25 关键词相关度**（精确匹配令牌，例如 ID、环境变量、代码符号）

若平台不支持全文搜索，自动降级为仅向量搜索。

#### 为什么混合？

向量搜索优于“意思相同”的匹配：

- “Mac Studio 网关主机” vs “运行网关的机器”
- “防抖文件更新” vs “避免每次写入都索引”

但不够擅长于精确、高信号令牌：

- ID（`a828e60`、`b3b9895a...`）
- 代码符号（`memorySearch.query.hybrid`）
- 错误字符串（“sqlite-vec unavailable”）

BM25（全文搜索）则相反，精确记号强，语义同义弱。混合搜索是一种务实方案：**利用两种信号**，既能良好支持“自然语言”查询，也支持“要找针”级别的精确查询。

#### 我们如何合并结果（当前设计）

实现思路：

1. 双侧分别检索候选集：
   - **向量**：Cosine 相似度排序取前 `maxResults * candidateMultiplier`；
   - **BM25**：FTS5 BM25 排名（越低越好）取前同样数量。

2. 将 BM25 排名转换为大概 0..1 分值：
   - `textScore = 1 / (1 + max(0, bm25Rank))`

3. 按块 ID 合并候选并计算加权得分：
   - `finalScore = vectorWeight * vectorScore + textWeight * textScore`

备注：

- 配置中 `vectorWeight` + `textWeight` 会被归一化为 1.0。
- 若嵌入不可用（或提供者返回零向量），仍执行 BM25 返回关键词匹配。
- 无法创建 FTS5 则只用向量搜索，非严重失败。

这不是“信息检索理论上的最优方案”，但简单、快速且实测提高了召回率和准确率。后续可考虑 Reciprocal Rank Fusion (RRF) 或归一化得分（min/max 或 z-score）等改进。

#### 后处理流程

合并向量和关键词得分后，两个可选后处理阶段对结果排序进行优化：

```
向量 + 关键词 → 加权合并 → 时间衰减 → 排序 → MMR → 取 Top-K 结果
```

两阶段默认关闭，可独立启用。

#### MMR 重排序（多样性）

混合搜索结果中多个结果可能包含相似或高度重叠内容。  
举例“家庭网络设置”查询，可能返回多条几乎一样的不同日期笔记，重复描述同一路由器配置。

**MMR（最大边际相关）** 重新排序结果，平衡相关性和多样性，保证顶级结果覆盖查询的不同方面，避免重复。

工作原理：

1. 对结果按原始相关排序（向量 + BM25 加权得分）。
2. MMR 迭代选择最大化 `λ × 相关性 − (1−λ) × 与已选结果最大相似度` 的结果。
3. 结果相似度采用分词后文本的 Jaccard 相似度计算。

参数：

- `lambda = 1.0` → 纯相关（不考虑多样性）
- `lambda = 0.0` → 最大多样性（忽视相关性）
- 默认 `0.7`（平衡，稍偏向相关性）

**示例 — 查询：“家用网络设置”**

内存文件示例：

```
memory/2026-02-10.md  → "配置 Omada 路由器，设置 VLAN 10 给物联网设备"
memory/2026-02-08.md  → "配置 Omada 路由器，将物联网移至 VLAN 10"
memory/2026-02-05.md  → "在 192.168.10.2 设置 AdGuard DNS"
memory/network.md     → "路由：Omada ER605，AdGuard: 192.168.10.2，VLAN 10：物联网"
```

若不启用 MMR，前三结果：

```
1. memory/2026-02-10.md  (得分：0.92)  ← 路由器 + VLAN
2. memory/2026-02-08.md  (得分：0.89)  ← 路由器 + VLAN（近似重复）
3. memory/network.md     (得分：0.85)  ← 参考文档
```

启用 MMR（λ=0.7），前三结果：

```
1. memory/2026-02-10.md  (得分：0.92)  ← 路由器 + VLAN
2. memory/network.md     (得分：0.85)  ← 参考文档（多样性）
3. memory/2026-02-05.md  (得分：0.78)  ← AdGuard DNS（多样性）
```

2 月 8 日的近似重复结果被过滤，代理获得三条不同信息。

**启用时机**：当发现 `memory_search` 返回大量冗余或近似片段，尤其每日笔记常常跨天重复类似信息时。

#### 时间衰减（新鲜度提升）

带有每日笔记的代理会随着时间积累数百条带日期的文件。  
无衰减时，即使 6 个月前写的表达优美的笔记，也可能排在昨天更新笔记之上。

**时间衰减** 通过指数乘数根据记忆条目年龄降低得分，使最近记忆自然排名更靠前，旧记忆权重衰减：

```
衰减得分 = 原得分 × e^(-λ × 天龄)
```

其中 `λ = ln(2) / halfLifeDays`。

默认 30 天半衰期时：

- 当天笔记：保留**100%**原得分
- 7 天前：约**84%**
- 30 天前：**50%**
- 90 天前：**12.5%**
- 180 天前：约**1.6%**

**常青文件不衰减：**

- `MEMORY.md`（顶层内存文件）
- `memory/` 中未带日期的文件（如 `memory/projects.md`, `memory/network.md`）
- 这些文件内容持久且应维持正常排名。

**带日期每日文件**（如 `memory/YYYY-MM-DD.md`）用文件名提取日期，其他来源（如会话日志）回退使用文件修改时间（mtime）。

**示例 — 查询：“Rod 的工作安排？”**

文件示例（今天为 2 月 10 日）：

```
memory/2025-09-15.md  → "Rod 工作时间周一至周五，早会10点，下午2点配对"  （148 天前）
memory/2026-02-10.md  → "Rod 14:15 开早会，14:45 与 Zeb 一对一"          （今天）
memory/2026-02-03.md  → "Rod 加入新团队，早会改到 14:15"                （7 天前）
```

不启用衰减：

```
1. memory/2025-09-15.md  (得分: 0.91)  ← 语义最匹配但已过时！
2. memory/2026-02-10.md  (得分: 0.82)
3. memory/2026-02-03.md  (得分: 0.80)
```

启用衰减（半衰期 30 天）：

```
1. memory/2026-02-10.md  (得分: 0.82 × 1.00 = 0.82)  ← 今天，无衰减
2. memory/2026-02-03.md  (得分: 0.80 × 0.85 = 0.68)  ← 7 天，轻微衰减
3. memory/2025-09-15.md  (得分: 0.91 × 0.03 = 0.03)  ← 148 天，几乎无效
```

过时的 9 月笔记排底，尽管原始语义匹配最好。

**启用时机**：若代理有数月的每日笔记，且老旧信息排名高于最新信息时。  
默认 30 天半衰期适合每日笔记密集场景；参考需求可调长（如 90 天）。

#### 配置示例

两者配置位于 `memorySearch.query.hybrid`：

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4,
          // 多样性：减少重复结果
          mmr: {
            enabled: true,    // 默认 false
            lambda: 0.7       // 0: 最大多样性，1: 最大相关性
          },
          // 新鲜度：提升近期记忆
          temporalDecay: {
            enabled: true,    // 默认 false
            halfLifeDays: 30  // 30 天得分减半
          }
        }
      }
    }
  }
}
```

可独立启用：

- **仅 MMR** — 当有大量相似笔记但时间不敏感时有用。
- **仅时间衰减** — 时间重要但结果本身已够多样性时有用。
- **两者同时启用** — 对拥有庞大、长期每日笔记历史的代理推荐。

### 嵌入缓存

OpenClaw 可将**文本块嵌入**缓存至 SQLite，避免重索引和频繁更新时重复嵌入未变内容（特别是会话记录）。

配置示例：

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### 会话内存检索（实验性）

可选索引**会话日志**，并通过 `memory_search` 展示。该功能处于实验阶段。

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

说明：

- 会话索引为**需显式开启**，默认关闭。
- 会话更新防抖且**异步索引**，达阈值时后台尽力同步。
- `memory_search` 不等待索引完成，结果可能稍微滞后。
- 结果仍只含片段，`memory_get` 仅限内存文件。
- 会话索引对单代理隔离，仅索引该代理对应日志。
- 会话日志存于磁盘（`~/.openclaw/agents/<agentId>/sessions/*.jsonl`），有文件系统访问权限的用户和进程均可读取，磁盘访问即为信任边界。若需更严格隔离，请在不同操作系统用户或主机上运行代理。

默认差异阈值示例：

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // 约 100 KB
          deltaMessages: 50     // JSONL 行数
        }
      }
    }
  }
}
```

### SQLite 向量加速（sqlite-vec）

当支持 sqlite-vec 扩展时，OpenClaw 将嵌入存入 SQLite 虚拟表（`vec0`），实现数据库内的向量距离查询。保持搜索快速，无需将全部嵌入加载到 JS 中。

可选配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/path/to/sqlite-vec"
        }
      }
    }
  }
}
```

说明：

- `enabled` 默认为 true；禁用时退回 JS 进程内的余弦相似度计算。
- 缺少或加载失败 sqlite-vec 扩展时，OpenClaw 输出错误日志并使用 JS 方式继续，不影响功能。
- `extensionPath` 可覆盖绑定的 sqlite-vec 路径，方便自定义或非标准安装位置。

### 本地嵌入模型自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 解析 `modelPath`，若缺失 GGUF 文件，会**自动下载**至缓存目录（或 `local.modelCacheDir`，如果设置），然后加载。下载支持重试续传。
- 本地构建要求：执行 `pnpm approve-builds`，选中 `node-llama-cpp`，再 `pnpm rebuild node-llama-cpp`。
- 回退方案：本地失败且设置了 `memorySearch.fallback = "openai"` 时，自动切换远程嵌入（默认 `openai/text-embedding-3-small`），并记录原因。

### 自定义 OpenAI 兼容端点示例

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_REMOTE_API_KEY",
        headers: {
          "X-Organization": "org-id",
          "X-Project": "project-id"
        }
      }
    }
  }
}
```

说明：

- `remote.*` 配置优先于 `models.providers.openai.*`。
- `remote.headers` 与 OpenAI 默认头合并，冲突时以 `remote` 为准。不设置时使用默认头。
