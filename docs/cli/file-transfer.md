---
summary: "`openclaw file-transfer` 的 CLI 参考（审查和迁移常设文件传输批准）"
read_when:
  - "您已升级，旧的文件传输权限已停止生效"
  - "您需要 `openclaw file-transfer approvals migrate` 的旗面"
  - "您需要对未经审查的文件传输权限进行可编写脚本的检查"
title: "文件传输"
---

# `openclaw file-transfer`

查看文件传输插件存储在 `plugins.entries.file-transfer.config` 下的长期批准。命令组附带文件传输插件。当该插件未安装时，它不存在。

## `file-transfer approvals migrate`

检查旧的文件传输权限并将其迁移到当前的策略格式。在此审核完成之前，旧的肯定权限将保持非活动状态。拒绝规则、大小限制和符号链接设置始终适用。

```bash
openclaw file-transfer approvals migrate
openclaw file-transfer approvals migrate --dry-run
openclaw file-transfer approvals migrate --json
```

| 选项      | 作用                                                                          |
| ----------- | ------------------------------------------------------------------------------- |
| `--dry-run` | 按照提示操作并打印计划。没有写配置。                      |
| `--json`    | 将未审核的权限打印为JSON并退出。没有提示，没有配置写入。 |

两个选项均默认为关闭。

### <a id="where-it-runs"></a> 在哪里运行

在交互式终端中的网关主机上运行命令。该命令更新该主机的文件传输策略，因此当 `gateway.mode` 为 `remote` 时它拒绝运行。当 OpenClaw 配置无效时它也会拒绝。先修复配置，然后重新运行。

### <a id="what-the-interactive-run-asks"></a> 交互式运行询问什么

该命令列出每个旧权限的一个条目，显示为 `<node selector> · read|write · <path>`。每个条目选择一个结果：

- **需要准确的重新批准** 删除不明确的权限。下次使用时会提示一次并记录确切的节点、命令、请求的路径和解析的目标。
- **保留为有意通配符** 将条目保留为操作员创建的 glob。
- **删除此权限** 彻底删除该条目。

然后，该命令打印一个计划，其中包含每个结果的计数以及降级注释。它要求在写入之前进行一次确认。成功后，它会写入迁移的配置并报告相邻的配置备份路径。当无法验证该备份时，它会这样说。

### <a id="scripted-and-non-interactive-use"></a> 脚本化和非交互式使用

`--json` 报告工作，不做任何更改。在运行状况检查或升级脚本中使用它。

| 情况                     | 输出                                                                                                        | 退出代码 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | --------- |
| 没什么可评论的             | `{"status":"ok","changed":false,"message":"No legacy permissions need review."}`                              | 0         |
| 权限仍需审核 | `{"status":"needs-input","changed":false,"items":[...],"command":"openclaw file-transfer approvals migrate"}` | 2         |

如果没有 `--json`，该命令首先检查工作。仅当权限仍需要审查时，非交互式 shell 才会出现错误。然后，该命令告诉您在终端中重新运行它，而不是猜测每个权限的结果。没有任何内容可查看的非交互式运行会打印相同的无工作消息并退出 0，因此重复的升级脚本会保持安静。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [节点文件传输](/nodes/file-transfers)
- [文件传输插件参考](/plugins/reference/file-transfer)
