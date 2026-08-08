---
summary: "排查节点配对、前台要求、权限和工具失败"
read_when:
  - 节点已连接，但 camera/canvas/screen/exec 工具失败
  - 你需要节点配对与审批的心智模型
title: "节点故障排查"
---

当节点在状态中可见但节点工具失败时，请使用此页面。

## SSH 注销后节点离线（Linux）

在 Linux 上，`openclaw node install` 会创建一个**用户级** systemd 服务。
当最后一个登录会话结束时，`systemd --user` 实例也会被终止，因此节点服务会在你注销的瞬间停止——即使在你连接期间它看起来仍然运行正常
（`enabled` + `running`）。

检查 lingering 状态：

```bash
loginctl show-user "$USER" -p Linger
```

如果显示 `Linger=no`，请启用它（可能需要 sudo 权限）：

```bash
sudo loginctl enable-linger "$USER"
```

然后重启节点服务，并验证注销后它仍能继续运行：

```bash
openclaw node restart
# 注销，然后从另一台机器执行：
openclaw nodes status
```

当检测到 lingering 已禁用时，`openclaw node install` 会打印一条包含此恢复命令的警告。不要让同一个节点同时使用用户级服务和系统级服务。用于防止两个管理器运行同名单元的重复作用域保护机制，适用于网关单元
（同一端口上的两个监管进程会互相发送 SIGTERM，从而陷入重启循环）；对于节点服务，安装程序不会启用此保护，因此另一个作用域中残留的单元可能会使节点处于不明确的状态。切换前请彻底移除其中一个。

## 命令阶梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后运行节点特定检查：

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

健康信号：

- 节点已连接并为 `node` 角色完成配对。
- `nodes describe` 包含你正在调用的能力。
- 执行审批显示预期的模式/允许列表。

## 前台要求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 节点上仅限前台使用。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果你看到 `NODE_BACKGROUND_UNAVAILABLE`，请将节点应用切换到前台后重试。

## 权限矩阵

| 能力                         | iOS                                     | Android                                      | macOS node app                   | 典型失败代码                                      |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | -------------------------------- | --------------------------------------------- |
| `camera.snap`, `camera.clip` | 相机（录制 clip 音频时还需要麦克风）      | 相机（录制 clip 音频时还需要麦克风）          | 相机（录制 clip 音频时还需要麦克风） | `*_PERMISSION_REQUIRED`                       |
| `screen.record`              | 屏幕录制（可选麦克风）                   | 屏幕捕获提示（可选麦克风）                   | 屏幕录制                       | `*_PERMISSION_REQUIRED`                       |
| `computer.act`               | 不适用                                    | 不适用                                       | 辅助功能 + 屏幕录制             | `COMPUTER_DISABLED`, `ACCESSIBILITY_REQUIRED` |
| `location.get`               | 使用期间或始终允许（取决于模式）          | 根据模式使用前台/后台定位                   | 定位权限                       | `LOCATION_PERMISSION_REQUIRED`                |
| `system.run`                 | 不适用（node 主机路径）                  | 不适用（node 主机路径）                     | 需要执行批准                   | `SYSTEM_RUN_DENIED`                           |

## 配对和审批

有三个相互独立的门控决定一个节点命令是否成功：

1. **设备配对**：该节点能否连接到网关？
2. **网关节点命令策略**：RPC 命令 ID 是否被 `gateway.nodes.commands.allow` / `gateway.nodes.commands.deny` 以及平台默认值允许？
3. **执行审批**：该节点能否在本地运行特定的 shell 命令？

节点配对是一个身份/信任门控，而不是按命令的审批面板。对于 `system.run`，节点特定的策略位于该节点的执行审批文件中（`openclaw approvals get --node ...`），而不是在网关配对记录中。

快速检查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

- 缺少配对：先为该节点批准设备。
- `nodes describe` 缺少某个命令：检查网关节点命令策略，以及该节点在连接时是否实际上通告了该命令。
- 配对正常但 `system.run` 失败：修复该节点上的执行审批/允许列表。

对于基于审批的 `host=node` 运行，网关还会将执行绑定到预先构建的规范化 `systemRunPlan`。如果调用方在已批准的运行转发之前，随后修改了命令、cwd 或会话元数据，网关会将其视为审批不匹配并拒绝，而不是信任被编辑过的载荷。

## 常见节点错误代码

| 代码                                   | 含义                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_BACKGROUND_UNAVAILABLE`          | 应用已进入后台；请将其切换到前台。                                                                                                                                        |
| `CAMERA_DISABLED`                      | 节点设置中摄像头开关已禁用。                                                                                                                                                |
| `*_PERMISSION_REQUIRED`                | 缺少/已拒绝操作系统权限。                                                                                                                                                           |
| `LOCATION_DISABLED`                    | 位置模式已关闭。                                                                                                                                                                   |
| `LOCATION_PERMISSION_REQUIRED`         | 请求的位置模式未获授权。                                                                                                                                                    |
| `LOCATION_BACKGROUND_UNAVAILABLE`      | 应用已进入后台，但只有“使用期间”权限。                                                                                                                             |
| `COMPUTER_DISABLED`                    | 在 macOS 应用中启用 **允许计算机控制**，然后批准配对更新。                                                                                                    |
| `ACCESSIBILITY_REQUIRED`               | 在 macOS 系统设置中，将辅助功能权限授予当前的 OpenClaw 应用包。                                                                                                        |
| `SYSTEM_RUN_DENIED: approval required` | Exec 请求需要明确批准。                                                                                                                                                   |
| `SYSTEM_RUN_DENIED: allowlist miss`    | 命令被允许列表模式阻止。在 Windows 节点主机上，像 `cmd.exe /c ...` 这样的 shell 包装器形式会在允许列表模式下被视为允许列表未命中，除非通过 ask 流程获批。 |

## 快速恢复循环

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准设备配对。
- 重新打开节点应用程序（前台）。
- 重新授予操作系统权限。
- 重新创建/调整执行审批策略。

对于计算机控制，还要确认节点本地的 Computer Control 开关已启用，其配对更新已获批准，具备视觉能力的代理暴露了 `computer` 工具，并且在授予 Screen Recording 权限后 `screen.snapshot` 能够成功。`gateway.nodes.commands.deny` 条目始终会覆盖平台默认值或 `gateway.nodes.commands.allow`。

## 相关内容

- [节点概览](/nodes)
- [摄像头节点](/nodes/camera)
- [位置命令](/nodes/location-command)
- [计算机使用](/nodes/computer-use)
- [执行审批](/tools/exec-approvals)
- [网关配对](/gateway/pairing)
- [网关故障排查](/gateway/troubleshooting)
- [通道故障排查](/channels/troubleshooting)
