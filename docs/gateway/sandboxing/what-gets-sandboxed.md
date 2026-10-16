---
summary: "哪些工具调用移入沙箱，哪些保留在网关主机上"
title: "什么被沙盒化"
read_when: "您想确切地知道哪个执行移入沙箱。"
---

该工具调用在沙箱内运行，目录发现合约以及故意保留在主机上的部分。

## <a id="what-gets-sandboxed"></a> 什么会被沙箱化

- 工具执行：`exec`、`ls`、`read`、`write`、`edit`、`apply_patch`、`process`等
- 可选的沙箱化浏览器（`agents.defaults.sandbox.browser`）。

目录发现使用 `ls` 而不授予 shell 执行权限。当另一个页面可用时，它返回整个 JSON- 引用的名称和文件名光标。使用相同的目录并返回 `after` 值继续。每个页面都适合所选模型的工具结果预算；不返回部分文件名。

自定义后端可以提供 `SandboxFsBridge.readDirectory({ filePath, cwd, signal })`，从其允许的文件系统根返回 `{ name, isDirectory }` 条目。对于较旧的插件，该方法是可选的：`ls` 在不存在时隐藏，并且 OpenClaw 不会回退到读取主机文件系统。

未被沙箱化的内容：

- Gateway 进程本身。
- 任何明确允许通过 `tools.elevated` 在普通沙箱外部运行的工具。提升的 exec 使用配置的转义路径（默认情况下为 `gateway`，或者当 exec 目标为 `node` 时为 `node`），但无法转义其创建者角色需要沙箱的会话。如果沙箱关闭，`tools.elevated` 不会改变任何内容，因为 exec 已经在主机上运行。请参阅 [E 提升型 Mode](/tools/elevated)。
