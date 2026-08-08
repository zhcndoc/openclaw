---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - 安装或配置插件
  - 了解插件发现和加载规则
  - 使用与 Agent 插件、Codex、Claude 或 Cursor 兼容的插件包
title: "插件"
sidebarTitle: "入门"
doc-schema-version: 1
---

插件为 OpenClaw 扩展了通道、模型提供方、智能体运行框架、工具、
技能、语音、实时转录、语音、媒体理解、生成、
网页抓取、网页搜索以及其他运行时能力。

使用此页面来安装插件、重启网关、验证运行时已加载它，并排查常见的设置失败。仅含命令示例，请参见
[管理插件](/plugins/manage-plugins)。关于捆绑的、官方的外部插件以及仅源代码插件的生成清单，请参见
[插件清单](/plugins/plugin-inventory)。

## 要求

- 可用的 OpenClaw 检出或安装环境，以及可用的 `openclaw` CLI
- 能够访问所选来源的网络（ClawHub、npm 或 git 主机）
- 该插件设置文档中提到的任何插件特定凭据、配置键或操作系统工具
- 重新加载或重启为你的频道提供服务的 Gateway 的权限。

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

## 配置

### 选择安装源

| 来源        | 适用场景                                                                 | 示例                                                         |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| ClawHub     | 你想使用 OpenClaw 原生的发现、扫描、版本元数据和安装提示                | `openclaw plugins install clawhub:<package>`                   |
| npm         | 你需要直接使用 npm registry 或 dist-tag 工作流                         | `openclaw plugins install npm:<package>`                       |
| git         | 你需要来自仓库的分支、标签或提交                                        | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| 本地路径     | 你正在同一台机器上开发或测试一个插件                                    | `openclaw plugins install --link ./my-plugin`                  |
| marketplace | 你正在安装一个与 Claude 兼容的 marketplace 插件                          | `openclaw plugins install <plugin> --marketplace <source>`     |

