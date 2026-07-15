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

| 能力                         | iOS                                     | Android                                      | macOS node app                   | 典型失败代码                                      |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | -------------------------------- | --------------------------------------------- |
| `camera.snap`, `camera.clip` | 相机（录制 clip 音频时还需要麦克风）      | 相机（录制 clip 音频时还需要麦克风）          | 相机（录制 clip 音频时还需要麦克风） | `*_PERMISSION_REQUIRED`                       |
| `screen.record`              | 屏幕录制（可选麦克风）                   | 屏幕捕获提示（可选麦克风）                   | 屏幕录制                       | `*_PERMISSION_REQUIRED`                       |
| `computer.act`               | 不适用                                    | 不适用                                       | 辅助功能 + 屏幕录制             | `COMPUTER_DISABLED`, `ACCESSIBILITY_REQUIRED` |
| `location.get`               | 使用期间或始终允许（取决于模式）          | 根据模式使用前台/后台定位                   | 定位权限                       | `LOCATION_PERMISSION_REQUIRED`                |
| `system.run`                 | 不适用（node 主机路径）                  | 不适用（node 主机路径）                     | 需要执行批准                   | `SYSTEM_RUN_DENIED`                           |

## Pairing and approvals

There are three independent gates that determine whether a node command succeeds:

1. **Device pairing**: Can this node connect to the gateway?
2. **Gateway node command policy**: Is the RPC command ID allowed by `gateway.nodes.allowCommands` / `denyCommands` and the platform default rules?
3. **Exec approval**: Is this node allowed to run a particular shell command locally?

Node pairing is an identity/trust gate, not a per-command approval panel. For `system.run`, the node-specific policy lives in that node’s exec approval file (`openclaw approvals get --node ...`), not in the gateway pairing record.

Quick checks:

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

- Missing pairing: approve the device for that node first.
- `nodes describe` is missing a command: check the gateway node command policy, and whether the node actually advertised that command when it connected.
- Pairing is fine but `system.run` fails: fix the exec approvals/allowlist on that node.

For approval-based `host=node` runs, the gateway also binds execution to a prebuilt normalized `systemRunPlan`. If the caller later mutates the command, cwd, or session metadata before the approved run is forwarded, the gateway treats it as an approval mismatch and rejects it rather than trusting the edited payload.

## 常见节点错误代码

| Code                                   | Meaning                                                                                                                                                                                 |
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
| `SYSTEM_RUN_DENIED: allowlist miss`    | 命令被允许列表模式阻止。在 Windows 节点主机上，像 `cmd.exe /c ...` 这样的 shell-wrapper 形式会在允许列表模式下被视为允许列表未命中，除非通过 ask 流程获批。 |

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

对于计算机控制，还要确认具备视觉能力的代理是否暴露了 `computer` 工具，`screen.snapshot` 在授予屏幕录制权限后是否成功，以及 `/phone status` 是否显示了你所期望的临时或持久网关授权。`gateway.nodes.denyCommands` 条目始终会覆盖 `allowCommands`。

## 相关内容

- [节点概览](/nodes)
- [摄像头节点](/nodes/camera)
- [位置命令](/nodes/location-command)
- [计算机使用](/nodes/computer-use)
- [执行审批](/tools/exec-approvals)
- [网关配对](/gateway/pairing)
- [网关故障排查](/gateway/troubleshooting)
- [通道故障排查](/channels/troubleshooting)
