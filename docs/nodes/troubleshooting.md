---
summary: "排查节点配对、前台要求、权限和工具失败"
read_when:
  - "Node 已连接，但 camera/screen/exec 工具失败"
  - "你需要节点配对与审批的心智模型"
title: "Node 故障排除"
---

当节点在状态中可见但节点工具失败时，请使用此页面。

## <a id="node-goes-offline-after-ssh-logout-(linux)"></a><a id="node-goes-offline-after-ssh-logout-linux"></a> Node SSH 注销后下线（Linux）

在 Linux 上，`openclaw node install` 会创建一个**用户级** systemd 服务。 当最后一个登录会话结束时，`systemd --user` 实例也会被终止，因此节点服务会在你注销的瞬间停止——即使在你连接期间它看起来仍然运行正常 （`enabled` + `running`）。

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
# log out, then from another machine:
openclaw nodes status
```

当检测到 lingering 已禁用时，`openclaw node install` 会打印一条包含此恢复命令的警告。不要让同一个节点同时使用用户级服务和系统级服务。用于防止两个管理器运行同名单元的重复作用域保护机制，适用于网关单元 （同一端口上的两个监管进程会互相发送 SIGTERM，从而陷入重启循环）；对于节点服务，安装程序不会启用此保护，因此另一个作用域中残留的单元可能会使节点处于不明确的状态。切换前请彻底移除其中一个。

## <a id="command-ladder"></a> 命令阶梯

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后运行节点特定检查：

```bash
openclaw nodes pending
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

健康信号：

- Node 已连接并配对为角色 `node`。
- `nodes describe` 包含你正在调用的能力。
- Exec 批准显示预期的 mode/allowlist.

如果启动准备禁用您启用的容器会话托管，请检查节点主机的本地 stderr 中是否有 `node host worker hosting disabled: ...`，并遵循报告的引擎或上下文恢复指南。 macOS 应用程序将工作线程 stderr 转发到子系统 `ai.openclaw` 类别 `node-host-worker` 下的记录器；请参阅 [macOS 日志记录](/platforms/mac/logging) 了解捕获选项。排除原因后，重新启动节点主机。明确禁用托管不会产生此类诊断。

节点主机重新启动后，会话容量将保持占用状态，直到验证工作进程清理为止。在Linux和macOS上，被释放的直接worker即使其leader已经退出，也会通过其原始进程组恢复。新的工人保留了一个清理锚，在退出之前记录后代的完成情况；恢复也等待其进程组消失。如果锚在没有该记录的情况下死亡，则节点记录 `lost its cleanup anchor without recorded lineage completion` 并保留该时隙。检查剩余的工作进程后代和节点主机日志；单独重新启动无法确定清理已完成。其他空闲插槽仍然可用。在降级具有活动工作线程的节点之前，请参阅 [ 数据库兼容性合同](/reference/database-schemas/versioning)。

如果 Windows 节点主机在确认工作进程清理之前退出，则其未完成的声明和槽在重新启动时保持保留状态。丢失或重复使用工人的 PID 并不能证明其后代停止了。原主机确认清理仍正常释放容量；支持的主机上的容器隔离工作人员使用其容器引擎的删除确认。

## <a id="node-runtime-version-differs-from-the-cli"></a> Node 运行时版本与 CLI 不同

