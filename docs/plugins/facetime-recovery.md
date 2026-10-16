---
summary: "删除 FaceTime 本机工件并恢复标准 Mac 安全策略"
read_when:
  - "您正在卸载实验性 FaceTime 插件"
  - "帮助程序注入或配对的音频驱动程序需要恢复"
title: "FaceTime 恢复和删除"
---

此过程删除了 FaceTime 插件的本机工件，并描述了恢复 Mac 标准安全状态所需的单独操作员操作。 OpenClaw 永远不会自动更改 SIP。

## <a id="remove-driver-and-helper-artifacts"></a> 删除驱动程序和帮助程序工件

结束任何正在进行的通话，然后运行：

```bash
openclaw gateway call facetime.uninstall --json
openclaw plugins disable facetime
```

卸载将删除 HAL 驱动程序、缓存的驱动程序输出、FaceTime 和电话的暂存和带时间戳的帮助程序 dylib、帮助程序密钥以及暂存的帮助程序构建标记。它不会杀死不相关的进程。

退出并重新打开 FaceTime 和电话，这样两个应用程序都不会保留映射的助手。如果应用程序无法正常退出，请仅从“活动监视器”中终止该应用程序，然后重新打开它。不要使用宽泛的进程名称终止命令。

验证 `OpenClaw-Mic` 和 `OpenClaw-Feed` 不再出现：

```bash
system_profiler SPAudioDataType
```

## <a id="restore-sip-debugging-restrictions"></a> 恢复SIP调试限制

如果您之前接受了私有助手权衡并禁用了调试限制，请从 macOS 恢复恢复标准 SIP：

1. 关闭 Mac。
2. 按住电源按钮直至出现启动选项。
3. 选择 **Options**，进行身份验证，然后从实用程序中打开终端。
4. 运行`csrutil enable`。
5. 重新启动并使用 `csrutil status` 进行验证。

请勿仅仅为了诊断驱动程序或配置问题而修改 SIP。

## <a id="recover-a-failed-driver-update"></a> 恢复失败的驱动程序更新

驱动程序更换是事务性的。失败的暂存或交换后验证会恢复之前的驱动程序，并且不会重新启动 Core Audio。如果状态保持为 `invalid` 或 `outdated`，请从交互式管理会话重新运行 `facetime.updateDriver` 并检查其确切错误。切勿手动将未经验证的驱动程序复制到 `/Library/Audio/Plug-Ins/HAL` 中。

安装程序故意拒绝未直接安装在 `/Applications/Xcode.app`、Apple- 签名、root 拥有或不含 group/world-writable 内容的 Xcode。使用管理员管理的安装将 Xcode 从 Apple 重新安装到 `/Applications`。如果错误指定了可写路径组件，则管理员必须根据 Mac 的软件管理策略从该组件（包括 `/Applications`）中删除 group/world 写入访问权限。请勿通过更改插件、提供另一个编译器路径或将本地构建的驱动程序复制到 HAL 目录来绕过检查。
