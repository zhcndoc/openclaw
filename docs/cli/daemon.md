---
summary: "`openclaw daemon` 的命令行参考（用于网关服务管理的旧别名）"
read_when:
  - 当您仍在脚本中使用 `openclaw daemon ...`
  - 当您需要服务生命周期命令（安装/启动/停止/重启/状态）
title: "daemon"
---

# `openclaw daemon`

网关服务管理命令的旧别名。

`openclaw daemon ...` 对应于与 `openclaw gateway ...` 服务命令相同的服务控制界面。

## 用法

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## 子命令

- `status`：显示服务安装状态并检测网关健康状态
- `install`：安装服务（`launchd`/`systemd`/`schtasks`）
- `uninstall`：移除服务
- `start`：启动服务
- `stop`：停止服务
- `restart`：重启服务

## 常用选项

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- lifecycle (`uninstall|start|stop|restart`): `--json`

备注：

- `status` 尽可能解析配置的认证 SecretRefs 以用于探测认证。
- 如果此命令路径中需要的认证 SecretRef 未解析，`daemon status --json` 在探测连通性/认证失败时报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析秘密来源。
- 如果探测成功，则抑制未解析认证引用的警告以避免误报。
- 在 Linux systemd 安装中，`status` 的 token 漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元来源。
- 当 token 认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证 SecretRef 可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果 token 认证需要令牌且配置的令牌 SecretRef 未解析，安装会失败并关闭。
- 如果配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，安装会被阻止，直到显式设置模式。

## 推荐

请使用 [`openclaw gateway`](/cli/gateway) 查看最新文档和示例。
