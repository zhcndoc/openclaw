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
  - 每日日志（仅追加）。
  - 在会话开始时读取今天和昨天的内容。
- `MEMORY.md`（可选）
  - 经整理的长期记忆。
  - 如果 `MEMORY.md` 和 `memory.md` 同时存在于工作区根目录，OpenClaw 会加载两者（通过真实路径去重，因此指向同一文件的符号链接不会被重复注入）。
  - **仅在主私人会话中加载**（绝不用于群组上下文）。

这些文件存放于工作区目录下（`agents.defaults.workspace`，默认 `~/.openclaw/workspace`）。完整布局详见[代理工作区](/concepts/agent-workspace)。

## 内存工具

OpenClaw 提供两个面向代理的工具来操作这些 Markdown 文件：

- `memory_search` -- 对索引片段进行语义召回。
- `memory_get` -- 针对特定 Markdown 文件/行范围的目标读取。

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

OpenClaw 可以基于 `MEMORY.md` 和 `memory/*.md` 构建小型向量索引，以便在措辞不同时，语义查询也能找到相关笔记。混合搜索（BM25 + 向量）可用于结合语义匹配与精确关键词查找。

内存搜索支持多种嵌入提供商（OpenAI、Gemini、Voyage、Mistral、Ollama 和本地 GGUF 模型），可选的 QMD 伴随后端用于高级检索，以及 MMR 多样性重排序和时间衰减等后处理功能。

有关完整配置参考——包括嵌入提供商设置、QMD 后端、混合搜索调优、多模态内存和所有配置旋钮——请参阅[内存配置参考](/reference/memory-config)。
