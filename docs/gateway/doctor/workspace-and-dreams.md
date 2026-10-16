---
summary: "配置写入、工作区提示、重新指向的别名和 Control UI Dreams 操作"
title: "工作空间技巧和梦想 UI 行动"
read_when:
  - "医生报告重新指定的工作区别名或工作区提示"
  - "您正在使用 Control UI Dreams 回填、重置或清除操作"
---

检查18-20关闭医生运行。 Control UI Dreams 操作也记录于此，因为它们使用医生风格的 RPC 方法，但不是 `openclaw doctor` CLI 运行的一部分。

## <a id="checks-18-20"></a> 检查 18-20

<AccordionGroup>
  <Accordion id="18-config-write-wizard-metadata" title="18. 配置写入+向导元数据">
    Doctor 会持久化任何配置更改，并标记向导元数据以记录这次 doctor 运行。
  </Accordion>
  <Accordion id="19-workspace-tips-backup-memory-system" title="19. 工作区小技巧（备份+内存系统）">
    当缺少工作区记忆系统时，doctor 会建议使用它；如果工作区还不在 git 下，则会打印备份提示。

    当`MEMORY.md`和旧版`memory.md`同时存在时，`doctor --fix`可以归档并合并旧版文件。无效的 UTF-8 在归档之前使两个文件保持不变。如果文件在归档期间变得无效，Doctor 会将规范文件保留为未写入状态并报告保留的归档。保留原始字节，将副本转换为 UTF-8，并在重试之前根据需要从存档中恢复旧文件。

    有关工作区结构和 git 备份的完整指南（推荐使用私有 GitHub 或 GitLab），请参见 [/concepts/agent-workspace](/concepts/agent-workspace)。

  </Accordion>
  <Accordion id="20-repointed-workspace-aliases" title="20. 重新指向的工作区别名">
    如果您移动工作区文件夹并更新其符号链接，OpenClaw 将拒绝使用新目标，直到您确认移动为止。传入消息会收到修复通知，而不是停留在重试中。

    运行 `openclaw doctor --fix` 并仅确认目标是否包含相同的工作区。 Doctor 协调拥有的托管网关；首先通过其所有者停止前台或外部管理的网关。对于无人值守恢复，`openclaw doctor --fix --force --non-interactive` 提供该确认；普通非交互式`--fix`则没有。普通 `openclaw doctor` 报告问题而不传输记录。保持工作区路径和配置不变，直到 Doctor 完成。

    修复会保留安装完成情况、文件验证历史记录和迁移记录，而无需更改工作区文件。它会删除过时的路径关联，因此以后清理旧位置无法删除已移动工作区的记录。启动您手动停止的任何网关，然后发送消息以检查恢复情况。

    如果原始文件夹仍然存在、目标丢失或已拥有记录、另一个配置的工作区仍使用旧位置或检查事实发生更改，Doctor 会保持记录不变。必须先解决待定或冲突的迁移历史记录，然后才能继续进行移动。遵循报告的恢复说明；不要删除工作区记录来强制合并。

    如果您打算切换到其他工作区，请恢复原始链接或直接配置预期目标。不确认旧工作区历史记录的传输。

  </Accordion>
</AccordionGroup>

## <a id="dreams-ui-backfill-and-reset"></a> Dreams UI 回填和重置

Control UI Dreams 场景包括用于接地梦想工作流程的 **Backfill**、**Reset** 和 **Clear Grounded** 操作。这些使用网关医生风格的 RPC 方法，但 **not** 是 `openclaw doctor` CLI repair/migration. 的一部分

| 操作         | 它的作用                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 回填       | 扫描活动工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行 grounded REM 日记处理，并将可逆的回填条目写入 `DREAMS.md`。 |
| 重置          | 仅移除 `DREAMS.md` 中带有标记的回填日记条目。                                                                                                  |
| 明确接地 | 仅移除历史回放中暂存的、仅 grounded 的短期条目，这些条目尚未积累实时召回或每日支持。                           |

这些都不会自行编辑 `MEMORY.md`、运行完整的医生迁移或将接地候选人放入实时短期促销商店。要将接地历史重播输入正常的深度升级通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

该阶段将持久的候选人纳入短期梦想商店，而 `DREAMS.md` 保留在评论表面。
