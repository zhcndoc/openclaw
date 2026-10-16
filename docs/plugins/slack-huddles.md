---
summary: "Slack 会话插件：通过登录的 Chrome 用户帐户加入活动会话"
doc-schema-version: 1
read_when:
  - "您希望 OpenClaw 客服人员加入 Slack 会话"
  - "您需要设置专用的 Slack 用户或了解手动操作"
title: "Slack 会话插件"
---

`slack-huddles` 插件通过 OpenClaw Chrome 配置文件中的 Slack Web 客户端加入活动的 Slack 集群。它为代理使用专用的 Slack **用户帐户**：Slack 没有用于加入会话或读取音频的应用程序或机器人 API。该插件独立于 [Slack 消息通道 ](/channels/slack)。

使用 [ 会议插件 ](/plugins/meeting-plugins) 进行共享模式、Chrome 和虚拟音频设置、转录、远程节点要求和验证。

## <a id="requirements"></a> 要求

- OpenClaw 2026.9.8 或更新版本。较旧的主机缺乏该插件所依赖的共享会议运行时所有权检查，因此安装会拒绝它们。
- A 专用 Slack 用户帐户登录到 OpenClaw Chrome 配置文件中的 Slack。
- 包含聊天室的频道或对话中的成员资格。
- 一个活跃的聚会，由 Slack 中的一个人发起。
- Slack的英文UI。该适配器更喜欢 `data-qa` 挂钩，但其文本和可访问标签后备仅是英文。
- 用于对讲（`agent` 或 `bidi`）、macOS 上的 BlackHole 2ch 和 SoX，或 Linux 上的 PipeWire-Pulse 及其命令行工具，在主机上运行 Chrome。

对于字幕转录，打开 Slack 的首选项，而不是 **在加入专用帐户的 huddles** 时默认打开字幕。该插件读取可见的标题；它不会打开 Slack 菜单来启用它们。当字幕不可用时，状态报告 `captioning: false` 并附有注释。字幕的可用性还限制了共享的持久文字记录和注释路径。

## <a id="install-and-enable"></a> 安装并启用

如果需要，安装插件，然后显式启用它：

```bash
openclaw plugins install @openclaw/slack-huddles
openclaw plugins enable slack-huddles
```

默认情况下禁用它，因为它需要登录的专用 Slack 用户。检查配置更改是否适用，然后验证先决条件：

```bash
openclaw slackhuddles setup
```

使用 OpenClaw 控制的相同 Chrome 配置文件登录。 Slack 应用程序的机器人令牌或用户 OAuth 令牌不会替换该浏览器登录。

对讲验证 Slack 选定的麦克风标签：macOS 上的 BlackHole 2ch 或 Linux 上的 OpenClaw 会议音频源。需要时，适配器会打开 Slack 的音频设置并在启用通话中对讲之前选择该麦克风。如果选择器不可用，请手动选择它并重试状态。与受控的第二个参与者验证远程可听性。

## <a id="configure"></a> 配置

该插件使用共享会议配置。此示例在配对节点上使用正常代理路径和 Chrome：

```json5
{
  plugins: {
    entries: {
      "slack-huddles": {
        enabled: true,
        config: {
          defaultMode: "agent",
          chrome: {
            browserProfile: "openclaw",
            autoJoin: true,
            audioBackend: "auto",
          },
          chromeNode: { node: "meeting-node" },
        },
      },
    },
  },
}
```

省略 `chromeNode` 以在网关主机上运行 Chrome。配对节点必须允许 `browser.proxy` 和 `slackhuddles.chrome`；使用 `plugins.entries.slack-huddles.config.chromeNode.node` 选择它。

