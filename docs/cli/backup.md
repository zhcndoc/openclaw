---
summary: "`openclaw backup` 命令行参考（创建本地备份归档）"
read_when:
  - 你想要一个用于本地 OpenClaw 状态的一级备份归档
  - 你想在重置或卸载之前预览将包含哪些路径
title: "Backup"
---

# `openclaw backup`

为 OpenClaw 状态、配置、认证配置文件、渠道/提供者凭证、会话创建本地备份归档，并可选择包含工作区。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 注意事项

- 归档包含一个 `manifest.json` 文件，记录已解析的源路径和归档布局。
- 默认输出是当前工作目录下带有时间戳的 `.tar.gz` 归档文件。
- 如果当前工作目录处于备份的源代码树内，OpenClaw 会回退到你的主目录作为默认归档位置。
- 现有的归档文件不会被覆盖。
- 排除输出路径在源状态/工作区树内，以避免自我包含。
- `openclaw backup verify <archive>` 会验证归档仅包含一个根 manifest，拒绝遍历式归档路径，并检查所有 manifest 声明的载荷是否存在于 tar 包中。
- `openclaw backup create --verify` 会在写入归档后立即执行上述验证。
- `openclaw backup create --only-config` 只备份当前活动的 JSON 配置文件。

## 备份内容

`openclaw backup create` 根据你的本地 OpenClaw 安装规划备份来源：

- OpenClaw 本地状态解析器返回的状态目录，通常为 `~/.openclaw`
- 活动的配置文件路径
- 当 `credentials/` 目录存在于状态目录之外时解析出的该目录
- 从当前配置中发现的工作区目录，除非你传递了 `--no-include-workspace`

模型认证配置文件已经是状态目录的一部分，位于 `agents/<agentId>/agent/auth-profiles.json`，因此它们通常被状态备份条目覆盖。

如果你使用 `--only-config`，OpenClaw 将跳过状态、凭证目录和工作区发现，仅归档活动的配置文件路径。

OpenClaw 在构建归档之前会规范化路径。如果配置、凭证目录或工作区已经位于状态目录内，它们不会作为单独的顶层备份源被重复包含。缺失的路径会被跳过。

归档载荷存储来自这些源树的文件内容，嵌入的 `manifest.json` 记录了解析后的绝对源路径以及每个资源所用的归档布局。

## 配置无效时的行为

`openclaw backup` 故意绕过正常的配置预检查，因此在恢复过程中依然可用。由于工作区发现依赖有效配置，当配置文件存在但无效且工作区备份仍启用时，`openclaw backup create` 会快速失败。

如果你仍想在这种情况下进行部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这将使状态、配置和外部凭证目录保持在范围内，同时完全跳过工作区发现。

如果你只需要备份配置文件本身，`--only-config` 也适用，即使配置格式错误，因为它不依赖解析配置进行工作区发现。

## 大小和性能

OpenClaw 不强制内建最大备份大小或单文件大小限制。

实际限制来自本地机器和目标文件系统：

- 临时归档写入和最终归档所需的可用空间
- 遍历大型工作区树并压缩成 `.tar.gz` 的时间
- 如果使用 `openclaw backup create --verify` 或执行 `openclaw backup verify`，需要额外时间重新扫描归档
- 目标路径下的文件系统行为。OpenClaw 优先选择无覆盖的硬链接发布步骤，硬链接不支持则回退到排他复制

大型工作区通常是归档大小的主要驱动因素。如果你想要更小或更快的备份，请使用 `--no-include-workspace`。

要获得最小的归档，请使用 `--only-config`。

## 相关内容

- [CLI reference](/cli)
