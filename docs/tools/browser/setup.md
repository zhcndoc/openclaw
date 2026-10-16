---
summary: "Quick start 命令、插件启用、代理工具策略和缺失命令修复"
title: "浏览器设置"
read_when:
  - "您是第一次启动 OpenClaw 浏览器"
  - "代理报告浏览器工具不可用"
  - "升级后缺少`openclaw browser`命令"
---

## <a id="quick-start"></a> 快速开始

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

“浏览器已禁用”表示插件或`browser.enabled`已关闭；参见[配置](/tools/browser/configuration#configuration)和[插件控制](#plugin-control)。

浏览器控制错误称为记录的策略拒绝或插件加载失败。如果 `browser` 被排除在 `plugins.allow` 之外，则在运行 `openclaw plugins enable browser` 之前将其添加到现有列表中；仅重新启动无法修复该策略。按照错误的启用或医生命令进行操作。如果未记录可用性原因，请运行 `openclaw doctor` 并检查网关日志。

如果 `openclaw browser` 完全缺失，或者代理提示浏览器工具不可用，请跳到 [缺少 browser 命令或工具](#missing-browser-command-or-tool)。

## <a id="plugin-control"></a> 插件控制

默认的 `browser` 工具是一个内置插件。可将其禁用，以替换为另一个注册相同 `browser` 工具名称的插件：

```json5
{
  plugins: {
    entries: {
      browser: {
        enabled: false,
      },
    },
  },
}
```

默认配置需要同时设置 `plugins.entries.browser.enabled` **以及** `browser.enabled=true`。仅禁用插件会将 `openclaw browser` CLI、`browser.request` 网关方法、代理工具和控制服务作为一个整体移除；你的 `browser.*` 配置会保持不变，以便替换使用。

配置文件、启动设置、快照默认值、选项卡清理和 `browser.allowSystemProfileImport` 热重载。进口许可变更适用于新进口；已在进行的导入将保留其准入。浏览器启用、评估、SSRF 策略和扩展中继设置需要重新启动网关。参见[配置热重载](/gateway/configuration#config-hot-reload)。

## <a id="agent-guidance"></a> 代理指南

工具配置说明：`tools.profile: "coding"` 包括 `web_search` 和 `web_fetch`，但不包括完整的 `browser` 工具。要让代理或派生的子代理使用浏览器自动化，请在配置文件阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

对于单个代理，请使用 `agents.entries.*.tools.alsoAllow: ["browser"]`。 仅有 `tools.subagents.tools.allow: ["browser"]` 还不够，因为子代理策略是在配置文件过滤之后应用的。

浏览器插件提供两级代理指导：

- `browser` 工具描述带有紧凑的始终可用合同：选择正确的配置文件，将引用保留在同一选项卡上，使用 `tabId`/labels 进行选项卡定位，并加载浏览器技能以进行多步骤工作。
- 捆绑的`browser-automation`技能具有更长的操作循环：首先检查status/tabs，标记任务选项卡，执行前快照，UI更改后重新快照，恢复过时的引用一次，并以手动操作而不是猜测的方式报告login/2FA/captcha或camera/microphone阻止者。

当插件启用时，插件捆绑的技能会列在代理可用的技能中。完整的技能说明按需加载，因此常规轮次不会消耗全部 token 成本。

对于页面文本，请使用限定于选择器范围的快照，或使用仅返回相关文本或结构化数据的 `act:evaluate`，然后让当前代理模型基于这一受限结果进行推理。请使用高效的快照来发现控件和操作；它们会有意省略大部分不可交互的正文内容。

## <a id="missing-browser-command-or-tool"></a> 缺少浏览器命令或工具

如果升级后 `openclaw browser` 变成未知命令、`browser.request` 缺失，或者代理报告浏览器工具不可用，通常原因是 `plugins.allow` 列表中未包含 `browser`，且不存在根级 `browser` 配置块。请添加它：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根级 `browser` 块（`browser` 下的任意键，例如 `browser.enabled=true` 或 `browser.profiles.<name>`）会在即使 `plugins.allow` 限制较严格的情况下也激活内置 browser 插件，这与内置 channel 配置行为一致。`plugins.entries.browser.enabled=true` 和 `tools.alsoAllow: ["browser"]` 本身不能替代 allowlist 成员资格。直接移除 `plugins.allow` 也会恢复默认设置。
