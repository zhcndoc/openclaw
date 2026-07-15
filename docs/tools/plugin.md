---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - 安装或配置插件
  - 了解插件发现和加载规则
  - 使用与 Codex/Claude 兼容的插件包
title: "插件"
sidebarTitle: "快速开始"
doc-schema-version: 1
---

插件为 OpenClaw 扩展了通道、模型提供方、agent harness、工具、
技能、语音、实时转录、语音、媒体理解、生成、
网页抓取、网页搜索以及其他运行时能力。

使用此页面来安装插件、重启 Gateway、验证运行时已加载它，并排查常见的设置失败。仅含命令示例，请参见
[管理插件](/plugins/manage-plugins)。关于捆绑的、官方的外部插件以及仅源代码插件的生成清单，请参见
[插件清单](/plugins/plugin-inventory)。

## Requirements

- An available OpenClaw checkout or installation environment, and the `openclaw` CLI available
- Network access to the selected source (ClawHub, npm, or git host)
- Any plugin-specific credentials, configuration keys, or operating system tools mentioned in that plugin’s setup documentation
- Permission to reload or restart the Gateway that serves your channel

## 快速开始

<Steps>
  <Step title="查找插件">
    在 [ClawHub](/clawhub) 中搜索公开插件包：

    ```bash
    openclaw plugins search "calendar"
    ```

    ClawHub 是社区插件的主要发现入口。在启动切换期间，普通的裸包规格仍会从 npm 安装，除非它们匹配官方插件 id。与捆绑插件匹配的原始 `@openclaw/*` 规格会解析为该捆绑副本。当你需要特定来源时，请使用显式的来源前缀。

  </Step>

  <Step title="安装插件">
    ```bash
    # 来自 ClawHub。
    openclaw plugins install clawhub:<package>

    # 来自 npm。
    openclaw plugins install npm:<package>

    # 来自 git。
    openclaw plugins install git:github.com/<owner>/<repo>@<ref>

    # 来自本地开发检出目录。
    openclaw plugins install ./my-plugin
    openclaw plugins install --link ./my-plugin
    ```

    将插件安装视为运行代码。生产环境中建议使用固定版本以便可复现安装。ClawHub 包和 OpenClaw 的捆绑/官方目录属于受信任来源。新的任意 npm、git、本地路径/归档、`npm-pack:` 或市场来源，在非交互式安装中都需要 `--force`，并且应在你审查并信任该来源之后再使用。

  </Step>

  <Step title="配置并启用它">
    在 `plugins.entries.<id>.config` 下配置插件特定设置。
    如果插件尚未启用，请启用它：

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    如果设置了 `plugins.allow`，则在插件可以加载之前，已安装的插件 id 必须位于该列表中。`openclaw plugins install` 会将已安装的 id 添加到现有的 `plugins.allow` 列表中，并将相同的 id 从 `plugins.deny` 中移除，以便显式安装后的插件可以在重启后加载。

  </Step>

  <Step title="让 Gateway 重新加载">
    安装、更新或卸载插件代码都需要重启 Gateway。启用了配置重载的托管 Gateway 会检测到变更的插件安装记录并自动重启。否则，请手动重启：

    ```bash
    openclaw gateway restart
    ```

    启用/禁用更新配置和冷注册表。运行时检查仍然是验证活动运行时表面的最清晰证据。

  </Step>

  <Step title="验证运行时注册">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    使用 `--runtime` 来证明已注册的工具、hooks、服务、Gateway 方法或插件拥有的 CLI 命令。普通的 `inspect` 只会进行冷清单和注册表检查。

  </Step>
</Steps>

## Configuration

### Choose installation source

| Source      | Applicable scenarios                                                            | Example                                                        |
| ----------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ClawHub     | You want to use OpenClaw’s native discovery, scanning, version metadata, and installation prompts | `openclaw plugins install clawhub:<package>`                   |
| npm         | You need to use the npm registry or dist-tag workflow directly                    | `openclaw plugins install npm:<package>`                       |
| git         | You need branches, tags, or commits from a repository                            | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| local path  | You are developing or testing a plugin on the same machine                       | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | You are installing a Claude-compatible marketplace plugin                        | `openclaw plugins install <plugin> --marketplace <source>`     |

