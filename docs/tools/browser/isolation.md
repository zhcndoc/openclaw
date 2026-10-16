---
summary: "托管配置文件隔离什么、选择哪个浏览器二进制文件以及控件 API 引用所在的位置"
title: "隔离和浏览器选择"
read_when:
  - "您需要知道托管浏览器与您自己的浏览器分开的内容"
  - "您需要每个平台的本地浏览器检测顺序"
  - "您正在寻找 HTTP 控件 API 参考"
---

## <a id="isolation-guarantees"></a> 隔离保证

- **专用用户数据目录**：绝不会触碰你的个人浏览器配置文件。
- **专用端口**：避免使用 `9222`，以防与开发工作流发生冲突。
- **稳定选项卡句柄**：`tabs`首先返回`suggestedTargetId`，然后返回稳定的`tabId`句柄，例如`t1`、可选标签和原始`targetId`。智能体应重复使用`suggestedTargetId`；原始 ID 仍可用于调试和兼容性。使用 `driver: "extension"` 配置的配置文件还可以为 Chrome WebExtensions API 调用返回运行时范围的数字 `webExtensionTabId`。对于其他驱动程序，它被省略，并且不得替换 OpenClaw 浏览器操作中的 `suggestedTargetId` 或 `tabId`。

## <a id="browser-selection"></a> 浏览器选择

在本地启动时，OpenClaw 会按以下顺序选择第一个可用的浏览器：

1. Chrome
2. Brave
3. 边缘
4. Chromium
5. Chrome 金丝雀

你可以通过 `browser.executablePath` 覆盖这一行为。

平台：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：检查 `/usr/bin`、`/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和 `/usr/lib/chromium-browser` 下的常见 Chrome/Brave/Edge/Chromium 位置，以及Playwright-在`PLAYWRIGHT_BROWSERS_PATH`或`$XDG_CACHE_HOME/ms-playwright`下管理Chromium（当`XDG_CACHE_HOME`未设置或为空时，默认为`~/.cache/ms-playwright`）。缓存路径使用Playwright的环境优先级，包括npm配置别名；相对路径从 `INIT_CWD` 或当前工作目录解析。 `PLAYWRIGHT_BROWSERS_PATH=0` 选择已安装的 Playwright 软件包的 `.local-browsers` 目录。
- Windows：检查常见安装位置。

## <a id="control-api-(optional)"></a><a id="control-api-optional"></a> Control API（可选）

用于脚本编写和调试时，Gateway 提供了一个小型的**仅回环可访问的 HTTP 控制 API**，以及对应的 `openclaw browser` CLI（快照、引用、等待增强、JSON 输出、调试工作流）。完整参考请见 [浏览器控制 API](/tools/browser-control)。
