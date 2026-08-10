---
summary: "QMD 内存后端移除与迁移"
read_when:
  - 迁移使用 QMD 内存后端的安装
title: "QMD 内存后端移除"
---

# QMD 内存后端移除

可选的 QMD 内存后端已被移除。内置内存现已成为唯一的内存引擎。

运行 `openclaw doctor --fix`，以移除已废弃的 `memory.backend`、`memory.qmd.*` 和
`memory.search.qmd.*` 设置，包括代理范围的变体。你的 Markdown 内存源文件将在下一次同步时
由内置引擎建立索引。Doctor 会将已配置的 QMD 路径和额外集合保留在对应的
`memory.search.extraPaths` 设置中，包括相对于根目录的 glob 模式。QMD 索引、导出的会话 Markdown 文件、下载的模型以及集合元数据均为
派生状态，无需迁移。

请参阅[内存](/concepts/memory)，了解当前的架构和配置。
