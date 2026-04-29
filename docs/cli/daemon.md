---
summary: "openclaw daemon 的 CLI 参考（网关服务管理的旧别名）"
read_when:
  - 你仍在脚本中使用 `openclaw daemon ...`
  - 你需要服务生命周期命令（安装/启动/停止/重启/状态）
title: "Daemon"
---

# `openclaw daemon`

网关服务管理命令的旧别名。

`openclaw daemon ...` 映射到与 `openclaw gateway ...` 服务命令相同的服务控制接口。

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

- `status`：显示服务安装状态并探测 Gateway 健康状况
- `install`：安装服务（`launchd`/`systemd`/`schtasks`）
- `uninstall`：移除服务
- `start`：启动服务
- `stop`：停止服务
- `restart`：重启服务

## 常用选项

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- 生命周期（`uninstall|start|stop|restart`）：`--json`

注意：

- `status` 会在可能的情况下解析已配置的 auth SecretRef，用于探测认证。
- 如果在此命令路径中某个必需的 auth SecretRef 未解析，`daemon status --json` 会在探测连接/认证失败时报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或先解析 secret 来源。
- 如果探测成功，则会抑制未解析的 auth-ref 警告，以避免误报。
- `status --deep` 会额外进行一次尽力而为的系统级服务扫描。当发现其他类似 gateway 的服务时，人工输出会打印清理提示，并警告“一台机器一个 gateway”仍然是正常建议。
- 在 Linux 的 systemd 安装中，`status` 的 token 漂移检查会同时包含 `Environment=` 和 `EnvironmentFile=` 单元来源。
- 漂移检查会使用合并后的运行时环境解析 `gateway.auth.token` 的 SecretRef（先用服务命令环境，再用进程环境回退）。
- 如果 token 认证并未实际启用（`gateway.auth.mode` 明确为 `password`/`none`/`trusted-proxy`，或者未设置 mode 且密码可能生效并且没有 token 候选可以生效），token 漂移检查会跳过配置 token 的解析。
- 当 token 认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证该 SecretRef 可解析，但不会将解析后的 token 持久化到服务环境元数据中。
- 如果 token 认证需要 token，而配置的 token SecretRef 未解析，安装会失败并关闭。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，则安装会被阻止，直到显式设置 mode。
- 在 macOS 上，`install` 会保持 LaunchAgent plist 仅限所有者可读写，并通过仅所有者可访问的文件和包装器加载托管的服务环境值，而不是将 API 密钥或 auth-profile 环境引用序列化到 `EnvironmentVariables` 中。
- 如果你有意在一台主机上运行多个 gateway，请隔离端口、配置/状态和工作区；参见 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。

## 优先使用

当前文档和示例请使用 [`openclaw gateway`](/cli/gateway)。

## 相关

- [CLI reference](/cli)
- [Gateway runbook](/gateway)
