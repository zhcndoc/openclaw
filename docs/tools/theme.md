---
summary: "让代理选择插件主题或创建个人 OpenClaw 主题"
title: "主题"
sidebarTitle: "主题"
read_when:
  - "您希望代理更改您的 OpenClaw 主题"
  - "您想要创建一个自定义主题并在一次调用中应用它"
  - "您需要主题目录和配置文件选择合同"
---

`theme` 工具可让代理列出、检查、选择和创建 OpenClaw 外观主题。设置和代理使用相同的内置、插件和个人主题目录。主题描述解释了它们的调色板、排版和特征，以便代理可以从请求中选择主题，例如“使其看起来像外星飞船”

主题品牌是装饰性的，适用于 Control UI，而不是 CLI 或本机应用程序。它不会重写技术命令文本、包路径、身份验证协议或法律和版权声明。在加载个人资料和主题目录之前，匿名冷登录无法使用经过身份验证的人员的主题；在此之前，只有现有的本地记住的吉祥物后备可用。这些字段不添加网关配置选项或配置迁移。

该工具可在编码和消息传递配置文件以及 `group:ui` 中使用。它不需要连接的浏览器。个人变更需要可信的参与者资料。

CRT和Phosphor使用中性端子标记、点工作指示器，并且没有Lobsterdex。它们保留 OpenClaw 名称和帮助链接。其他内置主题，包括 Claw，保留了现有的吉祥物和品牌。隐藏 Lobsterdex 不会删除浏览器的集合或保存的图标首选项。

## <a id="select-a-theme"></a> 选择主题

请代理列出可用的主题或为您选择一个。 `list` 包括当前选择，因此选择主题通常需要两次调用：

```json
{ "action": "list" }
```

```json
{ "action": "set", "id": "space-pack/xenovessel", "mode": "dark" }
```

使用 `list` 返回的 ID。插件 ID 为 `<pluginId>/<themeId>`；个人主题使用`user/<slug>`。

## <a id="actions"></a> 操作

| 操作   | 输入                                       | 结果                                                                                                                                 |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `list`   | 无                                         | 可用的主题、描述、支持的模式、来源和当前选择。                                                   |
| `get`    | 可选`id`                                | 当前选择和请求的主题，包括其可编辑定义（如果可用）。如果没有 `id`，则检查当前主题。 |
| `set`    | `id` and/or `mode`                           | 保存配置文件覆盖并返回结果选择。                                                                           |
| `import` | `id`、`definition`；可选 `apply`、`mode` | 保存个人主题。 `apply: true` 在同一调用中选择它。                                                                     |

每个操作都接受可选的 `user`，即来自 Control UI 消息对话上下文的人员验证的 `requester_profile.id`。当多人转向时，需要`user`；智能体选择询问的人或不清楚的情况询问他们。只能选择回合的所有者或接受的参与者。读取，包括`list`和`get`中的当前选择，使用该人的个人资料；更改仅保存到该配置文件。如果他们的访问权限发生了变化，他们必须再次询问。

`mode` 是 `system`、`light` 或 `dark`。 `set` 接受 `id` 或 `mode` 的 `null`，以清除该配置文件覆盖并继承网关设置。仅设置一个字段会在兼容时保留其他覆盖。如果先前的显式模式无法呈现它，则选择或应用单模式主题也会选择其支持的模式。明确请求的不兼容模式被拒绝； `system` 遵循可用调色板：

```json
{ "action": "set", "id": null, "mode": null }
```

`set`和`import`持久化成功后返回`application: "saved"`。响应已经包含结果状态；不需要额外的 `get`。保存并不断言特定浏览器已呈现主题。

返回的`current.mode`是保存的首选项。 `current.effectiveMode` 在无需浏览器即可确定时报告呈现的变体；有两个调色板和 `system` 模式，由设备决定。插件重新加载可以更改可用的变体，而无需重写任何人保存的首选项。

## <a id="create-and-apply-a-personal-theme"></a> 创建并应用个人主题

`import` 接受最多 64 个字符的小写段，使用字母、数字、连字符和下划线。重新导入相同的 slug 会更新该个人主题。 `apply` 默认为 `false`。

定义需要名称、简短描述和至少一个完整的 `light` 或 `dark` 调色板。每个调色板使用如下所示的语义颜色，并且可能包括 `font-sans` 和 `font-mono`。使用 CSS 颜色值，例如十六进制、`rgb()`、`hsl()` 或 `oklch()`。字体系列描述本地可用的字体；定义无法加载外部样式表或资源。

定义还可以提供这些可选的表示字段，由内置、插件和个人主题共享：

