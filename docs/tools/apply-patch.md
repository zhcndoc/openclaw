---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - 您需要跨多个文件进行结构化的文件编辑
  - 您想记录或调试基于补丁的编辑
title: "apply_patch 工具"
---

# apply_patch 工具

使用结构化补丁格式应用文件更改。这对于需要跨多个文件或多处修改的场景非常理想，单次 `edit` 调用难以应对的情况尤为适用。

该工具接受一个包含一个或多个文件操作的单一 `input` 字符串：

```
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
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

- 补丁路径支持相对路径（相对于工作空间目录）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（仅限工作空间）。仅当您有意让 `apply_patch` 写入或删除工作空间外的内容时，才将其设置为 `false`。
- 在 `*** Update File:` 补丁块中使用 `*** Move to:` 可重命名文件。
- 使用 `*** End of File` 标记需要的文件末尾插入。
- 实验性功能，默认禁用。通过 `tools.exec.applyPatch.enabled` 启用。
- 仅限 OpenAI（包括 OpenAI Codex）。可通过 `tools.exec.applyPatch.allowModels` 按模型进行限制。
- 配置项仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```
