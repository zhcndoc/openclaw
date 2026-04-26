---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - 你需要跨多个文件进行结构化文件编辑
  - 你希望记录或调试基于补丁的编辑
title: "apply_patch 工具"
---

使用结构化补丁格式来应用文件更改。这非常适合多文件
或多块编辑，因为单次 `edit` 调用可能过于脆弱。

该工具接受一个包含一个或多个文件操作的单一 `input` 字符串：

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

- `input`（必填）：包含 `*** Begin Patch` 和 `*** End Patch` 的完整补丁内容。

## 注意事项

- Patch 路径支持相对路径（从工作区目录起）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限于工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外进行写入/删除时，才将其设置为 `false`。
- 在 `*** Update File:` 块中使用 `*** Move to:` 来重命名文件。
- `*** End of File` 在需要时标记仅针对文件末尾的插入。
- 默认适用于 OpenAI 和 OpenAI Codex 模型。设置 `tools.exec.applyPatch.enabled: false` 可禁用它。
- 可通过 `tools.exec.applyPatch.allowModels` 按模型进行可选限制。
- 配置仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## 相关

- [Diffs](/tools/diffs)
- [Exec tool](/tools/exec)
- [Code execution](/tools/code-execution)
