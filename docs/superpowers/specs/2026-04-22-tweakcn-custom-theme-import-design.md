# Tweakcn 自定义主题导入设计

状态：已于 2026-04-22 在终端中批准

## 概要

新增且仅新增一个浏览器本地的自定义 Control UI 主题槽位，该槽位可以从 tweakcn 分享链接导入。现有内置主题家族保持为 `claw`、`knot` 和 `dash`。当导入的 tweakcn 载荷同时包含明暗两套 token 集时，新的 `custom` 家族会像普通的 OpenClaw 主题家族一样工作，并支持 `light`、`dark` 和 `system` 模式。

导入的主题仅存储在当前浏览器配置文件中，与 Control UI 的其余设置一起保存。它不会写入 gateway 配置，也不会在设备或浏览器之间同步。

## 问题

当前 Control UI 主题系统被闭合在三个硬编码主题家族之内：

- `ui/src/ui/theme.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/styles/base.css`

用户可以在内置家族和模式变体之间切换，但不能在不编辑仓库 CSS 的情况下引入来自 tweakcn 的主题。这里需要的结果比通用主题系统更小：保留三个内置主题，并增加一个用户可控制的导入槽位，该槽位可以通过 tweakcn 链接替换。

## 目标

- 保持现有内置主题家族不变。
- 只添加一个导入的自定义槽位，不做主题库。
- 接受 tweakcn 分享链接或直接的 `https://tweakcn.com/r/themes/{id}` URL。
- 仅将导入主题持久化到浏览器本地存储中。
- 让导入槽位与现有 `light`、`dark` 和 `system` 模式控制协同工作。
- 保持失败行为安全：错误导入绝不会破坏当前激活的 UI 主题。

## 非目标

- 不做多主题库，也不做浏览器本地的导入列表。
- 不做 gateway 侧持久化或跨设备同步。
- 不做任意 CSS 编辑器或原始主题 JSON 编辑器。
- 不自动加载来自 tweakcn 的远程字体资源。
- 不尝试支持只暴露单一模式的 tweakcn 载荷。
- 不做超出 Control UI 所需接缝范围之外的全仓库主题重构。

## 已作出的用户决定

- 保留三个内置主题。
- 增加一个由 tweakcn 驱动的导入槽位。
- 将导入主题存储在浏览器中，而不是 gateway 配置中。
- 为导入槽位支持 `light`、`dark` 和 `system`。
- 允许用下一次导入覆盖自定义槽位，这也是预期行为。

## 推荐方案

在 Control UI 主题模型中新增第四个主题家族 id，`custom`。只有在存在有效的 tweakcn 导入时，`custom` 家族才可被选中。导入载荷会被规范化为 OpenClaw 特定的自定义主题记录，并与其他 UI 设置一起存储在浏览器本地存储中。

运行时，OpenClaw 会渲染一个受管理的 `<style>` 标签，用于定义已解析的自定义 CSS 变量块：

```css
:root[data-theme="custom"] { ... }
:root[data-theme="custom-light"] { ... }
```

这样可以将自定义主题变量限定在 `custom` 家族内，并避免将内联 CSS 变量泄漏到内置家族中。

## 架构

### 主题模型

更新 `ui/src/ui/theme.ts`：

- 将 `ThemeName` 扩展为包含 `custom`。
- 将 `ResolvedTheme` 扩展为包含 `custom` 和 `custom-light`。
- 扩展 `VALID_THEME_NAMES`。
- 更新 `resolveTheme()`，使 `custom` 复用现有家族行为：
  - `custom + dark` -> `custom`
  - `custom + light` -> `custom-light`
  - `custom + system` -> 基于系统偏好返回 `custom` 或 `custom-light`

不为 `custom` 添加任何旧别名。

### 持久化模型

在 `ui/src/ui/storage.ts` 中为 `UiSettings` 持久化扩展一个可选的自定义主题载荷：

- `customTheme?: ImportedCustomTheme`

推荐存储结构：

```ts
type ImportedCustomTheme = {
  sourceUrl: string;
  themeId: string;
  label: string;
  importedAt: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};
```

说明：