打包的无头节点可以运行比全局安装的 CLI 更新的私有运行时。使用`openclaw nodes status --json`查看连接节点的版本； `openclaw --version` 报告 CLI 版本。有关延迟更新、选择退出、回退以及迁移或修复延迟的信息，请参阅 [ 无头节点更新](/install/updating/automatic-updates#headless-node-updates)。

如果明显空闲的节点不断推迟更新，请检查其安装的插件。没有空闲工作回调的插件无法确认其后台工作已完成，因此节点继续运行。更新插件，或在手动更新和重新启动节点之前完成其工作。

## <a id="foreground-requirements"></a> 前台要求

`camera.*` 和 `screen.*` 在 iOS/Android 节点上仅在前台运行。

快速检查和修复：

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw logs --follow
```

如果你看到 `NODE_BACKGROUND_UNAVAILABLE`，请将节点应用切换到前台后重试。

## <a id="permissions-matrix"></a> 权限矩阵

| 能力                   | iOS                                     | Android                                      | macOS 节点应用程序                   | 典型失败代码                          |
| ---------------------------- | --------------------------------------- | -------------------------------------------- | -------------------------------- | --------------------------------------------- |
| `camera.snap`, `camera.clip` | 相机（录制 clip 音频时还需要麦克风）           | 相机（录制 clip 音频时还需要麦克风）                | 相机（录制 clip 音频时还需要麦克风）    | `*_PERMISSION_REQUIRED`                       |
| `screen.record`              | 屏幕录制（可选麦克风）       | 屏幕捕获提示（可选麦克风）       | 屏幕录制                 | `*_PERMISSION_REQUIRED`                       |
| `computer.act`               | n/a                                     | n/a                                          | 辅助功能 + 屏幕录制 | `COMPUTER_DISABLED`, `ACCESSIBILITY_REQUIRED` |
| `location.get`               | 使用时或始终（取决于模式） | Foreground/Background 基于模式的定位 | 位置许可              | `LOCATION_PERMISSION_REQUIRED`                |
| `system.run`                 | n/a（节点主机路径）                    | n/a（节点主机路径）                         | 需要执行批准          | `SYSTEM_RUN_DENIED`                           |

## <a id="pairing-versus-approvals"></a> 配对和审批

四个独立的批准和策略门控制节点命令是否成功：

1. **设备配对**：该节点能否连接到网关？
2. **Node命令面批准**：声明的命令是否已通过`openclaw nodes pending`和`openclaw nodes approve <nodeRequestId>`批准？
3. **网关节点命令策略**：`gateway.nodes.commands.allow` / `gateway.nodes.commands.deny`和平台默认值是否允许RPC命令ID？
4. **Exec审批**：该节点可以在本地运行特定的shell命令吗？

设备配对承认身份；表面批准限制其配对设备记录上的命令。这两个请求 ID 不同。初始未经批准的表面不会公开任何有效命令。待处理的扩展仅保留已批准、保持声明并通过网关策略的命令。对于 `system.run`，shell 允许列表和询问策略存在于节点的执行批准 （`openclaw approvals get --node ...`） 中，而不是配对记录中。平台权限和前台要求仍然适用。

快速检查：

```bash
openclaw devices list
openclaw nodes pending
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

- 缺少配对：使用 `openclaw devices approve <deviceRequestId>` 批准当前设备请求，然后重新启动或重新运行 `PAIRING_REQUIRED` 上暂停的节点。重新连接会创建单独的表面请求。
- Node 与初始空命令列表配对并连接：检查 `openclaw nodes pending` 并批准其与 `openclaw nodes approve <nodeRequestId>` 不同的 `<nodeRequestId>`。
- `nodes describe` 缺少某个命令：检查网关节点命令策略，以及该节点在连接时是否实际上通告了该命令。
- Surface 已批准，但 `system.run` 失败：检查网关策略，然后在该节点上执行 approvals/allowlist。

SSH-verified 和引导注册可以自动批准第一个表面。可信网络设备批准则不然。后续的命令、能力或权限扩展仍然需要表面批准。

对于支持批准的 `host=node` 运行，网关还将执行绑定到准备好的 `systemRunPlan`。如果稍后的调用者在转发已批准的运行之前更改了命令、cwd 或会话元数据，则网关会因批准不匹配而拒绝该运行，而不是信任已编辑的有效负载。

## <a id="common-node-error-codes"></a> 常见节点错误代码

| 代码                                   | 含义                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_BACKGROUND_UNAVAILABLE`          | 应用已进入后台；请将其切换到前台。                                                                                                                                        |
| `CAMERA_DISABLED`                      | 节点设置中摄像头开关已禁用。                                                                                                                                                |
| `*_PERMISSION_REQUIRED`                | OS 权限 missing/denied.                                                                                                                                                           |
| `LOCATION_DISABLED`                    | 位置模式已关闭。                                                                                                                                                                   |
| `LOCATION_PERMISSION_REQUIRED`         | 请求的位置模式未获授权。                                                                                                                                                    |
| `LOCATION_BACKGROUND_UNAVAILABLE`      | 应用已进入后台，但只有“使用期间”权限。                                                                                                                             |
| `COMPUTER_DISABLED`                    | 在 macOS 应用程序中启用 **允许计算机 Control**，然后批准配对更新。                                                                                                    |
| `ACCESSIBILITY_REQUIRED`               | 在 macOS 系统设置中授予对当前 OpenClaw 应用程序包的可访问性。                                                                                                        |
| `SYSTEM_RUN_DENIED: approval required` | Exec 请求需要明确批准。                                                                                                                                                   |
| `SYSTEM_RUN_DENIED: allowlist miss`    | 命令被允许列表模式阻止。在 Windows 节点主机上，像 `cmd.exe /c ...` 这样的 shell 包装器形式会在允许列表模式下被视为允许列表未命中，除非通过 ask 流程获批。 |

## <a id="fast-recovery-loop"></a> 快速恢复循环

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

如果仍然卡住：

- 重新批准设备配对。
- 重新启动或重新运行因手动配对而暂停的节点，然后使用 `openclaw nodes pending` / `openclaw nodes approve <nodeRequestId>` 批准其待处理的表面请求。
- 重新打开节点应用程序（前台）。
- 重新授予OS权限。
- Recreate/adjust 执行批准策略。

对于计算机控制，还要确认节点本地的 Computer Control 开关已启用，其配对更新已获批准，具备视觉能力的代理暴露了 `computer` 工具，并且在授予 Screen Recording 权限后 `screen.snapshot` 能够成功。`gateway.nodes.commands.deny` 条目始终会覆盖平台默认值或 `gateway.nodes.commands.allow`。

## <a id="related"></a> 相关内容

- [节点概览](/nodes)
- [摄像头节点](/nodes/camera)
- [位置命令](/nodes/location-command)
- [计算机使用](/nodes/computer-use)
- [执行批准](/tools/exec-approvals)
- [网关配对](/gateway/pairing)
- [网关故障排查](/gateway/troubleshooting)
- [通道故障排除](/channels/troubleshooting)
