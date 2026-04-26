---
summary: "`openclaw daemon` 的命令行参考（用于网关服务管理的旧别名）"
read_when:
  - 你仍在脚本中使用 `openclaw daemon ...`
  - 你需要服务生命周期命令（install/start/stop/restart/status）
title: "守护进程"
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

- `status` 会在可能的情况下解析配置的 auth SecretRefs 以用于探测认证。
- 如果在此命令路径中所需的 auth SecretRef 未解析，当探测连接/认证失败时，`daemon status --json` 将报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析秘密源。
- 如果探测成功，未解析的 auth-ref 警告将被抑制以避免误报。
- `status --deep` 会添加尽力而为的系统级服务扫描。当发现其他类似网关的服务时，人类可读输出会打印清理提示，并警告每台机器一个网关仍然是常规建议。
- 在 Linux systemd 安装上，`status` 令牌漂移检查包括 `Environment=` 和 `EnvironmentFile=` 单元源。
- 漂移检查使用合并的运行时环境解析 `gateway.auth.token` SecretRefs（优先服务命令环境，其次进程环境回退）。
- 如果令牌认证未有效激活（显式 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或者模式未设置且密码可以胜出且没有令牌候选可以胜出），令牌漂移检查将跳过配置令牌解析。
- 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，安装将失败（故障安全）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且 `gateway.auth.mode` 未设置，安装将被阻止直到显式设置模式。
- 如果您有意在一台主机上运行多个网关，请隔离端口、配置/状态和工作空间；参见 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。

## 推荐

当前文档和示例请使用 [`openclaw gateway`](/cli/gateway)。

## 相关

- [CLI 参考](/cli)
- [网关运行手册](/gateway)