- `sourceUrl` 存储用户归一化后的原始输入。
- `themeId` 是从 URL 中提取的 tweakcn theme id。
- `label` 在存在时取 tweakcn 的 `name` 字段，否则为 `Custom`。
- `light` 和 `dark` 已经是规范化后的 OpenClaw token 映射，而不是原始 tweakcn 载荷。
- 导入载荷与其他浏览器本地设置一同存放，并序列化到同一个本地存储文档中。
- 如果加载时存储的自定义主题数据缺失或无效，则忽略该载荷；若持久化的家族为 `custom`，则回退到 `theme: "claw"`。

### 运行时应用

在 Control UI 运行时新增一个窄范围的自定义主题样式管理器，归属位置接近 `ui/src/ui/app-settings.ts` 和 `ui/src/ui/theme.ts`。

职责：

- 在 `document.head` 中创建或更新一个稳定的 `<style id="openclaw-custom-theme">` 标签。
- 仅在存在有效的自定义主题载荷时输出 CSS。
- 在载荷被清除时移除样式标签内容。
- 将内置家族 CSS 保持在 `ui/src/styles/base.css` 中；不要把导入 token 拼接进已提交的样式表。

当设置被加载、保存、导入或清除时，这个管理器都会运行。

### 明亮模式选择器

实现时应优先使用 `data-theme-mode="light"` 来做跨家族的明亮样式，而不是对 `custom-light` 进行特殊处理。如果某个现有选择器固定为 `data-theme="light"`，并且需要作用于所有明亮家族，则应在本次工作中将其扩宽。

## 导入体验

更新 `ui/src/ui/views/config.ts` 中的 `Appearance` 部分：

- 在 `Claw`、`Knot` 和 `Dash` 旁边添加一个 `Custom` 主题卡片。
- 当不存在已导入的自定义主题时，将该卡片显示为禁用状态。
- 在主题网格下方添加一个导入面板，其中包含：
  - 一个用于 tweakcn 分享链接或 `/r/themes/{id}` URL 的文本输入框
  - 一个 `Import` 按钮
  - 当已存在自定义载荷时的 `Replace` 路径
  - 当已存在自定义载荷时的 `Clear` 操作
- 当存在载荷时，显示导入主题标签和来源主机。
- 如果当前激活主题是 `custom`，导入替换内容后会立即生效。
- 如果当前激活主题不是 `custom`，则导入只会先保存新的载荷，直到用户选择 `Custom` 卡片。

`ui/src/ui/views/config-quick.ts` 中的快速设置主题选择器也应只在存在载荷时显示 `Custom`。

## URL 解析与远程获取

浏览器导入路径接受：

- `https://tweakcn.com/themes/{id}`
- `https://tweakcn.com/r/themes/{id}`

实现时应将两种形式归一化为：

- `https://tweakcn.com/r/themes/{id}`

然后浏览器直接获取归一化后的 `/r/themes/{id}` 端点。

外部载荷应使用严格的 schema 校验。由于这是不受信任的外部边界，推荐使用 zod schema。

必需的远程字段：

- 顶层 `name`，可选字符串
- `cssVars.theme`，可选对象
- `cssVars.light`，对象
- `cssVars.dark`，对象

如果 `cssVars.light` 或 `cssVars.dark` 任意一个缺失，则拒绝导入。这个约束是有意为之：已批准的产品行为要求完整的模式支持，而不是对缺失侧进行尽力合成。

## Token 映射

不要机械地镜像 tweakcn 变量。应将一个受限子集规范化为 OpenClaw token，并在辅助函数中推导其余部分。

### 直接导入的 token

从每个 tweakcn 模式块中导入：

