---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
sidebarTitle: "快速开始"
doc-schema-version: 1
---

插件为 OpenClaw 扩展了通道、模型提供方、agent harness、工具、
技能、语音、实时转录、语音、媒体理解、生成、
网页抓取、网页搜索以及其他运行时能力。

当你想要安装插件、重启 Gateway、验证运行时是否已加载它，并排查常见
配置失败时，请使用本页。仅查看命令示例，请参见 [管理插件](/plugins/manage-plugins)。
要查看内置、官方外部和仅源码插件的完整生成清单，请参见
[插件清单](/plugins/plugin-inventory)。

## 需求

在安装插件之前，请确保你具备：

- 一个已检出或已安装的 OpenClaw 环境，并可使用 `openclaw` CLI
- 可访问所选来源的网络连接，例如 ClawHub、npm 或 git 主机
- 该插件安装文档中列出的任何插件专用凭据、配置键或操作系统工具
- 重新加载或重启为你的通道提供服务的 Gateway 的权限

## 快速开始

<Steps>
  <Step title="查找插件">
    在 [ClawHub](/clawhub) 中搜索公开插件包：

    ```bash
    openclaw plugins search "calendar"
    ```

    ClawHub 是社区插件的主要发现入口。在发布切换期间，普通的裸包规范
    仍会从 npm 安装。当你需要特定来源时，请使用显式前缀。

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

    请将插件安装视为运行代码。若你需要可复现的生产环境安装，优先使用固定版本。

  </Step>

  <Step title="配置并启用它">
    在 `plugins.entries.<id>.config` 下配置插件专用设置。
    如果插件尚未启用，请启用它：

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    如果你的配置使用了严格的 `plugins.allow` 列表，则在插件能够加载之前，
    该已安装插件的 id 必须存在于其中。
    `openclaw plugins install` 会把已安装的 id 添加到现有的 `plugins.allow` 列表中，
    并从 `plugins.deny` 中移除同一 id，以便显式安装的插件在重启后可以加载。

  </Step>

  <Step title="让 Gateway 重新加载">
    安装、更新或卸载插件代码需要重启 Gateway。
    当已管理的 Gateway 正在运行且启用了配置重载时，OpenClaw 会检测到已更改的插件安装记录并自动重启 Gateway。
    如果 Gateway 未受管理或禁用了重载，请手动重启：

    ```bash
    openclaw gateway restart
    ```

    启用和禁用操作会更新配置并刷新冷态注册表。
    运行时检查仍然是验证活动运行时表面的最清晰路径。

  </Step>

  <Step title="验证运行时注册">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    当你需要证明已注册的工具、钩子、服务、Gateway 方法或插件拥有的 CLI 命令时，
    使用 `--runtime`。普通的 `inspect` 只是冷态清单和注册表检查。

  </Step>
</Steps>

## 配置

### 选择安装来源

| 来源        | 适用场景                                                                       | 示例                                                        |
| ----------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| ClawHub     | 你希望使用 OpenClaw 原生的发现、扫描、版本元数据和安装提示                        | `openclaw plugins install clawhub:<package>`                   |
| npm         | 你需要直接使用 npm 注册表或 dist-tag 工作流                                      | `openclaw plugins install npm:<package>`                       |
| git         | 你需要仓库中的分支、标签或提交                                                 | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| local path  | 你正在同一台机器上开发或测试插件                                               | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | 你正在安装一个兼容 Claude 的 marketplace 插件                                   | `openclaw plugins install <plugin> --marketplace <source>`     |

