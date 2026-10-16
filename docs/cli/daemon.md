---
summary: "`openclaw daemon` 的 CLI 参考（网关服务管理的旧别名）"
read_when:
  - "你仍在脚本中使用 `openclaw daemon ...`"
  - "您需要服务生命周期命令（install/start/stop/restart/status）"
title: "守护进程"
---

# `openclaw daemon`

网关服务管理的旧别名。`openclaw daemon ...` 映射到与 `openclaw gateway ...` 相同的服务控制命令。当前文档和示例请优先使用 [`openclaw gateway`](/cli/gateway)。

## <a id="usage"></a> 用法

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## <a id="subcommands-and-options"></a> 子命令和选项

| 子命令  | 选项                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `status`    | `--url`, `--port`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`     |
| `install`   | `--port`, `--runtime <node\|bun>`, `--runtime-path <path>`, `--token`, `--wrapper <path>`, `--force`, `--json` |
| `uninstall` | `--json`                                                                                                       |
| `start`     | `--json`                                                                                                       |
| `stop`      | `--force`、`--json`、`--disable`（仅限 launchd：抑制 KeepAlive/RunAtLoad 直到下次启动）                 |
| `restart`   | `--force`, `--safe`, `--skip-deferral`, `--wait <duration>`, `--json`                                          |

`--json` 在每个子命令之前或之后被接受（例如，`daemon --json status` 和 `daemon status --json`）。

- `status`：显示服务安装状态 （launchd/systemd/schtasks） 并检查网关运行状况。
- `status --port <port>`：使用调用 CLI 配置进行身份验证和 TLS 选择本地网关。不能与 `--url` 结合。本机服务详细信息仅用于诊断。
- `install`：安装并启动服务。 `--force` 重新安装现有安装并可能重新启动正在运行的网关。安装前完成离线配置和运行时修复。
- Node 是主要、默认和推荐的服务运行时。 Bun 1.4.3+ 和 WAL- 复位安全 `node:sqlite` 可作为 `install --runtime bun` 的显式选择加入。
- `restart --safe`：要求正在运行的网关预检活动工作，并在工作耗尽后安排一次合并重启，时间限制为 5 分钟。当预算到期时，无论如何都会强制重启。 Plain `restart` 通常直接使用服务管理器。在 Windows 上，从网关服务启动的命令会自动使用 [ 安全重启路径](/cli/gateway#restart-the-gateway)。显式生命周期控件保留其行为。 `--force` 是立即覆盖。
- `restart --safe --skip-deferral`：仅绕过活动工作延迟门。在网关进程退出之前，关闭可能仍会等待待处理的回复耗尽。需要 `--safe`。

## <a id="notes"></a> 说明

- `status` 在可能的情况下解析配置的身份验证 SecretRefs 以进行检查身份验证。如果所需的 SecretRef 未解析，则 `status --json` 报告 `rpc.authWarning`。显式传递 `--token`/`--password`，或首先解析秘密源。一旦检查成功，未解决的身份验证警告就会被抑制。
- `status --deep` 为其他类似网关的服务添加了尽力而为的系统级扫描。扫描会打印清理提示。仍然建议每台机器一个网关。 `status --deep` 还在插件感知模式下运行配置验证。该模式会显示快速默认路径跳过的插件清单警告。
- 在 Linux 的 systemd 安装中，令牌漂移检查会同时检查 `Environment=` 和 `EnvironmentFile=` 单元来源。
- Token-drift 检查使用合并的运行时 env（首先是服务命令 env，然后是进程 env）解析 `gateway.auth.token` SecretRefs。如果令牌身份验证未有效激活（`gateway.auth.mode` 或 `password`/`none`/`trusted-proxy`，或使用能够获胜的密码取消设置），则会跳过配置令牌解析。
- `install` 验证 SecretRef 管理的 `gateway.auth.token` 是否可解析。它永远不会将解析值保留到服务环境元数据中。如果无法解析令牌，`install` 将停止。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，并且 `gateway.auth.mode` 未设置，`install` 会阻止继续，直到你显式设置该模式。
- 在macOS上，`install`以模式`0644`写入LaunchAgent plist。机密保留在生成的仅所有者环境文件 （`0600`） 中，通过仅所有者包装器 （`0700`） 加载。
- 在一台主机上运行多个网关：隔离端口、config/state 和工作区。请参见 [ 多个网关](/gateway#multiple-gateways-same-host)。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [Gateway 运行手册](/gateway)
