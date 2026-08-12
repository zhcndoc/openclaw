---
summary: "Chrome 扩展：使用自动本地配对安全地自动化已登录的标签页"
read_when:
  - 你希望代理在无需远程调试提示的情况下操作已登录的 Chrome
  - 你正在安装、配对、禁用或排查 OpenClaw Chrome 扩展的问题
  - 你需要了解 Chrome 原生引导的安全性和平台支持模型
title: "Chrome 扩展"
---

# Chrome 扩展

OpenClaw Chrome 扩展可以让浏览器工具自动化操作已登录 Chrome 配置文件中的符合条件的标签页。它使用
`chrome.debugger`，因此不需要 Chrome 阻止性的远程调试许可提示。

该扩展是浏览器自动化基础设施。它不包含聊天、页面共享、提示框或标签页副驾驶功能。其弹出窗口会显示连接状态、当前访问模式、用于当前符合条件标签页的暂停／允许操作，以及设置链接。

## 要求

- Google Chrome、Chrome for Testing 或 Chromium
- 在与 Chrome 相同的机器上安装 OpenClaw，或在该机器上运行 OpenClaw 浏览器节点
- macOS 或 Linux，用于自动原生引导
- 至少启动过一次 Chrome，以便其用户数据目录存在

Windows 保持手动配对。当前 Chromium 仅在已注册的主机是 Windows 可执行文件时才会直接启动原生主机；如果没有经过验证的二进制帧传输路径，OpenClaw 不会安装脚本启动器或注册表项。

## 安装

启动 Chrome，然后在加载扩展程序之前运行此命令：

```bash
openclaw browser extension install
```

保持命令运行。它会将捆绑的扩展程序复制到由 OpenClaw 所有的稳定目录中，根据该确切路径预测未打包扩展程序 ID，并在现有的 Chrome 系列用户数据根目录中预注册一个来源锁定的本机主机。只有在预注册成功后，它才会打印要加载的稳定路径。

Chrome 不允许普通 CLI 静默安装未打包扩展程序。这一步无法省略：

1. 打开 `chrome://extensions`。
2. 启用**开发者模式**。
3. 点击**加载已解压的扩展程序**。
4. 选择命令打印的路径。

在完成这些步骤期间，请保持安装命令运行。扩展程序会在第一次本机调用时完成配对；在正常的首次设置过程中，你无需打开其弹出窗口、重新加载扩展程序或重启 Chrome。随后，安装程序会读取配置文件的 `Secure Preferences`，并验证 Chrome 是否已在预测的 ID 下加载了经过批准的真实路径。

安装程序仅在以下所有条件均满足时接受 ID：

- 该 ID 符合 Chrome 的 32 个字符扩展程序 ID 格式；
- Chrome 将安装位置记录为未打包；
- 记录的扩展程序路径准确解析为已安装或捆绑的 OpenClaw 扩展程序目录；
- 记录的 ID 等于 Chromium 针对该确切规范真实路径确定性的路径 ID。

扩展程序名称不受信任。除非能够验证现有本机主机文件确实由 OpenClaw 所有，否则不会覆盖具有相同主机名称的文件。

需要时可以使用不同的有界等待时间：

```bash
openclaw browser extension install --wait-ms 60000
```

对于自动化，请使用 `--json`。结果包括稳定副本、发现的 ID 和配置文件、本机主机注册状态，以及是否需要手动设置。它绝不会包含中继密钥或配对字符串。

## 使用它

选择内置的 `chrome` 配置文件，或将其设为默认配置文件：

```bash
openclaw config set browser.defaultProfile chrome
```

```json5
{
  browser: {
    profiles: {
      chrome: { driver: "extension" },
    },
  },
}
```

新的自动配对使用 **All tabs**。现有的有效配对不会被覆盖，较旧的配对会保留其存储的访问模式。

### 选择标签页访问权限

- **All tabs** 会公开该 Chrome 配置文件中所有符合条件的普通标签页，但当前浏览器会话中已暂停的标签页除外。在弹出窗口中使用 **Pause on this tab** 和 **Allow on this tab**。
- **Selected tabs** 使用 **OpenClaw** 标签页组作为访问控制边界。将标签页移入该组即可授予访问权限；将其移出即可撤销访问权限。

打开扩展的设置页面即可更改访问模式。切换到 **Selected tabs** 后，未分组的标签页会立即解除关联，包括正在进行的附加操作。无论使用哪种模式，由 Agent 创建的标签页都会保留在 **OpenClaw** 组中。

该扩展会排除无痕标签页、`chrome://` 和 `chrome-extension://` 等内部页面，以及没有可用当前 URL 的标签页。访问 `file://` 还需要启用 Chrome 的 **Allow access to file URLs** 设置。

## 自动设置控件

设置会显示已隐藏的中继/原生引导状态，以及一个**使用自动本地设置**开关。

- 关闭自动设置会保留有效的现有配对，但会阻止新的原生引导尝试。
- **断开连接并禁用自动设置**会立即撤销配对、分离调试器会话，并持久化退出选择。
- **使用本地 OpenClaw**会清除退出选择并重试原生主机。
- 保存明确的手动配对也会清除退出选择。

### 从已停用的标签页 copilot 升级

如果设置显示自动化已暂停，以保护升级前的 copilot 会话，请确认旧的运行任务已完成。然后点击**断开连接并禁用自动设置**以丢弃已停用的恢复状态，随后点击**使用本地 OpenClaw**重新连接。在明确断开连接成功之前，扩展会保留已停用状态，并阻止中继连接、原生设置、手动配对、标签页访问权限更改和调试器附加。

