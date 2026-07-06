---
summary: "排查节点配对、前台要求、权限和工具失败"
read_when:
  - 节点已连接，但 camera/canvas/screen/exec 工具失败
  - 你需要节点配对与审批的心智模型
title: "节点故障排查"
---

当节点在状态中可见但节点工具失败时，请使用此页面。

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

`canvas.*`, `camera.*`, and `screen.*` 在 iOS/Android 节点上仅限前台使用。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果你看到 `NODE_BACKGROUND_UNAVAILABLE`，请将节点应用切换到前台后重试。

## 权限矩阵

| 能力                         | iOS                                      | Android                                      | macOS 节点应用                | 典型失败代码                 |
| ---------------------------- | ---------------------------------------- | -------------------------------------------- | ----------------------------- | ---------------------------- |
| `camera.snap`, `camera.clip` | 摄像头（clip 音频还需要麦克风）           | 摄像头（clip 音频还需要麦克风）               | 摄像头（clip 音频还需要麦克风） | `*_PERMISSION_REQUIRED`      |
| `screen.record`              | 屏幕录制（可选麦克风）                    | 屏幕捕获提示（可选麦克风）                    | 屏幕录制                      | `*_PERMISSION_REQUIRED`      |
| `location.get`               | 使用期间或始终（取决于模式）              | 基于模式的前台/后台定位                       | 定位权限                      | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | 不适用（节点主机路径）                    | 不适用（节点主机路径）                        | 需要 Exec 审批                | `SYSTEM_RUN_DENIED`          |

## 配对与审批

有三个独立的关卡控制一个节点命令是否成功：

1. **设备配对**：这个节点能否连接到网关？
2. **网关节点命令策略**：RPC 命令 ID 是否被 `gateway.nodes.allowCommands` / `denyCommands` 和平台默认规则允许？
3. **Exec 审批**：这个节点是否可以在本地运行某个特定 shell 命令？

Node pairing 是身份/信任关卡，而不是按命令逐一审批的面板。对于 `system.run`，按节点的策略存放在该节点的 exec 审批文件中（`openclaw approvals get --node ...`），而不是在网关配对记录里。

快速检查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

- 缺少配对：先批准该节点设备。
- `nodes describe` 缺少某个命令：检查网关节点命令策略，以及该节点连接时是否实际声明了该命令。
- 配对正常但 `system.run` 失败：修复该节点上的 exec 审批/allowlist。

对于基于审批的 `host=node` 运行，网关还会将执行绑定到预先准备好的规范化 `systemRunPlan`。如果后续调用方在已批准的运行转发前修改了命令、cwd 或会话元数据，网关会将该运行视为审批不匹配并拒绝，而不是信任被编辑过的载荷。

## 常见节点错误代码

| Code                                   | Meaning                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_BACKGROUND_UNAVAILABLE`          | 应用处于后台；请将其切换到前台。                                                                                                                                        |
| `CAMERA_DISABLED`                      | 节点设置中已禁用相机开关。                                                                                                                                                |
| `*_PERMISSION_REQUIRED`                | 缺少/被拒绝的操作系统权限。                                                                                                                                                           |
| `LOCATION_DISABLED`                    | 位置模式已关闭。                                                                                                                                                                   |
| `LOCATION_PERMISSION_REQUIRED`         | 未授予请求的位置模式。                                                                                                                                                    |
| `LOCATION_BACKGROUND_UNAVAILABLE`      | 应用处于后台，但仅有“使用期间”权限。                                                                                                                             |
| `SYSTEM_RUN_DENIED: approval required` | 执行请求需要显式批准。                                                                                   |
| `SYSTEM_RUN_DENIED: allowlist miss`    | 命令被允许列表模式阻止。在 Windows 节点主机上，像 `cmd.exe /c ...` 这样的 shell-wrapper 形式在允许列表模式下会被视为允许列表缺失，除非通过 ask 流程获批。 |

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

## 相关内容

- [节点概览](/nodes)
- [摄像头节点](/nodes/camera)
- [定位命令](/nodes/location-command)
- [Exec 审批](/tools/exec-approvals)
- [网关配对](/gateway/pairing)
- [网关故障排查](/gateway/troubleshooting)
- [通道故障排查](/channels/troubleshooting)