- `mascot`：`"claw"`（默认）或`"none"`。 `"none"` 默认为中性提示标记，并隐藏常驻龙虾和来访龙虾陌生人。当 Lobster 访问启用时，普通生物仍然可以跨越作曲家壁架；主题不会改变该切换。
- `brandName`：1-80 个可打印字符的显示名称，在保存前进行修剪。省略它以保留“OpenClaw”。这是外观文本，而不是对代理身份或产品配置的更改。
- `brandIcon`：`"claw"` 或中性 `"mark"`。省略如下`mascot`：爪为`"claw"`，标记为`"none"`。插件主题还可以选择声明的图标艺术品 ID。
- `workingIndicator`：`"claw"`、`"dots"`、`"brand"`（所选品牌图标）或`"none"`。省略使用爪作为爪吉祥物，点作为没有吉祥物。此选择与长期等待短语无关。
- `lobsterdex` 和 `communityLinks`：控制各自导航条目的布尔值。两者都默认为 `true`，独立于 `mascot`。隐藏条目不会删除发现或更改访问权限。
- `workingPhrases`：最多 24 个文字状态短语，每个被修剪为 1-24 个字符，修剪后没有控制字符或重复。这些创作的字符串不会被翻译。省略该字段以使用默认的异想天开的词汇，或将其设置为 `[]` 以隐藏长时间等待的短语。
- `critters`：内置 `"penguin"` 和 `"fedora"` 目录中最多 8 个唯一 ID。当启用 Lobster 访问时，这些会将偶尔的访问者添加到普通作曲家壁架流量中。省略该字段或使用`[]`不添加；未知 ID 和重复项将被拒绝。
- `avatarHat`：`"fedora"`、`"crown"`、`"santa"`、`"party"` 或 `"pumpkin"` 为特工头像添加偶尔的装饰帽子。对于没有主题提供的头像帽子，请省略该字段。

使用一致的 CSS 分隔符：`rgb(20 30 40 / 50%)` 或 `rgba(20, 30, 40, 0.5)`。现代函数（例如 `oklch()`）在不透明度之前使用组件和 `/` 之间的空格。字体列表使用逗号分隔的姓氏；引用包含标点符号或以数字开头的名称，例如 `"123 Font", monospace`。还要引用包含 CSS 关键字的名称，例如 `"Foo serif"`。在保存主题之前，格式错误的颜色和不平衡的字体引号将被拒绝。

此示例在一次调用中创建并激活深色主题：

```json
{
  "action": "import",
  "id": "xenovessel",
  "apply": true,
  "mode": "dark",
  "definition": {
    "name": "Xenovessel",
    "description": "Indigo spacecraft surfaces, lime controls, cyan highlights, and monospace typography.",
    "mascot": "none",
    "brandName": "Mission Control",
    "brandIcon": "mark",
    "workingIndicator": "dots",
    "lobsterdex": false,
    "communityLinks": false,
    "workingPhrases": ["Navigating", "Calibrating", "Scanning"],
    "critters": ["penguin", "fedora"],
    "avatarHat": "fedora",
    "dark": {
      "background": "#090818",
      "foreground": "#e8f2ff",
      "card": "#12112b",
      "card-foreground": "#e8f2ff",
      "popover": "#171533",
      "popover-foreground": "#e8f2ff",
      "primary": "#c7ff3d",
      "primary-foreground": "#172300",
      "secondary": "#28234a",
      "secondary-foreground": "#e8f2ff",
      "muted": "#211e39",
      "muted-foreground": "#aca6cc",
      "accent": "#4ce9ef",
      "accent-foreground": "#042b30",
      "destructive": "#ff698b",
      "destructive-foreground": "#290711",
      "border": "#40385e",
      "input": "#40385e",
      "ring": "#c7ff3d",
      "font-sans": "ui-monospace, monospace",
      "font-mono": "ui-monospace, monospace"
    }
  }
}
```

名称限制为 80 个字符，描述限制为 320 个字符，规范化定义限制为 4096 UTF-8 字节。网关在保存定义之前验证定义。个人主题不需要安装插件或在其他地方发布定义。

## <a id="plugin-themes-and-hot-reload"></a> 插件主题和热重载

插件通过其清单以声明方式贡献主题定义。个人主题仅使用内置品牌图标、帽子和小动物目录 ID；插件主题还可以引用在 [ 插件清单 ](/plugins/manifest/surfaces#themes) 中声明的自己的 SVG 艺术品 ID，并且它们的清单可以声明浅色和深色画布背景。定义从不包含图稿标记或外部 URL。当插件启用、禁用或重新加载时，共享目录会更新；不需要重新启动网关。代理继续使用相同的 `theme` 工具，而不是为每个插件接收新工具。

如果选定的插件主题不可用，结果将包括 `current.requestedId`，而 `current.id` 标识可以呈现的后备。重新启用插件或选择其他主题。列出目录不执行插件主题代码。

## <a id="related"></a> 相关内容

- [插件主题声明](/plugins/manifest/surfaces#themes)
- [管理插件](/plugins/manage-plugins)
- [控制 UI](/web/control-ui)
- [筛选工具](/tools/screen)
