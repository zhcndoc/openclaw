---
summary: "特设本地media/voice冒烟加Android节点能力扫"
title: "快速现场烟雾和 Android 节点扫描"
read_when:
  - "您想要快速的临时媒体或语音通话实时检查"
  - "您正在扫描连接的 Android 节点通告的命令"
---

## <a id="live%3A-local-smoke-commands"></a><a id="live-local-smoke-commands"></a> 实时：本地冒烟命令

在进行临时实时检查之前，请先在进程环境中导出所需的提供商密钥。

安全的媒体冒烟测试：

```bash
pnpm openclaw infer tts convert --local --json \
  --text "OpenClaw live smoke." \
  --output /tmp/openclaw-live-smoke.mp3
```

安全的语音通话就绪冒烟测试：

```bash
pnpm openclaw voicecall setup --json
pnpm openclaw voicecall smoke --to "+15555550123"
```

`voicecall smoke` 是一次试运行，除非 `--yes` 也存在；仅当您打算拨打实际电话时才使用 `--yes`。对于 Twilio、Telnyx 和 Plivo，成功的准备情况检查需要公共 Webhook URL - local/private 环回 URL 被拒绝，因为这些提供程序无法访问它们。

## <a id="live%3A-android-node-capability-sweep"></a><a id="live-android-node-capability-sweep"></a> 实时：Android 节点能力扫描

- 测试：`src/gateway/android-node.capabilities.live.test.ts`
- 脚本：`pnpm android:test:integration`
- 目标：调用已连接 Android 节点当前声明的**每一个命令**，并断言命令契约行为。
- 范围：
  - Preconditioned/manual 设置（该套件没有 install/run/pair 应用程序）。
  - 针对所选 Android 节点逐个命令进行 gateway `node.invoke` 验证。
- 必需的前置设置：
  - Android 应用已连接并与 gateway 配对。
  - 应用保持在前台。
  - Permissions/capture 已授予您希望通过的功能的同意。
- 可选目标覆盖：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- 完整 Android 设置详细信息：[Android App](/platforms/android)