裸包规范具有特殊的兼容性行为。如果裸名称匹配某个内置插件 id，OpenClaw 会使用该内置来源。
如果它匹配某个官方外部插件 id，OpenClaw 会使用官方包目录。其他普通裸包规范在发布切换期间
通过 npm 安装。当你需要确定性的来源选择时，请使用 `clawhub:`、`npm:`、`git:` 或
`npm-pack:`。完整命令契约请参见 [`openclaw plugins`](/cli/plugins#install)。

### 配置插件策略

常见的插件配置形状如下：

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

关键策略规则：

- `plugins.enabled: false` 会禁用所有插件，并跳过插件发现/加载工作。处于此状态时，陈旧的插件引用不会起作用；当你希望移除陈旧 id 时，请在运行 doctor 清理之前重新启用插件。
- `plugins.deny` 优先于 allow 和单个插件启用状态。
- `plugins.allow` 是一个排他性允许列表。即使 `tools.allow` 包含 `"*"`，允许列表之外的插件拥有工具仍然不可用。
- `plugins.entries.<id>.enabled: false` 会禁用某一个插件，同时保留其配置。
- `plugins.load.paths` 用于添加显式的本地插件文件或目录。
- 来自 workspace 的插件默认是禁用的；在使用本地 workspace 代码前，请显式启用它们或将它们加入允许列表。
- 内置插件遵循其内建的默认启用/默认禁用元数据，除非配置显式覆盖它们。
- `plugins.slots.<slot>` 会为 memory 和 context engines 等互斥类别选择一个插件。槽位选择会通过计为显式激活来强制启用该槽位所选中的插件；即使在原本需要显式启用的情况下，它也可以加载。`plugins.deny` 和 `plugins.entries.<id>.enabled: false` 仍然会阻止它。
- 内置的可选启用插件可以在配置命名了它们拥有的某个表面时自动激活，例如 provider/model ref、channel config、CLI backend 或 agent harness runtime。
- OpenAI 系列 Codex 路由会将 provider 和 runtime 插件边界分开：`openai-codex/*` 是旧式 OpenAI-provider 配置，而内置的 `codex` 插件拥有 canonical `openai/*` agent refs、显式 `agentRuntime.id: "codex"` 以及旧式 `codex/*` refs 的 Codex app-server runtime。

当配置校验报告陈旧插件 id、allowlist/工具不匹配或旧的内置插件路径时，请运行
`openclaw doctor` 或 `openclaw doctor --fix`。

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

## 验证活动 Gateway

`openclaw plugins list` 和普通的 `openclaw plugins inspect` 读取的是冷态配置、
清单和注册表状态。它们不能证明已经运行的 Gateway 是否导入了相同的插件代码。

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
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 插件出现在 `plugins list` 中，但运行时钩子不执行               | 使用 `openclaw plugins inspect <id> --runtime --json`，并通过 `gateway status --deep --require-rpc` 确认活动 Gateway                      | 在安装、更新、配置或源代码变更后重启正在运行的 Gateway                                                   |
| 出现重复的通道或工具所有权诊断                                   | 运行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 检查每个可疑插件，并比较通道/工具所有权                      | 禁用其中一个所有者，移除陈旧安装，或在有意替换时使用清单中的 `preferOver`                                |
| 配置显示某个插件缺失                                           | 查看 [插件清单](/plugins/plugin-inventory) 以确认它是内置、官方外部还是仅源码插件                            | 安装外部包、启用内置插件，或移除陈旧配置                                                                  |
| 安装期间配置无效                                               | 读取校验消息；当它指向陈旧插件状态时，运行 `openclaw doctor --fix`                                              | doctor 可以通过禁用该条目并移除无效负载来隔离无效的插件配置                                              |
| 插件路径因可疑所有权或权限被阻止                                | 在配置错误之前检查诊断信息                                                                                         | 修复文件系统所有权/权限，然后运行 `openclaw plugins registry --refresh`                                 |
| `OPENCLAW_NIX_MODE=1` 阻止生命周期命令                          | 确认该安装由 Nix 管理                                                                                               | 在 Nix 源中更改插件选择，而不是使用插件变更命令                                                           |
| 运行时依赖导入失败                                             | 检查插件是通过 npm/git/ClawHub 安装，还是从本地路径加载                                                         | 运行 `openclaw plugins update <id>`、重新安装该来源，或自行安装本地插件依赖                               |

当陈旧的插件配置仍然引用一个不再可发现的通道插件时，Gateway 启动会跳过该插件支持的通道，
而不是阻止其他所有通道。运行 `openclaw doctor --fix` 可移除陈旧的插件和通道条目。
没有陈旧插件证据的未知通道键仍然会校验失败，以便拼写错误保持可见。

对于有意的通道替换，首选插件应声明
`channelConfigs.<channel-id>.preferOver`，并指向旧的或优先级更低的
插件 id。如果两个插件都显式启用，OpenClaw 会保留该请求，并报告重复的通道或工具诊断，
而不是静默选择某一个所有者。

如果某个已安装包报告它 `requires compiled runtime output for
TypeScript entry ...`，说明该包发布时没有包含 OpenClaw 在运行时所需的 JavaScript 文件。
请在发布者提供编译后的 JavaScript 后更新或重新安装，或者在此之前禁用/卸载该插件。

### 被阻止的插件路径所有权

如果插件诊断提示 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
并且随后配置校验显示 `plugin present but blocked`，说明 OpenClaw 发现的插件
文件归属于与加载它们的进程不同的 Unix 用户。请保持插件配置不变；修复文件系统所有权，或以拥有状态目录的相同用户运行 OpenClaw。

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

修复所有权后，重新运行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持久化的插件注册表与
已修复的文件保持一致。

### 插件工具设置缓慢

如果 agent 回合在准备工具时似乎停滞，请启用 trace 日志并
检查插件工具工厂的耗时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要会列出总工厂耗时以及最慢的插件工具工厂，
包括 plugin id、声明的工具名、result 形状，以及该工具是否是
optional。当单个工厂耗时至少 1s，或插件工具工厂总准备耗时至少 5s 时，
慢速行会提升为 warning。

OpenClaw 会缓存成功的插件工具工厂结果，以便在相同的有效请求上下文下重复解析。
缓存键包含有效的运行时配置、workspace、agent/session ids、sandbox 策略、浏览器设置、
交付上下文、请求方身份以及所有权状态，因此当上下文发生变化时，依赖这些受信字段的工厂会重新运行。
如果耗时仍然很高，插件可能在返回其工具定义之前执行了昂贵的工作。

如果某个插件在耗时上占主导，请检查其运行时注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将昂贵的依赖加载
放到工具执行路径之后，而不是放在工具工厂内部完成。

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
