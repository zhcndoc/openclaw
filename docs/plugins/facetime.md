---
summary: "在 Mac 上与 OpenClaw 座席设置 FaceTime 语音呼叫"
read_when:
  - "您想要使用 OpenClaw 座席配置 FaceTime 呼叫"
  - "您需要安装本机助手并配置Mac音频"
title: "FaceTime插件"
sidebarTitle: "FaceTime（实验）"
doc-schema-version: 1
---

将 FaceTime 连接到 OpenClaw 代理以进行双向语音对话。该插件会自动应答来自您配置的句柄的呼叫，并让您的客服人员在批准后给您打电话。实时语音提供程序处理语音，而您的 OpenClaw 代理处理需要工具或内存的请求。

**Status：实验性，默认禁用。** 在同一台 Mac 上的同一登录用户会话中运行网关和本机帮助程序。在`plugins.entries.facetime`下配置FaceTime，不作为消息通道。

<Warning>
FaceTime 集成使用私有 Apple API 并将帮助程序注入到 Apple 呼叫应用程序中。它需要减少 SIP 调试保护。使用您可以实际控制的专用、最新的 Mac。 OpenClaw 不会自动更改 SIP、开发人员工具访问权限或 macOS 隐私权限。
</Warning>

## <a id="requirements"></a> 要求

- 运行 macOS 14.4 或更高版本的 Apple Silicon Mac。
- 当前OpenClaw主机版本，匹配捆绑插件。
- FaceTime 在 Gateway Mac 上登录您的 Apple 帐户。
- 完整的 Xcode 安装在 `/Applications/Xcode.app`。
- FaceTime 插件和匹配的签名本机伴侣。
- A 具有工作凭证的实时语音提供商。
- 音频驱动程序和Mac设置的管理员帐户。

通话中的每个人都必须同意语音提供商处理他们的音频。

保持一对一通话。配置的句柄授权调用；该集成不会验证每个发言者的身份或检查群组通话的成员身份。请勿将其他参与者添加到具有代理工具访问权限的呼叫中。

## <a id="install-the-plugin-and-native-companion"></a> 安装插件和本机伴侣

在 Gateway Mac 上运行以下命令：

```bash
openclaw plugins install @openclaw/facetime
brew install openclaw/tap/openclaw-facetime
```

