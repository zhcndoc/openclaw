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

```
*** Begin Patch
*** Add File: path/to/file.txt
+第 1 行
+第 2 行
*** Update File: src/app.ts
@@
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## 参数

- `input`（必填）：完整的补丁内容，包括 `*** Begin Patch` 和 `*** End Patch`。

## 注意事项

- 补丁路径支持相对路径（从工作区目录起）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认值为 `true`（仅限工作区内）。只有在你有意让 `apply_patch` 在工作区目录之外写入/删除时，才将其设为 `false`。
- 在 `*** Update File:` 的 hunk 中使用 `*** Move to:` 可重命名文件。
- `*** End of File` 在需要时表示仅 EOF 插入。
- 默认对 OpenAI 和 OpenAI Codex 模型可用。可设置
  `tools.exec.applyPatch.enabled: false` 来禁用它。
- 也可按模型进行限制：
  `tools.exec.applyPatch.allowModels`。
- 配置仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相关内容

- [Diffs](/tools/diffs)
- [Exec tool](/tools/exec)
- [Code execution](/tools/code-execution)
