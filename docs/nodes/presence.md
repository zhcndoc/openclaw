---
summary: "检测你最近使用的 Mac，并将节点警报路由到那里"
read_when:
  - 你希望 OpenClaw 识别当前活动的 Mac
  - 你正在调试最后输入活动或活动节点选择
  - 你想了解节点连接通知的路由方式
title: "活动电脑存在"
---

活动电脑存在会告诉 Gateway 哪个已连接的 macOS 节点接收到了最近一次物理鼠标或键盘输入。OpenClaw 使用该信号将一台 Mac 标记为 `active`，为 agent 提供一个稳定的活动节点提示，并将节点连接警报路由到你最可能所在的那台电脑。

这与 [system presence](/concepts/presence) 不同，后者是 Gateway 客户端的实时名单；也不同于持久化的 `node.presence.alive` 信标，后者记录的是移动节点上次唤醒的时间，但不会将其视为已连接。

## 要求

- OpenClaw macOS 应用已配对并以 node 模式连接。
- **Settings -> Permissions -> Active computer detection** 已启用。该功能默认关闭。
- 已向已签名的 OpenClaw 应用授予 **Accessibility** 权限。
- 对于连接提醒，还需要授予 **Notifications** 权限，并且
  Mac node 暴露 `system.notify`。

活动报告目前由原生 macOS node 实现。iOS、
Android、watchOS 和无头 node 主机可以报告连接或后台
最后一次在线状态，但它们不会竞争活动计算机的指定。

## 检查当前活动的电脑

1. 在 macOS 应用中，打开 **Settings -> Permissions**，启用
   **Active computer detection**，并在 macOS 系统设置中授予 **Accessibility** 权限。
2. 确认 Mac 节点已连接：

   ```bash
   openclaw nodes status --connected
   ```

3. 在该 Mac 上移动鼠标或按下任意键，然后运行：

   ```bash
   openclaw nodes status
   openclaw nodes describe --node <node-id-or-name>
   ```

最近且符合条件的 Mac 会被标记为 `active`。状态输出会显示其最后输入
的时间间隔；`describe` 会暴露 `active`、`lastActiveAtMs` 和 `presenceUpdatedAtMs`。
活动会被刻意合并，因此在最近一次报告之后，显示内容最多可能需要大约 15
秒才能反映另一次输入。

## 活动如何变为在线状态

macOS 报告器每两秒采样一次 HID 系统空闲时钟。它会在节点连接变为就绪时上报一次，然后在之后每 15 秒最多上报一次更新的物理活动。空闲时，它每三分钟发送一次 keepalive。空闲时长上限为 30 天，因此非常久远的采样不会向前漂移并错误地变成最新的电脑。

禁用 **Active computer detection** 会停止采样，并通过当前节点连接发送一个经过身份验证的清除事件。Gateway 会立即移除该 Mac 保留的活动时间戳，并重新计算当前活跃的电脑；其他节点能力和正在进行的工作会保持连接。如果所连接的 Gateway 早于此次清除操作，这台 Mac 节点会重新连接一次，以便断开连接的清理逻辑可以改为移除保留的活动信息。

Gateway 仅在以下条件全部满足时才接受活动：

- 该事件属于该 node id 当前已认证的连接；
- 该节点具有有效的 `accessibility: true` 权限；
- 负载中包含有界整数值 `idleSeconds`。

Gateway 会用自身的观测时间减去 `idleSeconds`，从而推导出 `lastActiveAtMs`。它绝不会信任节点提供的墙上时钟时间戳。在已连接且符合条件的 Mac 之间，`lastActiveAtMs` 更新最新者获胜；若相同，则以最近的 presence 更新为准。

Presence 是进程本地且与连接绑定的。断开当前会话、用相同的 node id 替换为另一个会话，或撤销 Accessibility，都会清除该节点的活动状态并重新计算当前活跃的 Mac。

## 隐私和模型上下文

活动共享默认关闭，并且独立于用于 UI 自动化的 Accessibility 授权。OpenClaw 发送的是空闲时长，而不是输入内容。它不会发送按键值、鼠标坐标、应用程序名称、窗口标题或原始输入事件。macOS 报告程序读取硬件 HID 状态，因此合成的计算机控制事件不会让自动化的 Mac 看起来像是你亲自使用的那台电脑。

持续活动不会创建面向模型的系统事件。动态运行时行只包含经过身份验证的节点 ID：

```text
active_node=<node-id>
```

精确时间戳和由节点控制的显示名称不会进入提示，以避免提示注入和缓存抖动。当代理需要当前详细信息时，`nodes` 工具可以改为读取 `node.list` 或 `node.describe`。

## 连接提醒的路由方式

在节点完成批准后的第一次成功 Gateway 握手后，
OpenClaw 会等待 750 毫秒，以便连接中的 Mac 能提交其首个
活动样本。随后，它会使用最新的活动信息尝试向已连接且具备通知能力的 Mac
发送提醒。

- 如果主投递成功，则不会有其他 Mac 收到该提醒。
- 如果没有可用的活跃 Mac，或者主投递失败，OpenClaw 会等待五
  秒，然后尝试向所有其余已连接且暴露 `system.notify` 的 Mac 发送提醒。
- 后续重新连接不会触发提醒。Gateway 会在配对元数据中记录成功连接，
  因此 Gateway 重启不会为每个先前连接过的节点重新播放提醒。

提醒与经过身份验证的节点身份绑定。对于同一节点的替代会话会接管其待处理的首次连接提醒；如果在投递执行时该节点已不再连接，则该提醒会被取消。

## 故障排除

| 症状                                   | 检查                                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 未标记任何 `active` 行                 | 确认已启用活动电脑检测，已连接原生 macOS 节点，并且 `openclaw nodes describe --node <id>` 显示 `permissions.accessibility: true`。   |
| 错误的 Mac 一直保持活动状态              | 在那台 Mac 上进行实际操作，等待合并窗口结束，然后重新运行 `openclaw nodes status`。合成的电脑控制操作不计入。                        |
| 最后输入数据消失                | 检查 Mac 是否断开连接、其节点会话是否已被替换，或者 Accessibility 是否被撤销。上述任一情况都会故意清除活动状态。                       |
| 警报出现在多台 Mac 上         | 主投递不可用或失败，因此延迟回退机制被执行。请确认活动中的 Mac 已连接、允许通知，并暴露了 `system.notify`。 |
| 代理没有提到活动中的 Mac | 在活动状态变更后开始一个新的轮次。运行时提示是稳定且简洁的；请使用 `nodes` 工具获取当前准确元数据。                                    |

有关 TCC 恢复，请参阅 [macOS 权限](/platforms/mac/permissions)。有关节点连接和命令失败，请参阅 [节点故障排除](/nodes/troubleshooting)。

## 相关

- [节点](/nodes)
- [节点 CLI](/cli/nodes)
- [系统在线状态](/concepts/presence)
- [网关协议](/gateway/protocol#presence)
- [macOS 应用](/platforms/macos)
