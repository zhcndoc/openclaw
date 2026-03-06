---
summary: "针对 `openclaw approvals` 的 CLI 参考（管理网关或节点主机的 exec approvals）"
read_when:
  - 你想通过 CLI 编辑 exec approvals
  - 你需要管理网关或节点主机上的允许列表
title: "approvals"
---

# `openclaw approvals`

管理**本地主机**、**网关主机**或**节点主机**的 exec approvals。
默认情况下，命令操作的是磁盘上的本地 approvals 文件。使用 `--gateway` 以操作网关，或使用 `--node` 以操作特定节点。

相关内容：

- Exec approvals：[Exec approvals](/tools/exec-approvals)
- 节点：[Nodes](/nodes)

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

## 从文件替换 approvals

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

## 允许列表辅助命令

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 说明

- `--node` 使用与 `openclaw nodes` 相同的解析器（支持 id、name、ip 或 id 前缀）。
- `--agent` 默认值为 `"*"`，适用于所有 agent。
- 节点主机必须支持 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
- approvals 文件存储于每台主机的 `~/.openclaw/exec-approvals.json` 路径下。