使用 `agent` 进行 OpenClaw 推理和带有 TTS 回复的工具，使用 `bidi` 进行直接实时语音，或使用 `transcribe` 进行仅观察字幕。对讲捕获页面中的远程参与者音频并通过虚拟麦克风发送助理语音。使用 [ 共享会议设置 ](/plugins/meeting-plugins#configure-teams-or-zoom) 配置提供商。 Slack 帐户拥有显示名称；未输入客人姓名。

## <a id="join-and-manage-a-huddle"></a> 加入并管理会话

在 Slack 中，使用 **复制会话链接**，然后将链接传递给 OpenClaw：

```bash
openclaw slackhuddles join 'https://app.slack.com/huddle/T0123ABCD/C0123ABCD'
openclaw slackhuddles status
openclaw slackhuddles leave <session-id>
```

频道参考也有效。如果没有工作区 ID，登录的 Slack 客户端将解析其活动工作区：

```bash
openclaw slackhuddles join 'channel:C0123ABCD' --mode transcribe
```

接受的输入是 HTTPS Slack huddle 链接，带或不带团队 ID，以及以 `C`、`G` 或 `D` 开头的频道 ID，后跟至少八个大写字母或数字。通道参考可以带有 `channel:` 或 `slack:channel:` 前缀。要显式选择工作空间，请使用 `team:T0123ABCD:channel:C0123ABCD` 或 `slack:team:T0123ABCD:channel:C0123ABCD`；两者均生产 `https://app.slack.com/huddle/T0123ABCD/C0123ABCD`。团队 ID 以 `T` 或 `E` 开头，并遵循相同的大写和长度规则。

不接受消息永久链接、用户 ID、`slack://` 深层链接和 Slack `/client/...` 浏览器 URL 加入输入。使用 **复制会话链接** 或频道参考。频道 ID 仅在工作区中唯一，因此团队资格链接会保留其工作区：它仅针对相同的工作区和频道重用会话，并且从不匹配裸频道引用。

`slack_huddles` 工具支持 `join`、`leave`、`status`、`transcript` 和 `speak`。其连接 `url` 可以是 huddle 链接或频道参考。在Slack会话中，**Conversation info** `chat_id`携带频道id。网关方式使用`slackhuddles.*`；节点命令为`slackhuddles.chrome`。成绩单来源提供者为`slack-huddle`，别名为`slack-huddles`；存储的成绩单使用提供者名称 **Slack huddle**。

## <a id="handle-manual-actions"></a> 手柄手动操作

对于 `chrome.autoJoin: true`，适配器单击 **Join Huddle** 进行活动会话，并且仅当该帐户尚未处于另一个会话中时才有效。它始终以静音方式加入，因为加入转换本身可以切换 Slack 的输入。对于对讲，它会选择通话中的虚拟麦克风，并且仅在 Slack 将其报告为输入时取消静音，因此主持人的物理麦克风永远不会上线； `transcribe` 保持静音。相机保持关闭状态。

| 原因                        | 操作                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `slack-login-required`        | 将 OpenClaw Chrome 配置文件签名到专用 Slack 帐户中，然后重试。                                        |
| `slack-huddle-not-active`     | 还没有人在这一堆人中。在 Slack 中开始讨论，然后再次询问。                                              |
| `slack-confirmation-required` | 阅读并完成 Slack 中报告的确认。该插件不会确认切换会话或其他提示。 |
| `slack-session-conflict`      | 该帐户已在此浏览器或其他设备上的另一个堆中。留下它，然后重试。                 |
| `slack-admission-required`    | 完成请求加入步骤并等待入场。入院后刷新状态。                             |
| `slack-permission-required`   | 解决 OpenClaw Chrome 配置文件中的浏览器麦克风权限提示。                                      |

离开使用Slack的**Leave Huddle**控件。每个人的拥挤永远不会结束。

## <a id="limits"></a> 限制

该插件仅加入活跃的会话。它不会启动会话、应答来电铃声、自动加入占用的频道或使用屏幕共享、画布、AI 笔记或表情符号控件。每个专用 Slack 帐户使用一个会话；使用该帐户的其他设备可能会导致会话冲突。

Slack 在其客户端显示其他通道时保持 huddle 运行，因此适配器仅从 huddle 通道自己的标头证明成员资格。将 OpenClaw Slack 选项卡保留在该频道上：在任何其他视图上，状态会将呼叫报告为未经验证，并且音频、字幕和离开保持阻止状态。

Slack 不批准自动用户客户端。即使 Slack 的消息传递 API 保持不变，Web 客户端 DOM 更改也可能会破坏适配器。此集成不会创建音频或视频记录。

## <a id="related"></a> 相关内容

- [会议插件](/plugins/meeting-plugins)
- [Slack 频道](/channels/slack)
- [成绩单 CLI](/cli/transcripts)
