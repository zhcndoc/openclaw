---
summary: "openclaw 守护进程的 CLI 参考（网关服务管理的旧别名）"
read_when:
  - 你仍在脚本中使用 `openclaw daemon ...`
  - 你需要服务生命周期命令（安装/启动/停止/重启/状态）
title: "守护进程"
---

# `openclaw daemon`

网关服务管理的旧别名。`openclaw daemon ...` 映射到与 `openclaw gateway ...` 相同的服务控制命令。当前文档和示例请优先使用 [`openclaw gateway`](/cli/gateway)。

## 用法

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## 子命令和选项

| 子命令       | 选项                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `status`     | `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json` |
| `install`    | `--port`, `--runtime <node\|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`            |
| `uninstall`  | `--json`                                                                                         |
| `start`      | `--json`                                                                                         |
| `stop`       | `--json`, `--disable`（仅限 launchd：在下次启动前持久禁止 KeepAlive/RunAtLoad）                   |
| `restart`    | `--force`, `--safe`, `--skip-deferral`, `--wait <duration>`, `--json`                            |

- `status`：显示服务安装状态（launchd/systemd/schtasks）并探测 Gateway 健康状态。
- `install`：安装服务；`--force` 会重新安装/覆盖现有安装。
- `restart --safe`：要求正在运行的 Gateway 预检查当前活跃工作，并在工作清空后安排一次合并后的重启，受 `gateway.reload.deferralTimeoutMs` 限制（默认 300000ms/5 分钟；设为 `0` 表示无限期等待）。当该预算过期时，仍会强制重启。普通 `restart` 直接使用服务管理器；`--force` 是立即覆盖。
- `restart --safe --skip-deferral`：绕过活跃工作延迟门控，因此即使报告了阻塞项，Gateway 也会立即重启。需要 `--safe`。

## 注意事项

- `status` 会在可能的情况下解析已配置的认证 SecretRef，用于探针认证。如果必需的 SecretRef 未解析，`status --json` 会报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或先解析 secret 来源。当探针在其他方面已成功时，未解析认证的警告会被抑制。
- `status --deep` 会额外进行一次尽力而为的系统级扫描，以查找其他类似网关的服务（会打印清理提示；仍然建议每台机器只运行一个 Gateway），并以插件感知模式运行配置验证，显示快速默认路径会跳过的插件清单警告。
- 在 Linux 的 systemd 安装中，令牌漂移检查会同时检查 `Environment=` 和 `EnvironmentFile=` 单元来源。
- 令牌漂移检查会使用合并后的运行时环境解析 `gateway.auth.token` SecretRef（优先使用服务命令环境，其次是进程环境）。如果令牌认证并未实际启用（`gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或者未设置但密码能够生效），则会跳过配置令牌解析。
- `install` 会验证由 SecretRef 管理的 `gateway.auth.token` 是否可解析，但绝不会将解析后的值写入服务环境元数据；如果无法解析，安装会失败并关闭。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，并且 `gateway.auth.mode` 未设置，`install` 会阻止继续，直到你显式设置该模式。
- 在 macOS 上，`install` 会让 LaunchAgent plist 和生成的 env 文件/wrapper 保持仅所有者可访问（权限 `0600`/`0700`），而不是将 secret 嵌入 `EnvironmentVariables` 中。
- 在一台主机上运行多个 Gateway：请隔离端口、配置/状态和工作区。参见 [Multiple gateways](/gateway#multiple-gateways-same-host)。

## 相关

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
