---
summary: "使用 apply_patch 工具应用多文件补丁"
read_when:
  - "你需要跨多个文件进行结构化文件编辑"
  - "你想记录或调试基于补丁的编辑"
title: "apply_patch 工具"
---

使用结构化补丁格式来应用文件更改。这非常适合多文件或多块编辑，因为单次 `edit` 调用可能不够稳健。

该工具接受一个单独的 `input` 字符串，其中包含一个或多个文件操作：

```text
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
*** Update File: src/app.ts
@@ optional change context
-old line
+new line
*** Update File: src/old-name.ts
*** Move to: src/new-name.ts
@@
 context line
-old line
+new line
*** Update File: src/tail.ts
@@
+appended last line
*** End of File
*** Delete File: obsolete.txt
*** End Patch
```

`*** Move to:` 在其 `*** Update File:` 报头之后直接上线。 `*** End of File` 跟随它终止的块行，标记该块运行到文件末尾。

## <a id="parameters"></a> 参数

- `input`（必填）：完整的补丁内容，包括 `*** Begin Patch` 和 `*** End Patch`。

## <a id="notes"></a> 说明

- Patch 路径支持相对路径（相对于工作区目录）和绝对路径。
- 将 `./~/file` 用于 `~` 目录中的文件； `~/file` 保留其主目录含义。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含工作区）。仅当您有意希望工作区目录之外的 `apply_patch` 为 write/delete 时，才将其设置为 `false`。
- 该设置与 `tools.exec.mode` 无关。设置 `tools.exec.mode: "full"` 不会提升 `apply_patch` 工作区边界。
- `tools.fs.workspaceOnly` 独立包含 `apply_patch`，因此清除一个设置可以使另一个设置保持有效。
- 显式会话权限模式会覆盖这两个配置设置：`full` 删除其遏制，`guarded` 和 `workspace` 包含 `apply_patch`，而 `read-only` 省略该工具。
- 所需的工作空间根目录和沙箱限制仍然适用于 `full` 模式。将补丁路径保留在所需的根目录内；更改配置设置或会话模式都无法解除它。
- 当主机工作区边界拒绝补丁时，操作员日志会命名配置、会话策略、工作线程默认值或所需的根负责人。 OpenClaw 和 Codex harness均提供此建议；模型可见的拒绝保持不变。沙盒桥拒绝保留了自己的解释。
- 内存刷新运行仅公开 `read` 和仅附加 `write`，因此即使在 `full` 模式下，`apply_patch` 也不可用。
- 运行其整个代理在工作线程上执行（`worker-turn`） 忽略这两个配置设置。在无权限模式下，它们包含`apply_patch`只要有空就可以；明确的`full`模式会禁用该工具的遏制。仅用于远程命令的工作人员（`remote-exec`） 遵循本地运行代理的文件工具策略。
- `*** Add File:` 和非自身的 `*** Move to:` 要求目标路径不存在。若要有意替换某个路径，请在同一个补丁中先删除该路径，然后再添加或移动替换内容。
- 对于工作区包含的主机路径，更新可以遵循工作区内的目录别名。添加并移动到新文件拒绝别名父级；删除最终符号链接会删除链接本身。通过别名移动到同一文件会就地应用更新。
- 在 `*** Update File:` 块中使用 `*** Move to:` 来重命名文件。
- `*** End of File` 标记 EOF-only 在需要时插入。
- 每个模型默认启用。设置 `tools.exec.applyPatch.enabled: false` 以禁用它，或使用 `tools.exec.applyPatch.allowModels` 将其限制为特定模型（接受 `gpt-5.4` 等原始 id 或 `openai/gpt-5.4` 等完整 id）。
- 该工具的启用和模型设置位于 `tools.exec.applyPatch.*` 下。

## <a id="example"></a> 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="差异" href="/tools/diffs" icon="code-compare">
    用于展示更改的只读差异查看器。
  </Card>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    来自代理的 Shell 命令执行。
  </Card>
  <Card title="代码执行" href="/tools/code-execution" icon="square-code">
    使用 xAI 进行沙盒远程 Python 分析。
  </Card>
</CardGroup>
