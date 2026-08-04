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

- Patch 路径支持相对路径（相对于工作区目录）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（仅限工作区）。只有在你确实希望 `apply_patch` 在工作区目录之外写入或删除内容时，才将其设置为 `false`。
- `*** Add File:` 和非自身的 `*** Move to:` 要求目标路径不存在。若要有意替换某个路径，请在同一个补丁中先删除该路径，然后再添加或移动替换内容。
- 在 `*** Update File:` 区块中使用 `*** Move to:` 来重命名文件。
- `*** End of File` 用于在需要时标记仅插入到文件末尾的内容。
- 默认情况下对每个模型启用。设置 `tools.exec.applyPatch.enabled: false`
  可将其禁用，或使用 `tools.exec.applyPatch.allowModels` 将其限制为特定模型（接受原始 ID，如 `gpt-5.4`，或完整 ID，如 `openai/gpt-5.4`）。
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
  <Card title="差异" href="/tools/diffs" icon="code-compare">
    用于展示更改的只读差异查看器。
  </Card>
  <Card title="执行工具" href="/tools/exec" icon="terminal">
    来自代理的 Shell 命令执行。
  </Card>
  <Card title="代码执行" href="/tools/code-execution" icon="square-code">
    与 xAI 一起进行沙盒化远程 Python 分析。
  </Card>
</CardGroup>