- `background`
- `foreground`
- `card`
- `card-foreground`
- `popover`
- `popover-foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `muted`
- `muted-foreground`
- `accent`
- `accent-foreground`
- `destructive`
- `destructive-foreground`
- `border`
- `input`
- `ring`
- `radius`

从共享的 `cssVars.theme` 中导入（如果存在）：

- `font-sans`
- `font-mono`

如果某个模式块覆盖了 `font-sans`、`font-mono` 或 `radius`，则以该模式本地值为准。

### 为 OpenClaw 推导的 token

导入器会基于导入的基础颜色推导 OpenClaw 专用变量：

- `--bg-accent`
- `--bg-elevated`
- `--bg-hover`
- `--panel`
- `--panel-strong`
- `--panel-hover`
- `--chrome`
- `--chrome-strong`
- `--text`
- `--text-strong`
- `--chat-text`
- `--muted`
- `--muted-strong`
- `--accent-hover`
- `--accent-muted`
- `--accent-subtle`
- `--accent-glow`
- `--focus`
- `--focus-ring`
- `--focus-glow`
- `--secondary`
- `--secondary-foreground`
- `--danger`
- `--danger-muted`
- `--danger-subtle`

推导规则应放在一个纯辅助函数中，以便单独测试。精确的颜色混合公式属于实现细节，但该辅助函数必须满足两个约束：

- 保持可读性对比度，尽量接近导入主题的意图
- 对相同的导入载荷产生稳定输出

### 在 v1 中忽略的 token

以下 tweakcn token 在第一版中会被有意忽略：

- `chart-*`
- `sidebar-*`
- `font-serif`
- `shadow-*`
- `tracking-*`
- `letter-spacing`
- `spacing`

这样可以将范围限制在当前 Control UI 实际需要的 token 上。

### 字体

如果存在则导入字体栈字符串，但 OpenClaw 在 v1 中不会加载远程字体资源。如果导入的字体栈引用了浏览器中不可用的字体，则按正常回退行为处理。

## 失败行为

错误导入必须以关闭式失败。

- 无效的 URL 格式：显示行内校验错误，不执行获取。
- 不支持的主机或路径形状：显示行内校验错误，不执行获取。
- 网络失败、非 OK 响应或 JSON 格式错误：显示行内错误，保持当前已存储载荷不变。
- schema 失败或缺少 light/dark 块：显示行内错误，保持当前已存储载荷不变。
- Clear 操作：
  - 移除已存储的自定义载荷
  - 移除受管理的自定义样式标签内容
  - 如果当前激活的是 `custom`，则将主题家族切回 `claw`
- 首次加载时存储的自定义载荷无效：
  - 忽略已存储载荷
  - 不输出自定义 CSS
  - 如果持久化的主题家族是 `custom`，则回退到 `claw`

任何时候，失败的导入都不应让当前文档残留部分应用的自定义 CSS 变量。

## 实现中预期修改的文件

主要文件：

- `ui/src/ui/theme.ts`
- `ui/src/ui/storage.ts`
- `ui/src/ui/app-settings.ts`
- `ui/src/ui/views/config.ts`
- `ui/src/ui/views/config-quick.ts`
- `ui/src/styles/base.css`

可能新增的辅助文件：

- `ui/src/ui/custom-theme.ts`
- `ui/src/ui/custom-theme-import.ts`

测试：

- `ui/src/ui/app-settings.test.ts`
- `ui/src/ui/storage.node.test.ts`
- `ui/src/ui/views/config.browser.test.ts`
- 新增针对 URL 解析和载荷规范化的定向测试

## 测试

最低实现覆盖范围：

- 将 share-link URL 解析为 tweakcn theme id
- 将 `/themes/{id}` 和 `/r/themes/{id}` 规范化为 fetch URL
- 拒绝不支持的主机和格式错误的 id
- 验证 tweakcn payload 的形状
- 将有效的 tweakcn payload 映射为规范化的 OpenClaw 浅色和深色 token maps
- 在浏览器本地设置中加载和保存自定义 payload
- 为 `light`、`dark` 和 `system` 解析 `custom`
- 当不存在 payload 时禁用 `Custom` 选项
- 当 `custom` 已经处于激活状态时，立即应用导入的主题
- 当当前自定义主题被清除时，回退到 `claw`

手动验证目标：

- 从 Settings 导入一个已知的 tweakcn 主题
- 在 `light`、`dark` 和 `system` 之间切换
- 在 `custom` 和内置主题族之间切换
- 重新加载页面并确认导入的自定义主题仍然保存在本地

## 发布说明

此功能刻意保持较小范围。如果用户之后提出需要多个导入主题、重命名、导出或跨设备同步，请将其视为后续设计。不要在此实现中预先构建主题库抽象。