Bare package specifications have special compatibility behavior: bare names that match bundled plugin ids use that bundled source; bare names that match official external plugin ids use the official package directory; during startup migration, any other bare specs are installed via npm. Raw `@openclaw/*` specs that match bundled plugins are also resolved to the bundled copy first, then fall back to npm. Use `npm:@openclaw/<plugin>@<version>` to intentionally install the external npm package instead of the bundled copy. Use `clawhub:`, `npm:`, `git:`, or `npm-pack:` to deterministically select a source. For complete command conventions, see [`openclaw plugins`](/cli/plugins#install).

For npm installs, unpinned specs and `@latest` select the latest stable package whose declared compatibility matches this OpenClaw build. If npm’s current latest release declares an `openclaw.compat.pluginApi` or `openclaw.install.minHostVersion` higher than what this build supports, OpenClaw scans older stable versions and installs the newest version that best satisfies the requirement. Exact versions and explicit channel tags such as `@beta` stay locked to the selected package and fail if incompatible.

### Operator install policy

Before plugin installation or updates proceed, configure `security.installPolicy` to run a trusted local policy command. The policy receives metadata and the staged source path, and may allow or block the installation. It applies to both CLI and Gateway-backed install/update paths. Plugin `before_install` hooks run afterward, and only in OpenClaw processes that have plugin hooks loaded, so use `security.installPolicy` instead for operator-owned installation decisions. The deprecated `--dangerously-force-unsafe-install` flag is still accepted for compatibility, but it does nothing: it does not bypass the installation policy, and it does not bypass OpenClaw’s built-in plugin dependency blocklist.

For the shared `security.installPolicy` exec schema used by skills and plugins, see [Skills config](/tools/skills-config#operator-install-policy-securityinstallpolicy).

### Configure plugin policy

A common plugin configuration shape looks like this:

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    slots: { memory: "memory-core" },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Key policy rules:

- `plugins.enabled: false` disables all plugins and skips discovery/loading work. In this state, stale plugin references remain inactive; if you want to remove stale ids, re-enable plugins before running doctor cleanup.
- `plugins.deny` takes precedence over allow and per-plugin enablement settings.
- `plugins.allow` is an exclusive allowlist. Plugins outside the allowlist remain unavailable even if `tools.allow` includes `"*"`.
- `plugins.entries.<id>.enabled: false` disables a single plugin while preserving its configuration.
- `plugins.load.paths` adds explicit local plugin files or directories. Managed `plugins install` local paths must be plugin directories or archives; for standalone plugin files, use `plugins.load.paths`.
- Plugins from the workspace are disabled by default; explicitly enable them or add them to the allowlist before using local workspace code.
- Bundled plugins follow their built-in default-enabled/default-disabled metadata unless configuration explicitly overrides it.
- `plugins.slots.<slot>` (`memory` or `contextEngine`) selects a plugin for an exclusive category. Slot selection counts as explicit activation and will force-enable the chosen plugin for that slot even if it otherwise requires explicit enablement. `plugins.deny` and `plugins.entries.<id>.enabled: false` still block it.
- Bundled opt-in plugins can auto-activate when configuration names any of their owned surfaces, such as provider/model refs, channel configuration, CLI backend, or agent harness runtime.
- OpenAI-family Codex routing keeps provider and runtime plugin boundaries separate: legacy Codex model refs belong to legacy configuration that requires a doctor fix, while the bundled `codex` plugin owns Canonical `openai/*` agent refs, explicit `agentRuntime.id: "codex"`, and the Codex app-server runtime for legacy `codex/*` refs.

When `plugins.allow` is unset and a non-bundled plugin is auto-discovered from the workspace or global plugin root, startup logs
`plugins.allow is empty; discovered non-bundled plugins may auto-load: ...`
with the discovered plugin ids; for shorter lists, a minimal `plugins.allow` snippet is also provided. Before copying trusted plugins into `openclaw.json`, first run [`openclaw plugins list --enabled --verbose`](/cli/plugins#list)
or [`openclaw plugins inspect <id>`](/cli/plugins#inspect) for the listed plugin ids. The same trust pinning applies when diagnostics show a plugin loaded
`without install/load-path provenance`: inspect the plugin id first, then pin it in `plugins.allow` or reinstall it from a trusted source so OpenClaw records the installation provenance.

When configuration validation reports stale plugin ids, allowlist/tool mismatches, or legacy bundled plugin paths, run `openclaw doctor` or `openclaw doctor --fix`.

## 了解插件格式

OpenClaw 识别两种插件格式：

| 格式                    | 加载方式                                                                 | 适用场景                                                              |
| ----------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 原生 OpenClaw 插件       | `openclaw.plugin.json` 以及在进程内加载的运行时模块                       | 你正在安装或构建 OpenClaw 专用的运行时能力                           |
| 兼容包                   | 映射到 OpenClaw 插件清单的 Codex、Claude 或 Cursor 插件布局             | 你正在复用兼容的技能、命令、钩子或包元数据                           |

这两种格式都会出现在 `openclaw plugins list`、`openclaw plugins inspect`、
`openclaw plugins enable` 和 `openclaw plugins disable` 中。有关包兼容边界，请参见
[插件包](/plugins/bundles)；有关原生插件作者指南，请参见
[构建插件](/plugins/building-plugins)。

## 插件钩子

插件可以通过两种不同的 API 在运行时注册钩子：

- `api.on(...)`：用于运行时生命周期事件的类型化钩子。这是中间件、策略、消息重写、提示词塑形以及工具控制的首选接口。
- `api.registerHook(...)`：用于 [Hooks](/automation/hooks) 中描述的内部钩子系统。它主要用于较粗粒度的命令/生命周期副作用，以及与现有 HOOK 风格自动化的兼容。

快速规则：如果处理函数需要优先级、合并语义，或者阻止/取消行为，请使用类型化钩子。如果它只是响应 `command:new`、`command:reset`、`message:sent` 或类似的粗粒度事件，那么使用 `api.registerHook` 就可以了。

由插件管理的内部钩子会在 `openclaw hooks list` 中以 `plugin:<id>` 的形式出现。你不能通过 `openclaw hooks` 启用或禁用它们；应改为启用或禁用该插件。

## 验证活动 Gateway

`openclaw plugins list` and plain `openclaw plugins inspect` 读取冷配置、
清单和注册表状态。它们不能证明一个已经运行中的
Gateway 已导入相同的插件代码。

当某个插件看起来已经安装，但实时聊天流量没有使用它时：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

受管理的 Gateway 会在插件安装、更新和卸载导致插件源发生变化后自动重启。
在 VPS 或容器安装中，请确保任何手动重启都针对实际提供通道服务的 `openclaw gateway run` 子进程，
而不仅仅是包装器或守护进程。

## 故障排查

| 症状                                                        | 检查                                                                                                                                      | 修复                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 插件出现在 `plugins list` 中，但运行时钩子未执行  | 使用 `openclaw plugins inspect <id> --runtime --json`，并通过 `gateway status --deep --require-rpc` 确认当前活动的 Gateway             | 在安装、更新、配置或源代码变更后重启正在运行的 Gateway                               |
| 出现重复的 channel 或工具所有权诊断         | 运行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 检查每个疑似插件，并比较 channel/tool 所有权 | 禁用其中一个所有者、移除过期安装，或在有意替换时使用清单中的 `preferOver`      |
| 配置显示某个插件缺失                                | 查看 [插件清单](/plugins/plugin-inventory)，确认它是内置、官方外部插件，还是仅源代码提供                           | 安装外部包、启用内置插件，或移除过期配置                         |
| 安装期间配置无效                               | 阅读验证消息；如果提示为过期的插件状态，则运行 `openclaw doctor --fix`                                             | Doctor 可以通过禁用该条目并移除无效负载来隔离无效的插件配置     |
| 插件路径因可疑所有权或权限被阻止 | 在配置错误之前检查诊断信息                                                                                             | 修复文件系统所有权/权限，然后运行 `openclaw plugins registry --refresh`                    |
| `OPENCLAW_NIX_MODE=1` 阻止生命周期命令                | 确认该安装由 Nix 管理                                                                                                      | 在 Nix 源中更改插件选择，而不是使用插件变更命令                      |
| 运行时依赖导入失败                             | 检查该插件是通过 npm/git/ClawHub 安装，还是从本地路径加载                                                 | 运行 `openclaw plugins update <id>`，重新安装源，或自行安装本地插件依赖                      |

当过期的插件配置仍然指向一个已无法发现的 channel 插件时，配置验证会将该 channel 键从硬性失败降级为警告，因此 Gateway 启动仍可服务其他所有 channel。运行 `openclaw doctor --fix` 以移除过期的插件和 channel 条目。没有过期插件证据的未知 channel 键仍会使验证失败，因此拼写错误仍然可见。

对于有意的 channel 替换，首选插件应在 `channelConfigs.<channel-id>.preferOver` 中声明旧版或更低优先级插件的 id。如果两个插件都被显式启用，OpenClaw 会保留该请求，并报告重复的 channel/tool 诊断，而不会静默选择一个所有者。

如果某个已安装包报告它 `requires compiled runtime output for
TypeScript entry ...`，说明该包发布时没有包含 OpenClaw 在运行时所需的 JavaScript 文件。
请在发布者提供编译后的 JavaScript 后更新或重新安装，或者在此之前禁用/卸载该插件。

### 被阻止的插件路径所有权

如果诊断信息显示
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
并且验证随后出现 `plugin present but blocked`，说明 OpenClaw 发现插件文件的 Unix 用户所有权与加载它们的进程不同。
请保留插件配置不变；修复文件系统所有权，或以拥有状态目录的同一用户运行 OpenClaw。

对于 Docker 安装，官方镜像以 `node`（uid `1000`）运行，因此
宿主机绑定挂载的 OpenClaw 配置和工作区目录通常应归属于 uid `1000`：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果你有意将 OpenClaw 作为 root 运行，则改为修复受管理的插件根目录，
使其归属于 root：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

在修复所有权后，重新运行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持久化的插件注册表
与已修复的文件保持一致。

### 插件工具设置缓慢

如果 agent 回合在准备工具时似乎停滞，请启用跟踪日志
并检查插件工具工厂的耗时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要会列出总工厂耗时以及最慢的插件工具工厂，
包括插件 id、声明的工具名称、结果形状，以及该工具
是否为可选项。当单个工厂耗时至少 1s，或插件工具工厂准备总耗时至少 5s 时，慢行会被提升为警告。

OpenClaw 会缓存成功的插件工具工厂结果，以便对相同的有效请求上下文进行重复解析。
缓存键包含有效运行时配置、工作区和 agent id、沙箱策略、浏览器
设置、交付上下文、请求者身份以及所有权状态，因此依赖这些受信任字段的工厂会在上下文
变化时重新运行。如果耗时仍然很高，插件可能在返回其工具定义之前就执行了昂贵的工作。

如果某个插件在耗时上占主导，请检查其运行时注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将昂贵的依赖加载
移到工具执行路径之后，而不是放在工具工厂内部执行。

有关依赖根、包元数据校验、注册表记录、启动
重载行为和旧版清理，请参见
[插件依赖解析](/plugins/dependency-resolution)。

## 相关内容

- [管理插件](/plugins/manage-plugins) - 用于 list、install、update、uninstall 和 publish 的命令示例
- [`openclaw plugins`](/cli/plugins) - 完整的 CLI 参考
- [插件清单](/plugins/plugin-inventory) - 生成的内置和外部插件列表
- [插件参考](/plugins/reference) - 按插件生成的参考页面
- [社区插件](/plugins/community) - ClawHub 发现和文档 PR 政策
- [插件依赖解析](/plugins/dependency-resolution) - 安装根、注册表记录和运行时边界
- [构建插件](/plugins/building-plugins) - 原生插件编写指南
- [插件 SDK 概览](/plugins/sdk-overview) - 运行时注册、hooks 和 API 字段
- [插件清单](/plugins/manifest) - 清单和包元数据
