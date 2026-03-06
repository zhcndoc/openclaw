---
summary: "`openclaw nodes` 的命令行参考（列表/状态/批准/调用，摄像头/画布/屏幕）"
read_when:
  - 您正在管理配对节点（摄像头、屏幕、画布）
  - 您需要批准请求或调用节点命令
title: "nodes"
---

# `openclaw nodes`

管理配对节点（设备）并调用节点功能。

相关链接：

- 节点概览：[Nodes](/nodes)
- 摄像头：[Camera nodes](/nodes/camera)
- 图像：[Image nodes](/nodes/images)

常用选项：

- `--url`，`--token`，`--timeout`，`--json`

## 常用命令

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` 会打印未处理/已配对的表格。已配对行包括最近一次连接时间（Last Connect）。
使用 `--connected` 仅显示当前连接的节点。使用 `--last-connected <duration>` 筛选在指定时长内连接过的节点（例如 `24h`，`7d`）。

## 调用 / 运行

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

调用标志：

- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等键。

### Exec 风格默认行为

`nodes run` 模仿模型的 exec 行为（默认值 + 审批）：

- 读取 `tools.exec.*` （加上 `agents.list[].tools.exec.*` 的覆盖）。
- 在调用 `system.run` 之前使用 exec 审批 (`exec.approval.request`)。
- 当设置了 `tools.exec.node` 后，可以省略 `--node`。
- 需要一个支持 `system.run` 的节点（macOS 伴生应用或无头节点主机）。

标志：

- `--cwd <path>`：工作目录。
- `--env <key=val>`：环境变量覆盖（可重复）。注意：节点主机忽略 `PATH` 覆盖（并且 `tools.exec.pathPrepend` 不应用于节点主机）。
- `--command-timeout <ms>`：命令超时。
- `--invoke-timeout <ms>`：节点调用超时（默认 `30000`）。
- `--needs-screen-recording`：需要屏幕录制权限。
- `--raw <command>`：运行 shell 字符串（`/bin/sh -lc` 或 `cmd.exe /c`）。
  在 Windows 节点主机的白名单模式下，`cmd.exe /c` shell 包装器的运行需要审批
  （仅有白名单条目不会自动允许包装器形式）。
- `--agent <id>`：代理范围的审批/白名单（默认为配置的代理）。
- `--ask <off|on-miss|always>`，`--security <deny|allowlist|full>`：覆写选项。
