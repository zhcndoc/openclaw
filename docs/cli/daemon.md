---
summary: "openclaw 守护进程的 CLI 参考（网关服务管理的旧别名）"
read_when:
  - 你仍在脚本中使用 `openclaw daemon ...`
  - 你需要服务生命周期命令（安装/启动/停止/重启/状态）
title: "守护进程"
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

- `status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
- lifecycle (`uninstall|start|stop`): `--json`

注意：

- `status` 会在可能的情况下解析为探测认证所配置的 auth SecretRefs。
- 如果在此命令路径中某个必需的 auth SecretRef 未解析，而探测连通性/认证失败，`daemon status --json` 会报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或先解析密钥来源。
- 如果探测成功，为避免误报，未解析的 auth-ref 警告会被抑制。
- `status --deep` 会额外进行一次尽力而为的系统级服务扫描。当它发现其他类似 gateway 的服务时，人工输出会打印清理提示，并警告单机仍然建议只运行一个 gateway。
- 在 Linux 的 systemd 安装中，`status` 的 token 漂移检查会同时包含 `Environment=` 和 `EnvironmentFile=` 单元来源。
- 漂移检查会使用合并后的运行时环境解析 `gateway.auth.token` 的 SecretRefs（优先使用服务命令环境，其次回退到进程环境）。
- 如果 token 认证并未实际生效（`gateway.auth.mode` 明确为 `password`/`none`/`trusted-proxy`，或者模式未设置且密码可生效并且没有可生效的 token 候选），token 漂移检查会跳过配置 token 解析。
- 当 token 认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证该 SecretRef 是否可解析，但不会将解析出的 token 持久化到服务环境元数据中。
- 如果 token 认证需要 token 且配置的 token SecretRef 未解析，安装会失败并关闭。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，则会阻止安装，直到显式设置 mode。
- 在 macOS 上，`install` 会保持 LaunchAgent plist 仅限所有者访问，并通过仅限所有者访问的文件和包装器加载受管服务环境值，而不是把 API keys 或 auth-profile env refs 序列化到 `EnvironmentVariables` 中。
- 如果你有意在一台主机上运行多个 gateway，请隔离端口、配置/状态和工作区；参见 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。
- `restart --safe` 会要求正在运行的 Gateway 预检查活动工作，并在活动工作清空后安排一次合并后的重启。普通 `restart` 保持现有的服务管理器行为；`--force` 仍然是立即覆盖路径。
- `restart --safe --skip-deferral` 会运行 OpenClaw 感知的安全重启，但绕过活动工作延迟门控，因此即使报告了阻塞，Gateway 也会立即发起重启。适用于任务卡住导致安全重启被阻塞时的运维逃生口；需要 `--safe`。

## 优先使用

当前文档和示例请使用 [`openclaw gateway`](/cli/gateway)。

## 相关

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
