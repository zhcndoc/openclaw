---
summary: "排查节点配对、前台要求、权限和工具故障"
read_when:
  - 节点已连接但摄像头/画布/屏幕/执行工具失败
  - 需要节点配对与审批的思维模型
title: "节点故障排查"
---

# 节点故障排查

当状态中节点可见但节点工具失败时使用此页面。

## 命令梯队

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

- 节点已连接并配对角色为 `node`。
- `nodes describe` 中包含你调用的能力。
- 执行审批显示预期模式/允许列表。

## 前台要求

`canvas.*`、`camera.*` 和 `screen.*` 在 iOS/Android 节点上仅支持前台。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

如果看到 `NODE_BACKGROUND_UNAVAILABLE`，请将节点应用切换至前台后重试。

## 权限矩阵

| 能力                        | iOS                                     | Android                                      | macOS 节点应用              | 典型失败代码                  |
| --------------------------- | --------------------------------------- | -------------------------------------------- | --------------------------- | ---------------------------- |
| `camera.snap`，`camera.clip` | 摄像头（剪辑音频需麦克风）            | 摄像头（剪辑音频需麦克风）                   | 摄像头（剪辑音频需麦克风）   | `*_PERMISSION_REQUIRED`       |
| `screen.record`             | 屏幕录制（麦克风可选）                 | 屏幕捕获提示（麦克风可选）                   | 屏幕录制                    | `*_PERMISSION_REQUIRED`       |
| `location.get`              | 使用中或始终（取决于模式）             | 前台/后台定位基于模式                         | 位置权限                    | `LOCATION_PERMISSION_REQUIRED`|
| `system.run`                | 不适用（节点主机路径）                  | 不适用（节点主机路径）                        | 需要执行审批                | `SYSTEM_RUN_DENIED`           |

## 配对与审批

这些是不同的门槛：

1. **设备配对**：该节点能否连接到网关？
2. **执行审批**：该节点能否运行特定的 shell 命令？

快速检查：

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

如果缺少配对，先批准该节点设备。
如果配对正常但 `system.run` 失败，修复执行审批/允许列表。

## 常见节点错误代码

- `NODE_BACKGROUND_UNAVAILABLE` → 应用处于后台；请切换到前台。
- `CAMERA_DISABLED` → 节点设置中摄像头开关被禁用。
- `*_PERMISSION_REQUIRED` → 缺少或拒绝了操作系统权限。
- `LOCATION_DISABLED` → 定位模式关闭。
- `LOCATION_PERMISSION_REQUIRED` → 请求的定位模式未授予。
- `LOCATION_BACKGROUND_UNAVAILABLE` → 应用处于后台，仅有使用中权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行请求需要明确审批。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表模式阻止。
  在 Windows 节点主机上，类似 `cmd.exe /c ...` 的 shell-wrapper 形式在允许列表模式下会被判为拒绝，除非通过询问流程批准。

## 快速恢复流程

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

若仍然卡住：

- 重新批准设备配对。
- 重新打开节点应用（前台）。
- 重新授予操作系统权限。
- 重新创建/调整执行审批策略。

相关链接：

- [/nodes/index](/nodes/index)
- [/nodes/camera](/nodes/camera)
- [/nodes/location-command](/nodes/location-command)
- [/tools/exec-approvals](/tools/exec-approvals)
- [/gateway/pairing](/gateway/pairing)