裸包规格具有特殊的兼容性行为：与捆绑插件 id 匹配的裸名称会使用该捆绑源；与官方外部插件 id 匹配的裸名称会使用官方包目录；在启动迁移期间，任何其他裸规格都会通过 npm 安装。与捆绑插件匹配的原始 `@openclaw/*` 规格也会先解析为捆绑副本，然后再回退到 npm。使用 `npm:@openclaw/<plugin>@<version>` 可有意安装外部 npm 包而不是捆绑副本。使用 `clawhub:`, `npm:`, `git:` 或 `npm-pack:` 可确定性地选择来源。有关完整命令约定，请参见 [`openclaw plugins`](/cli/plugins#install)。

对于 npm 安装，未固定版本的规格和 `@latest` 会选择其声明兼容性与当前 OpenClaw 构建匹配的最新稳定包。如果 npm 当前的 latest 版本声明的 `openclaw.compat.pluginApi` 或 `openclaw.install.minHostVersion` 高于此构建所支持的版本，OpenClaw 会扫描更早的稳定版本，并安装最符合要求的最新版本。精确版本和显式频道标签（例如 `@beta`）会保持锁定到所选包，如果不兼容则安装失败。

### 操作员安装策略

在继续插件安装或更新之前，请将 `security.installPolicy` 配置为运行一个受信任的本地策略命令。该策略会接收元数据和暂存的源路径，并可允许或阻止安装。它适用于 CLI 和 Gateway 支持的安装/更新路径。插件的 `before_install` 钩子会在之后运行，并且只会在已加载插件钩子的 OpenClaw 进程中运行，因此请改用 `security.installPolicy` 来做由操作员拥有的安装决策。已弃用的 `--dangerously-force-unsafe-install` 标志仍为兼容性而被接受，但它不起作用：它既不会绕过安装策略，也不会绕过 OpenClaw 内置的插件依赖黑名单。

关于技能和插件共用的 `security.installPolicy` exec schema，请参见 [技能配置](/tools/skills-config#operator-install-policy-securityinstallpolicy)。

### 配置插件策略

常见的插件配置结构如下：

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

- `plugins.enabled: false` 会禁用所有插件，并跳过发现/加载工作。在这种状态下，过期的插件引用会保持不活跃；如果你想移除过期的 id，请先重新启用插件再运行 doctor 清理。
- `plugins.deny` 的优先级高于 allow 和单个插件启用设置。
- `plugins.allow` 是一个排他性的允许列表。允许列表之外的插件即使 `tools.allow` 包含 `"*"` 也仍然不可用。
- `plugins.entries.<id>.enabled: false` 会禁用单个插件，同时保留其配置。
- `plugins.load.paths` 会添加显式的本地插件文件或目录。受管理的 `plugins install` 本地路径必须是插件目录或归档文件；对于独立插件文件，请使用 `plugins.load.paths`。
- 来自工作区的插件默认是禁用的；在使用本地工作区代码之前，请显式启用它们或将它们加入允许列表。
- 捆绑插件会遵循其内置的默认启用/默认禁用元数据，除非配置明确覆盖它。
- `plugins.slots.<slot>`（`memory` 或 `contextEngine`）为独占类别选择一个插件。槽位选择会计入显式激活，并会强制为该槽位启用所选插件，即使它在其他情况下需要显式启用。`plugins.deny` 和 `plugins.entries.<id>.enabled: false` 仍然会阻止它。
- 捆绑的按需启用插件在配置命名了其拥有的任何表面时可以自动激活，例如 provider/model 引用、通道配置、CLI backend 或 agent harness runtime。
- OpenAI 家族的 Codex 路由会将 provider 和 runtime 插件边界分开：旧版 Codex model 引用属于需要 doctor 修复的旧配置，而捆绑的 `codex` 插件拥有规范的 `openai/*` agent 引用、显式的 `agentRuntime.id: "codex"`，以及用于旧版 `codex/*` 引用的 Codex app-server runtime。

当 `plugins.allow` 未设置且从工作区或全局插件根目录自动发现了一个非捆绑插件时，启动日志会显示
`plugins.allow is empty; discovered non-bundled plugins may auto-load: ...`
并附上发现的插件 id；对于较短的列表，还会提供一个最小的 `plugins.allow` 片段。在将受信任的插件复制到 `openclaw.json` 之前，请先运行 [`openclaw plugins list --enabled --verbose`](/cli/plugins#list)
或 [`openclaw plugins inspect <id>`](/cli/plugins#inspect) 查看列出的插件 id。当诊断信息显示某个插件是
`without install/load-path provenance` 加载的时，也适用相同的信任固定原则：先检查插件 id，然后将其固定到 `plugins.allow` 中，或从受信任的来源重新安装，以便 OpenClaw 记录安装来源。

当配置验证报告过期的插件 id、allowlist/工具不匹配，或旧版捆绑插件路径时，请运行 `openclaw doctor` 或 `openclaw doctor --fix`。

## 了解插件格式

OpenClaw 识别两种插件格式：

| 格式                   | 加载方式                                                                                  | 适用场景                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 原生 OpenClaw 插件     | `openclaw.plugin.json` 加上在进程中加载的运行时模块                                         | 安装或构建 OpenClaw 专用的运行时功能                                   |
| 兼容包                 | 将 Agent Plugins、Codex、Claude 或 Cursor 插件布局映射到 OpenClaw 插件清单中               | 复用兼容的技能、命令、钩子或包元数据                                   |

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

钩子注册还取决于网关的启动选择。对于仅包含钩子的插件，请在
`openclaw.plugin.json` 中声明 `activation.onCapabilities: ["hook"]`，然后启用该插件，并在配置了
`plugins.allow` 时将其加入其中。清单提示不会绕过全局禁用、拒绝或按插件设置的启用策略。

明确的钩子策略也表示启动意图。例如，
`plugins.entries.<id>.hooks.allowConversationAccess: true` 既会授权
非内置的会话钩子，也会选择该配置的插件用于网关启动；正常的插件策略仍然适用。更改清单或钩子策略后，重启网关，并使用
`openclaw plugins inspect <id> --runtime --json` 验证注册情况。

## 验证活动网关

`openclaw plugins list` 和普通的 `openclaw plugins inspect` 读取冷配置、
清单和注册表状态。它们不能证明一个已经运行中的
网关已导入相同的插件代码。

当某个插件看起来已经安装，但实时聊天流量没有使用它时：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw gateway restart
```

受管理的网关会在插件安装、更新和卸载导致插件源发生变化后自动重启。
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

当启用的受管插件在 Gateway 启动期间未通过有效载荷校验时，OpenClaw 会在本次启动中隔离该确切已安装插件根目录，并继续提供其他插件服务。`openclaw status --all`、`openclaw health` 和 `openclaw doctor` 会将其报告为 `configured-unavailable`。修复或重新安装该插件，然后重启 Gateway。若存在同一插件 id 的健康且显式的 `plugins.load.paths` 覆盖，则不会因过期的损坏安装而被隔离。

当过期的插件配置仍然引用一个已无法发现的 channel 插件时，配置验证会将该 channel 键降级为警告而不是硬失败，因此 Gateway 启动仍可为其他所有 channel 提供服务。运行 `openclaw doctor --fix` 以移除过期的插件和 channel 条目。没有过期插件证据的未知 channel 键仍会使验证失败，以便拼写错误保持可见。

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
- [插件清单](/plugins/manifest) - 清单和包元数据。