本机伴侣维护在 [openclaw/openclaw-facetime](https://github.com/openclaw/openclaw-facetime). 使用其匹配的签名版本。如果包或公式不可用，则在发布之前安装无法继续。

## <a id="configure-owner-identities"></a> 配置所有者身份

将您的 FaceTime 电子邮件地址或完整的国际电话号码添加到 `ownerHandles`。只有列出的句柄才能使用集成。每个列出的句柄都有所有者权限；没有宾客级别。

将其合并到您的 OpenClaw 配置中。保留现有插件条目并将 `facetime` 添加到现有的 `plugins.allow` 列表（如果您使用）。

```json5
{
  plugins: {
    allow: ["facetime"],
    entries: {
      facetime: {
        enabled: true,
        config: {
          ownerHandles: ["owner@example.com", "+12065550123"],
          realtime: {
            provider: "openai",
            sessionKey: "main",
            toolPolicy: "owner",
          },
        },
      },
    },
  },
}
```

### <a id="configure-voice-credentials"></a> 配置语音凭证

该示例选择 OpenAI 进行实时语音。语音凭证与文本代理的登录信息是分开的。配置所选实时提供商支持的凭据；单独的文本代理订阅可能无法提供语音访问。

提供商身份验证使用 `realtime.sessionKey` 选择的代理。对于 OpenAI，当未配置插件特定的 API 密钥时，该代理的 API-key 身份验证配置文件可以提供语音凭证。

对于环境支持的 OpenAI API 密钥，请合并以下附加配置：

```json5
{
  secrets: {
    providers: {
      voiceenv: { source: "env", allowlist: ["OPENAI_API_KEY"] },
    },
  },
  plugins: {
    entries: {
      facetime: {
        config: {
          realtime: {
            providers: {
              openai: {
                apiKey: { source: "env", provider: "voiceenv", id: "OPENAI_API_KEY" },
              },
            },
          },
        },
      },
    },
  },
}
```

使 `OPENAI_API_KEY` 可用于网关进程，而不仅仅是您的终端。您还可以重复使用现有的文件支持或其他支持的 [SecretRef](/gateway/secrets)，而不是将密钥存储在配置中。

### <a id="choose-the-agent-and-tool-access"></a> 选择代理和工具接入

`realtime.sessionKey` 默认为 `main`，选择默认代理。要选择其他代理，请使用代理限定密钥，例如 `agent:assistant:main`，将 `assistant` 替换为其配置的 ID。

每个呼叫都使用单独的咨询会话。它可以从选定的源会话继承上下文，而无需将呼叫轮流添加到该聊天中。代理的工作区、工具凭证和审批策略仍然适用。

选择 `realtime.toolPolicy`：

| 值             | 行为                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `owner`（默认） | 使用所选代理的常规工具和批准检查。                                                                           |
| `safe-read-only`  | 将代理请求限制为一组固定的文件、搜索、Web 获取和内存工具。其他插件工具不会自动包含在内。 |
| `none`            | 禁用代理咨询。语音对话和呼叫控制仍然可用。                                                        |

无效的策略值将被拒绝。即使选择受限工具策略，也仅将您自己的身份添加到 `ownerHandles`。

### <a id="choose-a-voice"></a> 选择声音

显式设置 `realtime.provider` 以保持提供商选择一致。 `realtime.model`和`realtime.voice`是可选的；省略时，所选提供者提供其默认值。如果您不想遵循提供商默认语音的更改，请明确设置支持的语音。

如果省略 `realtime.provider`，则注册的实时提供商会自动选择提供商。 OpenAI 是此处的示例，不是插件的默认值。

## <a id="prepare-the-mac"></a> 准备 Mac

保存配置后，重新启动网关并运行安装程序：

```bash
openclaw gateway restart
openclaw gateway call facetime.setup --json
```

安装程序报告所需的操作，并可以启动本机助手、打开呼叫应用程序并附加助手。它不拨打电话。

### <a id="enable-developer-tools-access"></a> 启用开发者工具访问

从交互式管理员会话中，运行：

```bash
sudo /usr/sbin/DevToolsSecurity -enable
```

### <a id="allow-debugger-attachment"></a> 允许调试器连接

本机助手需要附加到 FaceTime 和电话。如果安装程序报告 SIP 调试限制阻止附件：

1. 关闭 Mac。
2. 按住电源按钮直至出现启动选项，然后选择 **Options**。
3. 在macOS恢复中打开**实用程序>终端**。
4. 运行：

   ```bash
   csrutil enable --without debug
   ```

5. 重新启动到普通用户会话并重新运行 `facetime.setup`。

这将禁用 SIP 的调试限制，同时保留其其他保护。请勿禁用所有 SIP 或更改它来解决不相关的身份验证或音频驱动程序错误。如果安装程序无法确定 SIP 状态，请运行 `csrutil status` 并在进行更改之前检查结果。

请参阅 [FaceTime 恢复和删除](/plugins/facetime-recovery) 以在删除集成时恢复标准安全设置。

### <a id="grant-permissions-and-allow-incoming-calls"></a> 授予权限并允许来电

从运行网关的同一用户会话完成 macOS 权限提示。如果预检报告应用程序音频捕获被阻止，请检查 **系统设置 > 隐私和安全 > 屏幕和系统音频录制**。

安装程序还会检查焦点或通知设置是否可以阻止呼叫。允许通过活动 Focus 进行 FaceTime 呼叫，并在共享或镜像显示时启用通知（如果设置报告设置阻止通知）。

### <a id="install-the-audio-driver"></a> 安装音频驱动

运行仅限管理员的安装程序并完成其管理员提示：

```bash
openclaw gateway call facetime.installDriver --json
openclaw gateway call facetime.driverStatus --json
```

安装程序使用 Xcode 在本地构建固定的基于 BlackHole 的驱动程序。它在构建之前检查 Xcode 安装，并且不接受手动构建的驱动程序。如果安装失败，请按照报告的错误或 [ 驱动程序恢复步骤 ](/plugins/facetime-recovery#recover-a-failed-driver-update) 进行操作。

### <a id="select-the-call-audio-devices"></a> 选择通话音频设备

在 FaceTime 和电话处理 FaceTime 音频时，选择：

- **麦克风：** `OpenClaw-Mic`。
- **输出：**物理扬声器或耳机。

请勿选择 `OpenClaw-Mic`、`OpenClaw-Feed`、BlackHole、聚合设备或多输出设备作为呼叫输出。

## <a id="inspect-and-activate"></a> 检查并激活

完成 Mac 和驱动程序步骤后再次运行安装程序，然后检查音频准备情况：

```bash
openclaw gateway call facetime.setup --json
openclaw gateway call facetime.preflight --json
openclaw gateway call facetime.status --json
```

在拨打电话之前解决报告的设置或飞行前错误。这些命令不会拨打任何人的电话。 `setup` 和 `preflight` 是可以执行实时设置和音频检查的管理操作。 `status` 可以检查非活动运行时，而无需打开应用程序、暂存助手或启动呼叫音频。

## <a id="verify-your-first-call"></a> 验证您的第一次通话

从 FaceTime 音频开始：

1. 确认接收设备可用并且其用户同意呼叫。
2. 要求您的客服人员呼叫您配置的所有者句柄之一，然后批准拨出呼叫。
3. 在接收设备上接听并检查您是否可以听到问候语并进行双向对话。
4. 请座席挂断电话，或自行结束通话。

代理使用 `facetime_call` 并在拨号前请求一次性批准。您还可以从配置的所有者句柄调用 Gateway Mac 的 FaceTime 帐户。

## <a id="place-and-end-calls"></a> 拨打和结束通话

作为网关操作员直接拨号：

```bash
openclaw gateway call facetime.dial \
  --params '{"handle":"owner@example.com","mode":"audio"}' \
  --json
```

目标必须位于 `ownerHandles` 中。直接拨号需要 `operator.write` 访问权限，并算作显式操作员操作。

要结束通话并检查其状态：

```bash
openclaw gateway call facetime.hangup --json
openclaw gateway call facetime.status --json
```

等待状态显示没有活动或挂起的呼叫，然后再开始另一个呼叫。挂断确认意味着请求已发送，而不是呼叫已经结束。

待处理的出站拨号会保留呼叫槽位，因此在完成或确认取消之前，不会自动应答来电。如果帮助者断开连接或报告不确定的拨号结果，则在 OpenClaw 协调呼叫时，挂起状态将保持可见。

## <a id="update-the-integration"></a> 更新集成

更新插件和本机伴侣后，检查 `facetime.driverStatus`。如果驱动程序已过时，请从交互式管理员会话中更新它：

```bash
openclaw gateway call facetime.updateDriver --json
```

如果升级原型配置，请运行 `openclaw doctor --fix`。 Doctor 将 `whitelistHandles` 迁移到 `ownerHandles` 并删除已停用的 `helperHost`、`helperPort` 和 `realtime.brain` 设置。

## <a id="remove-the-integration"></a> 删除集成

结束任何正在进行的通话，然后运行：

```bash
openclaw gateway call facetime.uninstall --json
openclaw plugins disable facetime
```

按照 [FaceTime 恢复和删除 ](/plugins/facetime-recovery) 重新启动 Apple 通话应用程序，检查音频设备是否已删除，然后恢复 SIP。

## <a id="limits"></a> 限制

- 一次管理一个呼叫。
- FaceTime 仅限呼叫。蜂窝网络、Wi-Fi Calling/PSTN、紧急呼叫和无法识别的呼叫类型都会被拒绝，即使号码与所有者句柄匹配也是如此。
- 从 FaceTime 音频开始。视频和电话托管的 FaceTime 音频仍处于实验阶段，并且在 macOS 版本之间的行为可能有所不同。
- 使用代理工具的请求可能比普通语音回复需要更长的时间。
- 没有FaceTime特定的实时模型后备；提供者行为和默认值来自所选的实时提供者。

## <a id="troubleshooting"></a> 故障排查

| 症状                                      | 需要检查的内容                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 插件不启动                        | 确认已启用、`ownerHandles` 非空且网关在登录的 Mac 用户会话中运行。                                        |
| 本机助手丢失或被拒绝         | 安装匹配的签名、公证的本地伴侣。不要绕过其签名或协议检查。                                               |
| 安装程序报告调试器附件被阻止 | 检查[中的开发人员工具访问和SIP调试状态准备Mac](/plugins/facetime#prepare-the-mac)。                                         |
| 音频驱动安装失败              | 验证完整的 Xcode 是否安装在 `/Applications/Xcode.app`，然后按照 [ 驱动程序恢复 ](/plugins/facetime-recovery#recover-a-failed-driver-update) 进行操作。 |
| 没有问候语或单向音频                 | 检查 Apple 呼叫应用程序中的麦克风和物理输出选择，然后重新运行设置和预检。                                              |
| 语音认证失败                   | 在网关进程中检查所选实时提供商的凭据。对于每个语音提供商来说，文本代理登录是不够的。              |
| 声音突然变了                   | 显式设置 `realtime.provider` 和支持的 `realtime.voice`。                                                                                   |
| 语音可以工作，但代理工具不行           | 检查 `realtime.sessionKey`、`realtime.toolPolicy` 以及所选代理的工具凭证和批准。                                           |
| 工具支持的响应缓慢                   | 使用 [Gateway 日志](/logging) 和 [ 会话检查](/cli/sessions) 来区分代理响应时间和工具执行时间。                      |
| 通话未结束                            | 再次拨号前请检查 `facetime.status`。如果需要，请使用 Apple 通话应用程序结束通话。                                                        |

在共享日志之前删除帐户标识符、凭据和私人对话内容。

## <a id="related"></a> 相关内容

- [配置参考](/plugins/reference/facetime)
- [FaceTime 恢复和删除](/plugins/facetime-recovery)
- [插件管理](/plugins/manage-plugins)
- [秘密](/gateway/secrets)
