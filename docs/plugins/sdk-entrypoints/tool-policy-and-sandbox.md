---
summary: "toolPolicy 匹配器、工具组扩展和 splitSandboxBindSpec"
title: "插件 SDK 工具策略和沙箱助手"
sidebarTitle: "策略和沙箱"
read_when:
  - "您正在扩展工具组或构建工具策略匹配器"
  - "您正在解析沙箱绑定规范"
---

`openclaw/plugin-sdk/agent-harness-runtime` 向插件公开的同步策略和沙箱解析原语。 [插件入口点部分参考](/plugins/sdk-entrypoints)。

## <a id="tool-policy-vocabulary"></a> 工具策略词汇

`openclaw/plugin-sdk/agent-harness-runtime` 通过 `toolPolicy` 公开核心的同步策略原语：

- `toolPolicy.expandToolGroups(list?)` 标准化工具别名、删除空白条目、扩展核心组并按首次看到的顺序返回唯一的工具 ID。每个扩展组的成员遵循该组的目录顺序。
- `toolPolicy.createToolPolicyMatcher(policy?, writeAllowsApplyPatch = true)` 返回工具名称的匹配器。拒绝条目获胜，空允许列表不受限制，`*` 模式和别名使用核心规范化。将第二个参数设置为 `false` 以禁用运行时兼容性，其中允许 `write` 也允许 `apply_patch`。

对于一致性覆盖，否定使用 `{ deny: entries }` 构建的匹配器；这会使空的覆盖列表保持错误并避免允许侧兼容性。为一个同步操作准备匹配器；不要在等待的工作中保留授权决定。

## <a id="runtime-tool-allowlists"></a> 运行时工具白名单

`applyEmbeddedAttemptToolsAllow(tools, toolsAllow?, options?)` 使用共享别名、组和通配符匹配来过滤具体的运行时工具。未定义的允许列表保留所有工具；显式的空列表会禁用它们。独立的限制必须各自允许一种工具。

使用 `options.toolMeta(tool)` 提供其所属的 `pluginId` 进行插件组匹配。以其他名称公开工具的工具可以为 `options.toolAliases(tool)` 提供其接受的策略别名。每个限制可以匹配原始名称或别名；结果保留了原始工具对象及其执行包装器。

## <a id="sandbox-bind-parsing"></a> 沙盒绑定解析

`openclaw/plugin-sdk/agent-harness-runtime` 出口 `splitSandboxBindSpec(spec, options?)`。当不存在 host/container 分隔符时，它返回原始 `{ host, container, options }` 段或 `null`。 Windows 主机驱动器前缀始终保留。传递 `{ allowWindowsContainerPath: true }` 也可以在容器路径中保留驱动器前缀，就像策略对其现有 Windows 绑定语法所做的那样。默认保持 POSIX 容器解析不变。这个助手分割文本；它不验证或授权安装。

## <a id="sandbox-filesystem-mappings"></a> 沙盒文件系统映射

`SandboxContext`由`openclaw/plugin-sdk/agent-harness-runtime`导出，通过`fsBridge`公开其文件系统桥。该桥接受来自后端准备好的安装的可选只读 `pathMappings`： `{ hostRoot, containerRoot }` 对。包括工作区、代理工作区和受保护资源投影。容器根声明路径语法：POSIX 根保留文字反斜杠； Windows 驱动器和 UNC 根使用 Windows 包含并保留文件名大小写。最深匹配的根获胜；等根使用提供的顺序。

仅工作区的文件工具使用这些映射进行准入。桥接操作仍然强制执行物理边界、挂载可见性和只读策略。提供的空列表不允许任何路径，并且不匹配的路径永远不会回退到主机根准入。省略该属性的旧外部桥保留了 v2026.9.4. 中公开的主机根兼容性。新的实现应提供映射；删除该兼容性需要破坏 SDK 合同，从而使该属性成为必需的。

主机支持的桥还可以公开 `resolveReadPolicyPath()`，以将现有读取目标映射到面向调用者的安装命名空间。当存在时，`readFile()` 和 `stat()` 必须拒绝不再命名其最终打开目标的 `expectedPolicyPath`。这使得桥接器（而不是其调用者）负责物理别名解析。预期策略元数据来自已承认的描述符；当不使用此可选合约时，网桥可以保留其现有的路径名元数据行为。

## <a id="directory-listing-metadata"></a> 目录列表元数据

`SandboxContext.fsBridge.readDirectory` 返回目录项记录。提供商可能会在其无关注目录列表中包含 `isFile`、`size` 和 `mtimeMs`。文件浏览器使用此元数据，无需为每个子项提供额外的统计请求；省略任何这些字段的提供程序使用基于统计的路径。永远不会从 `isDirectory` 推断出未知的文件类型。 `isFile: false` 和 `isDirectory: false` 标识浏览器不应将其视为常规文件的条目（例如符号链接）。列出元数据永远不会授予读取条目的权限。文件读取继续强制执行提供程序的路径策略、字节限制和活动工作区绑定。

提供文件类型的配对节点避免了每个条目的统计请求。对于较旧的节点，浏览器会跳过统计数据明确拒绝符号链接或不受支持的文件类型的条目。权限、传输和工作空间生命周期错误仍然会导致请求失败。读取期间的结构化 `FILE_TOO_LARGE` 拒绝被报告为预览限制，包括 stat 之后文件增长的情况。

会话文件请求在每次工作区操作之前和返回响应之前保留其现有的实时读取授权。撤销将停止后续工作区操作；它无法撤回已分派的操作。