Chromium 会为正在运行的浏览器进程缓存首次未找到原生主机的结果。如果已有扩展在安装原生主机之前尝试过自动设置，请重启一次 Chrome（完整重新加载浏览器进程）。从弹出窗口或设置中重试无法清除该进程级未找到结果。普通设置会通过在**Load unpacked**之前预注册主机来避免此问题。

## 状态和移除

在不打印凭据的情况下检查安装：

```bash
openclaw browser extension status
openclaw browser extension status --json
```

仅移除 OpenClaw 所有的原生主机清单和启动器：

```bash
openclaw browser extension uninstall-host
```

这不会从 Chrome 中移除已解压的扩展。请使用
`chrome://extensions` 执行此操作。这也不会删除稳定版扩展副本或现有的中继密钥。

`openclaw browser extension path` 为只读命令。存在稳定版已安装副本时，它会打印该副本；否则打印捆绑的源目录。

## 高级手动配对

Settings 页面负责手动配对。生成主机本地配对字符串：

```bash
openclaw browser extension pair
```

手动配对在 Windows 上以及恢复场景中仍然很有用。将完整的配对字符串视为密码。

对于一台安装了 Chrome 但未运行 OpenClaw 或浏览器节点的笔记本电脑，可直接配对到远程 Gateway：

```bash
openclaw browser extension pair \
  --gateway-url wss://gateway.example.com
```

将该字符串粘贴到 **设置 → 高级手动配对** 中。此流程无法使用自动引导：远程 Gateway 拥有不同的中继密钥，而本地原生主机永远不会获取或复制该密钥。非回环远程 URL 必须使用 `wss://`，并且 Gateway 必须公开不带路径重写代理前缀的确切 `/browser/extension` WebSocket 路径。

## 外部 CDP 客户端

该中继支持 Browser Relay Authentication v2 客户端，例如 mcporter。
打印非敏感的端点元数据：

```bash
openclaw browser extension cdp
openclaw browser extension cdp --json
```

输出包括环回端点、协议版本、密钥 ID，以及固定的 challenge/complete 资源。不包括中继密钥或授权标头。

`cdp --legacy-bearer` 是一个临时的、带警告的兼容性逃生方案。它仅在
`browser.extensionRelay.allowLegacyAuth=true` 时有效，并会在请求时打印
旧版凭据。

## 权限

该扩展仅请求：

- `debugger`：向允许的标签页发送 CDP 命令；
- `tabs` 和 `tabGroups`：发现标签页并强制执行访问模式；
- `storage`：持久化配对、访问模式、会话暂停和 bootstrap 选择退出状态；
- `alarms`：唤醒 MV3 worker 以重试 relay/bootstrap；
- `nativeMessaging`：请求一次本地 bootstrap 配对。

它不会请求 `activeTab`、`contextMenus`、`scripting` 或 `sidePanel`。

## Native bootstrap 安全

Native host 是 `ai.openclaw.browser_bootstrap`。每次
`chrome.runtime.sendNativeMessage` 调用都会启动一个进程，读取一个请求，
写入一个响应，然后退出。

请求使用带版本和长度前缀的 JSON 帧，并带有一个新生成的 16 字节
nonce。Native host 将输入限制为 4 KiB，要求进行致命错误式 UTF-8 解码和精确
字段校验，根据精确匹配的已安装 manifest 验证调用方来源，并且只返回本地生成的配对信息或有界的非秘密失败代码。
响应大小低于 Chrome 的 1 MiB native-message 限制。配对密钥绝不会出现在启动器参数、manifest、状态 JSON 或诊断信息中。

POSIX launcher 和 manifest 使用 OpenClaw 所有、权限为 `0700` 的目录下的绝对规范路径。manifest 的权限为 `0600`；launcher 可由所有者执行。符号链接、外部所有权、不安全权限、路径遍历、通配符来源以及外部同名注册都会以失败关闭。

未打包 ID 的计算与 Chromium 的
`crx_file::id_util::GenerateIdForPath` 匹配：使用 SHA-256 对规范绝对路径的原始字节进行哈希（Windows 上使用原生 UTF-16LE 路径字节，且仅将小写驱动器字母转为大写），保留摘要的前 16 个字节，然后将十六进制数字
`0` 到 `f` 映射为字母 `a` 到 `p`。扩展 manifest 不包含
`key`；注册仅授权由经批准的 OpenClaw 所有真实路径派生出的精确 ID。

中继本身使用连接绑定的 HMAC 证明。每个 host 的持久密钥不会通过 URL、标头、WebSocket 子协议或应用帧发送。

## 故障排除

```bash
openclaw browser extension status --json
openclaw browser doctor --browser-profile chrome
openclaw doctor
```

- **未检测到扩展 ID：** 保持 Chrome 运行，重新运行 `extension install`，并且仅在命令提示原生引导已准备就绪并输出稳定路径后，使用 **Load unpacked**。
- **原生设置之前已加载扩展：** 重启 Chrome 一次，以清除其缓存的原生主机缺失状态，然后重新运行有序安装流程。
- **正在等待本地 OpenClaw：** 运行 `extension status`；安装或修复归属的原生主机。
- **已禁用自动设置：** 在 Settings 中启用，或点击 **Use local OpenClaw**。
- **需要手动设置：** 使用 Settings 进行高级配对流程。在 Windows 和仅扩展的远程 Gateway 设置中，这是预期行为。
- **中继不可用：** 确认 Gateway 或浏览器节点正在运行，然后运行 browser doctor。

请参阅 [Browser](/tools/browser)，了解完整的配置文件模型，以及托管的
`openclaw` 和 Chrome MCP `user` 配置文件。
