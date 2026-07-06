---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - 你需要跨多个文件进行结构化文件编辑
  - 你想记录或调试基于补丁的编辑
title: "apply_patch 工具"
---

使用结构化补丁格式来应用文件更改。这非常适合多文件
或多块编辑，因为单次 `edit` 调用可能不够稳健。

该工具接受一个单独的 `input` 字符串，其中包含一个或多个文件操作：

```text
*** Begin Patch
*** Add File: path/to/file.txt
+第 1 行
+第 2 行
*** Update File: src/app.ts
@@ 可选的更改上下文
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## 参数

- `input`（必填）：完整的补丁内容，包括 `*** Begin Patch` 和 `*** End Patch`。

## 注意事项

- Patch 路径支持相对路径（从工作区目录起）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（仅限工作区内）。仅当你有意让 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。
- 使用 `*** Update File:` 补丁块中的 `*** Move to:` 来重命名文件。
- `*** End of File` 表示在需要时进行仅 EOF 的插入。
- 默认对每个模型都启用。将 `tools.exec.applyPatch.enabled: false`
  可将其禁用，或通过 `tools.exec.applyPatch.allowModels` 将其限制为特定模型（接受原始 id，如 `gpt-5.4`，或完整
  id，如 `openai/gpt-5.4`）。
- 配置位于 `tools.exec.applyPatch.*` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相关内容

<CardGroup cols={2}>
  <Card title="Diffs" href="/tools/diffs" icon="code-compare">
    用于展示更改的只读差异查看器。
  </Card>
  <Card title="Exec tool" href="/tools/exec" icon="terminal">
    来自代理的 Shell 命令执行。
  </Card>
  <Card title="Code execution" href="/tools/code-execution" icon="square-code">
    与 xAI 一起进行沙盒化远程 Python 分析。
  </Card>
</CardGroup>
