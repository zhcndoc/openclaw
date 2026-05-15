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

- `status` 会在可能的情况下解析已配置的认证 SecretRefs，用于探测认证。
- 如果此命令路径中所需的认证 SecretRef 未解析，则 `daemon status --json` 在探测连接性/认证失败时会报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或先解析密钥来源。
- 如果探测成功，会抑制未解析的认证引用警告，以避免误报。
- `status --deep` 会额外执行尽力而为的系统级服务扫描。当它发现其他类似 gateway 的服务时，人工输出会打印清理提示，并警告每台机器运行一个 gateway 仍是常规建议。
- `status --deep` 还会以插件感知模式运行配置验证，并展示已配置的插件清单警告（例如缺少 channel 配置元数据），以便安装和更新的冒烟检查能够捕获它们。默认的 `status` 保持快速、只读路径，会跳过插件验证。
- 在 Linux systemd 安装中，`status` 的 token 漂移检查同时包含 `Environment=` 和 `EnvironmentFile=` 单元来源。
- 漂移检查会使用合并后的运行时环境解析 `gateway.auth.token` SecretRefs（先使用服务命令环境，再回退到进程环境）。
- 如果 token 认证并未实际启用（显式的 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或者模式未设置且密码可能生效而没有可生效的 token 候选），token 漂移检查会跳过配置 token 解析。
- 当 token 认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理时，`install` 会验证该 SecretRef 是否可解析，但不会把解析出的 token 持久化到服务环境元数据中。
- 如果 token 认证需要 token 且已配置的 token SecretRef 未解析，安装将失败并关闭。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，则会阻止安装，直到显式设置模式。
- 在 macOS 上，`install` 会保持 LaunchAgent plist 仅限所有者访问，并通过仅所有者可访问的文件和包装器加载托管的服务环境值，而不是将 API 密钥或 auth-profile 环境引用序列化到 `EnvironmentVariables` 中。
- 如果你有意在一台主机上运行多个 gateway，请隔离端口、配置/状态和工作区；参见 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。
- `restart --safe` 会请求正在运行的 Gateway 预检当前工作，并在当前工作排空后安排一次合并重启。普通 `restart` 保持现有的服务管理器行为；`--force` 仍然是立即覆盖路径。
- `restart --safe --skip-deferral` 会运行 OpenClaw 感知的安全重启，但绕过当前工作延迟门控，因此即使报告了阻塞，Gateway 也会立即发出重启。适用于任务卡住导致安全重启被挂起时的运维逃生通道；需要 `--safe`。

## 优先使用

当前文档和示例请使用 [`openclaw gateway`](/cli/gateway)。

## 相关

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
