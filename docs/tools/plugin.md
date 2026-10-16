---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - "安装或配置插件"
  - "了解插件发现和加载规则"
  - "使用与 Agent 插件、Codex、Claude 或 Cursor 兼容的插件包"
title: "插件"
sidebarTitle: "入门"
doc-schema-version: 1
---

插件为 OpenClaw 扩展了通道、模型提供方、智能体运行框架、工具、 技能、语音、实时转录、语音、媒体理解、生成、 网页抓取、网页搜索以及其他运行时能力。

使用此页面安装插件、应用其配置、验证加载它的运行时以及路由常见的安装失败。有关仅命令示例，请参阅 [管理插件](/plugins/manage-plugins)。有关生成的捆绑、官方外部和纯源插件的清单，请参阅 [Plugin inventory](/plugins/plugin-inventory)。

## <a id="requirements"></a> 要求

- 可用的 OpenClaw 检出或安装环境，以及可用的 `openclaw` CLI
- 能够访问所选来源的网络（ClawHub、npm 或 git 主机）
- any 插件特定的凭据、配置密钥或由该插件的安装文档命名的 OS 工具
- 管理员访问为您的频道提供服务的网关

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="find-the-plugin" title="找到插件">
    在 [ClawHub](/clawhub) 中搜索公开插件包：

    ```bash
    openclaw plugins search "calendar"
    ```

    ClawHub 是社区插件的主要发现界面。普通裸包规格从 npm 安装，除非它们与捆绑或官方插件 ID 匹配。与捆绑插件匹配的原始 `@openclaw/*` 规格解析为该捆绑副本。当您特别需要一个源时，请使用显式源前缀。

  </Step>

  <Step id="install-the-plugin" title="安装插件">
    ```bash
    # From ClawHub.
    openclaw plugins install clawhub:<package>

    # From npm.
    openclaw plugins install npm:<package>

    # From git.
    openclaw plugins install git:github.com/<owner>/<repo>@<ref>

    # From a local development checkout.
    openclaw plugins install ./my-plugin
    openclaw plugins install --link ./my-plugin
    ```

    将插件安装视为运行代码。更喜欢固定版本以进行可重复的生产安装。 ClawHub 软件包和 OpenClaw 的 bundled/official 目录是可信来源。在您查看并信任源后，新的任意 npm、git、本地 path/archive、`npm-pack:` 或市场源在非交互式安装中需要 `--force`。

  </Step>

  <Step id="configure-and-enable-it" title="配置并启用它">
    在 `plugins.entries.<id>.config` 下配置插件特定设置。 如果插件尚未启用，请启用它：

    ```bash
    openclaw plugins enable <plugin-id>
    ```

    如果设置了 `plugins.allow`，则安装的插件 ID 必须位于该列表中，然后插件才能加载。 `openclaw plugins install` 将已安装的 id 添加到现有的 `plugins.allow` 列表中，并从 `plugins.deny` 中删除相同的 id，以便可以加载显式安装。

  </Step>

  <Step id="apply-the-changes" title="应用更改">
    <a id="let-the-gateway-reload" />
    插件管理命令将更改应用于正在运行的本地网关，而无需重新启动它。如果网关已停止，请启动它以加载保存的更改。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

    使用默认的混合重新加载模式，普通的插件配置编辑也会自动应用。默认情况下，网关会替换受影响的插件实例；插件的显式重启策略仍然可能需要网关重启。接下来检查注册，然后使用实际的挂钩事件或工具调用验证正在运行的网关。

  </Step>

  <Step id="verify-runtime-registration" title="验证运行时注册">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json
    ```

    `--runtime` 在检查 CLI 进程中加载​​插件，并报告注册的工具、挂钩、服务、网关方法和插件拥有的 CLI 命令。普通 `inspect` 仅是冷清单和注册表检查。两者都不能证明已经运行的网关已加载相同的代码。触发hook或capability并验证其实际效果。

  </Step>
</Steps>

## <a id="configuration"></a> 配置

### <a id="choose-an-install-source"></a> 选择安装源

| 来源      | 适用场景                                                                       | 示例                                                        |
| ----------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| ClawHub     | 您需要 OpenClaw-native 发现、扫描、版本元数据和安装提示 | `openclaw plugins install clawhub:<package>`                   |
| npm         | 你需要直接使用 npm registry 或 dist-tag 工作流                             | `openclaw plugins install npm:<package>`                       |
| git         | 你需要来自仓库的分支、标签或提交                            | `openclaw plugins install git:github.com/<owner>/<repo>@<ref>` |
| 本地路径  | 您正在同一台机器上开发或测试插件                     | `openclaw plugins install --link ./my-plugin`                  |
| 市场 | 您正在安装 Claude- 兼容的市场插件                      | `openclaw plugins install <plugin> --marketplace <source>`     |

裸包规范具有特殊的兼容性行为：与捆绑插件 ID 匹配的裸名称使用该捆绑源；与官方外部插件 ID 匹配的裸名称使用官方包目录；任何其他裸规格通过 npm 安装。与捆绑插件匹配的原始 `@openclaw/*` 规范也会在 npm 回退之前解析为捆绑副本。使用 `npm:@openclaw/<plugin>@<version>` 故意安装外部 npm 软件包而不是捆绑副本。使用 `clawhub:`、`npm:`、`git:` 或 `npm-pack:` 显式选择源。完整的命令合约请参见 [`openclaw plugins`](/cli/plugins#install)。

对于 npm 安装，未固定版本的规格和 `@latest` 会选择其声明兼容性与当前 OpenClaw 构建匹配的最新稳定包。如果 npm 当前的 latest 版本声明的 `openclaw.compat.pluginApi` 或 `openclaw.install.minHostVersion` 高于此构建所支持的版本，OpenClaw 会扫描更早的稳定版本，并安装最符合要求的最新版本。精确版本和显式频道标签（例如 `@beta`）会保持锁定到所选包，如果不兼容则安装失败。

### <a id="operator-install-policy"></a> 操作员安装策略

配置 `security.installPolicy` 以在插件安装或更新继续之前运行受信任的本地策略命令。该策略接收元数据以及分阶段源路径，并可以允许、警告或阻止安装。它涵盖 CLI 和网关支持的 install/update 路径。 CLI 插件和技能命令可以通过输入与可疑 ClawHub 版本相同的目标名称来交互确认警告；然后重新评估政策。审查过的非交互式直接 CLI 命令可以使用 `--acknowledge-install-policy-warning`。该标志批准命令调用的每个警告；在继续安装之前，仍会重新评估每个警告。 Control UI 显示结构化警告并提供 **无论如何安装**。该操作使用 `acknowledgeInstallPolicyWarning: true` 重新发送相同的插件请求，批准安装调用期间遇到的每个警告；在继续安装之前，仍会重新评估每个警告。其他网关支持的自动安装在没有操作员确认流程时仍会被阻止。当存在等效的直接插件或技能命令时，使用该命令来查看和批准警告。否则，更改 `security.installPolicy` 以针对已审核的请求返回 `allow`，然后重试受管流。 `--force` 和已弃用的插件 install/update 标志 `--dangerously-force-unsafe-install` 都不批准策略警告。插件 `before_install` 挂钩稍后运行，并且仅在加载插件挂钩的 OpenClaw 进程中运行，因此请使用 `security.installPolicy` 进行操作员拥有的安装决策。该标志不会覆盖阻止或策略失败。它也不会绕过 `before_install` 吊钩块。

有关技能和插件使用的共享 `security.installPolicy` 执行模式，请参阅 [Skills config](/tools/skills-config#operator-install-policy-security-installpolicy)。

### <a id="configure-plugin-policy"></a> 配置插件策略

常见的插件配置结构如下：

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/path/to/oss/voice-call-plugin"] },
    slots: { memory: "memory-core" },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

关键策略规则：

- `plugins.enabled: false` 禁用所有插件并跳过 discovery/load 工作。过时的插件引用在其处于活动状态时保持惰性；如果您想删除过时的 ID，请在运行 Doctor Cleanup 之前重新启用插件。
- `plugins.deny` 的优先级高于 allow 和单个插件启用设置。
- `plugins.allow` 是一个排他性的允许列表。允许列表之外的插件即使 `tools.allow` 包含 `"*"` 也仍然不可用。
- `plugins.entries.<id>.enabled: false` 会禁用单个插件，同时保留其配置。
- `plugins.load.paths` 会添加显式的本地插件文件或目录。受管理的 `plugins install` 本地路径必须是插件目录或归档文件；对于独立插件文件，请使用 `plugins.load.paths`。
- 来自工作区的插件默认是禁用的；在使用本地工作区代码之前，请显式启用它们或将它们加入允许列表。
- Bundled 插件遵循其内置的默认 on/default-off 元数据，除非配置显式覆盖它。
- `plugins.slots.<slot>`（`memory` 或 `contextEngine`）为独占类别选择一个插件。槽位选择会计入显式激活，并会强制为该槽位启用所选插件，即使它在其他情况下需要显式启用。`plugins.deny` 和 `plugins.entries.<id>.enabled: false` 仍然会阻止它。
- 当配置命名其拥有的表面之一（例如 provider/model 引用、通道配置、CLI 后端或代理harness运行时）时，Bundled 选择加入插件可以自动激活。
- OpenAI-family Codex 路由将提供者和运行时插件边界分开：遗留 Codex 模型引用是医生修复的遗留配置，而捆绑的 `codex` 插件拥有当前 `openai/*` 代理的 Codex 应用程序服务器运行时参考、显式 `agentRuntime.id: "codex"` 和旧版 `codex/*` 参考。

当 `plugins.allow` 未设置并且从工作区或全局插件根自动发现非捆绑插件时，启动会记录 `plugins.allow is empty; discovered non-bundled plugins may auto-load: ...` 以及发现的插件 ID，对于简短列表，还会记录最小的 `plugins.allow` 片段。在将受信任的插件复制到 `openclaw.json` 之前，在列出的插件 ID 上运行 [`openclaw plugins list --enabled --verbose`](/cli/plugins#list) 或 [`openclaw plugins inspect <id>`](/cli/plugins#inspect)。当诊断显示插件加载了 `without install/load-path provenance` 时，同样的信任固定也适用：检查该插件 ID，然后将其固定在 `plugins.allow` 中或从可信来源重新安装，以便 OpenClaw 记录安装来源。

当配置验证报告过时的插件 ID、allowlist/tool 不匹配或旧版捆绑插件路径时，运行 `openclaw doctor` 或 `openclaw doctor --fix`。如果删除过时的 ID 会清空限制性 `plugins.allow` 列表，Doctor 会将已启用的频道和选定的插件保留为明确允许的 ID。仅当没有剩余插件时，它才会禁用插件。更改频道或插件插槽时查看保留的列表。旧版 ID 冲突需要明确的策略选择；请参阅 [config 迁移](/gateway/doctor/config-migrations)。

## <a id="understand-plugin-formats"></a> 了解插件格式

OpenClaw 识别两种插件格式：

| 格式                 | 加载方式                                                                                | 适用场景                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 原生 OpenClaw 插件 | `openclaw.plugin.json` 加上进程中加载​​的运行时模块                              | 您正在安装或构建 OpenClaw- 特定的运行时功能  |
| 兼容包      | 将 Agent Plugins、Codex、Claude 或 Cursor 插件布局映射到 OpenClaw 插件清单中 | 复用兼容的技能、命令、钩子或包元数据 |

这两种格式都会出现在 `openclaw plugins list`、`openclaw plugins inspect`、 `openclaw plugins enable` 和 `openclaw plugins disable` 中。有关包兼容边界，请参见 [插件包](/plugins/bundles)；有关原生插件作者指南，请参见 [构建插件](/plugins/building-plugins)。

## <a id="plugin-hooks"></a> 插件钩子

插件可以在运行时通过两个不同的 API 注册钩子：

- `api.on(...)`：用于运行时生命周期事件的类型化钩子。这是中间件、策略、消息重写、提示词塑形以及工具控制的首选接口。
- `api.registerHook(...)` 用于 [Hooks](/automation/hooks) 中描述的内部挂钩系统。这主要是为了粗略的 command/lifecycle 副作用以及与现有 HOOK- 风格自动化的兼容性。

快速规则：如果处理程序需要优先级、合并语义或 block/cancel 行为，请使用类型化挂钩。如果它只是对 `command:new`、`command:reset`、`message:sent` 或类似的粗略事件做出反应，则 `api.registerHook` 就可以。

由插件管理的内部钩子会在 `openclaw hooks list` 中以 `plugin:<id>` 的形式出现。你不能通过 `openclaw hooks` 启用或禁用它们；应改为启用或禁用该插件。

挂钩注册还取决于网关启动选择。对于仅钩子插件，请在 `openclaw.plugin.json` 中声明 `activation.onCapabilities: ["hook"]`，然后启用该插件，并在配置允许列表时将其包含在 `plugins.allow` 中。清单提示不会绕过全局禁用、拒绝或每个插件启用策略。

显式的钩子策略也是启动意图。例如，`plugins.entries.<id>.hooks.allowConversationAccess: true` 既授权非捆绑对话挂钩，又选择为网关启动配置的插件；正常的插件政策仍然适用。更改插件清单或源后运行 `openclaw plugins reload <id>`。使用默认的混合重新加载模式，挂钩策略会更改热重新加载插件运行时。使用 `openclaw plugins inspect <id> --runtime --json` 检查注册，然后触发事件来验证正在运行的进程。有关完整示例，请参阅 [Plugin hooks](/plugins/hooks#quick-start)。

## <a id="verify-the-active-gateway"></a> 验证活动网关

`openclaw plugins list` 和普通的 `openclaw plugins inspect` 读取冷配置、 清单和注册表状态。它们不能证明一个已经运行中的网关已导入相同的插件代码。

当某个插件看起来已经安装，但实时聊天流量没有使用它时：

```bash
openclaw gateway status --deep --require-rpc
openclaw plugins inspect <plugin-id> --runtime --json
openclaw plugins reload <plugin-id>
```

插件重新加载会刷新正在运行的网关中选定的插件。在源或清单编辑后，或者在更正失败的激活后使用它。成功的安装、更新、启用、禁用和卸载命令已应用其更改；他们不需要额外的重新加载。有关已编译的捆绑代码和清理限制，请参阅 [Reload](/cli/plugins#reload)。

## <a id="troubleshooting"></a> 故障排查

| 症状                                                        | 检查                                                                                                                                      | 修复                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 插件出现在 `plugins list` 中，但运行时钩子未执行  | 使用 `openclaw plugins inspect <id> --runtime --json`，并通过 `gateway status --deep --require-rpc` 确认当前活动的 Gateway             | 检查激活错误；源代码编辑或修复后重新加载。对于配置更改，请检查重新加载模式和插件重新启动前缀 |
| 出现重复的 channel 或工具所有权诊断         | 运行 `openclaw plugins list --enabled --verbose`，使用 `--runtime --json` 检查每个疑似插件，并比较 channel/tool 所有权 | 禁用其中一个所有者、移除过期安装，或在有意替换时使用清单中的 `preferOver`                               |
| 配置显示某个插件缺失                                | 查看 [插件清单](/plugins/plugin-inventory)，确认它是内置、官方外部插件，还是仅源代码提供                           | 安装外部包、启用内置插件，或移除过期配置                                                  |
| 安装期间配置无效                               | 阅读验证消息；如果提示为过期的插件状态，则运行 `openclaw doctor --fix`                                             | Doctor 可以通过禁用该条目并移除无效负载来隔离无效的插件配置                              |
| 插件路径因所有权或权限可疑而被阻止 | 在配置错误之前检查诊断                                                                                             | 修复文件系统 ownership/permissions，然后运行 ​​`openclaw plugins registry --refresh`                                             |
| `OPENCLAW_NIX_MODE=1` 阻止生命周期命令                | 确认该安装由 Nix 管理                                                                                                      | 在 Nix 源中更改插件选择，而不是使用插件变更命令                                               |
| 运行时依赖导入失败                             | 检查该插件是通过 npm/git/ClawHub 安装，还是从本地路径加载                                                 | 运行 `openclaw plugins update <id>`，重新安装源，或自行安装本地插件依赖                          |

当启用的受管插件在 Gateway 启动期间未通过有效载荷校验时，OpenClaw 会在本次启动中隔离该确切已安装插件根目录，并继续提供其他插件服务。`openclaw status --all`、`openclaw health` 和 `openclaw doctor` 会将其报告为 `configured-unavailable`。修复或重新安装该插件，然后重启 Gateway。若存在同一插件 id 的健康且显式的 `plugins.load.paths` 覆盖，则不会因过期的损坏安装而被隔离。

当过期的插件配置仍然引用一个已无法发现的 channel 插件时，配置验证会将该 channel 键降级为警告而不是硬失败，因此 Gateway 启动仍可为其他所有 channel 提供服务。运行 `openclaw doctor --fix` 以移除过期的插件和 channel 条目。没有过期插件证据的未知 channel 键仍会使验证失败，以便拼写错误保持可见。

对于有意的 channel 替换，首选插件应在 `channelConfigs.<channel-id>.preferOver` 中声明旧版或更低优先级插件的 id。如果两个插件都被显式启用，OpenClaw 会保留该请求，并报告重复的 channel/tool 诊断，而不会静默选择一个所有者。

如果已安装的软件包报告为 `requires compiled runtime output for TypeScript entry ...`，则该软件包已发布，但没有 OpenClaw 在运行时所需的 JavaScript 文件。发布者发布编译后的 JavaScript 或 disable/uninstall 插件后更新或重新安装，直到那时。

<a id="trusted-plugin-state-refused" />

### <a id="plugin-runtime-trust-refused"></a> Plugin 运行时信任被拒绝

每个加载的插件都可以使用自己的键控和 blob 状态以及通道入口队列，包括本地路径和链接安装。挂钩代理轮流和网关范围提升仍然需要信任。出处警告和 `plugins inspect` 仍报告未经验证的来源；它们不会阻止插件范围的存储或队列。

如果插件失败并显示 `dispatchHookAgentTurn is only available for trusted plugins`，请将错误的 `registryPath` 与 `plugin.trust.registryPath` 进行比较：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
openclaw doctor
```

检查和网关报告插件加载期间记录的信任决策，包括`reason`、`origin`、`installSource`和`installSpec`。匹配可执行版本和配置文件不会建立匹配的注册表数据库。检查加载到 CLI 进程中，因此比较两条路径。当本地网关不可达时，Doctor还会检查已安装的服务环境；如果该环境无法验证，它会这样说。

如果插件需要信任门控功能，请使用以下适用的补救措施。 `--link` 和 `--force` 不授予对这些功能的信任。

| 原因                  | 补救                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `record-missing`        | 如果 CLI 和网关状态路径不同，则将它们对齐；否则通过 `openclaw plugins install` 重新安装，以便记录安装。                                                                                 |
| `provenance-missing`    | 使用网关的 state/config 路径运行 `openclaw doctor --fix`。医生修复了目录证明的遗留 ClawHub 记录；无法验证的记录需要从官方 npm 包或 ClawHub 列表中重新安装。 |
| `origin-path`           | 将本地 path/archive 安装替换为官方 npm 软件包或 ClawHub 列表。                                                                                                                             |
| `install-path-mismatch` | 重新安装所需的包并删除选择另一个副本的加载路径。                                                                                                                                       |
| `owner-ambiguous`       | 重新安装之前刷新注册表并解决冲突的包所有权。                                                                                                                                  |
| `provenance-invalid`    | 从官方来源重新安装；冲突或部分出处不会自动受到信任。                                                                                                                  |

`bundled` 和 `trusted-official` 标识可接受的来源。具有一致官方包规范的旧版 npm 记录仍然有效，无需额外的解析字段。医生修复现有安装分类帐中的出处；运行时不会回退到信任包创作的元数据。

### <a id="blocked-plugin-path-ownership"></a> 被阻止的插件路径所有权

如果诊断信息显示 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)` 并且验证随后出现 `plugin present but blocked`，说明 OpenClaw 发现插件文件的 Unix 用户所有权与加载它们的进程不同。 请保留插件配置不变；修复文件系统所有权，或以拥有状态目录的同一用户运行 OpenClaw。

对于 Docker 安装，官方镜像以 `node`（uid `1000`）运行，因此宿主机绑定挂载的 OpenClaw 配置和工作区目录通常应归属于 uid `1000`：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果你有意将 OpenClaw 作为 root 运行，则改为修复受管理的插件根目录， 使其归属于 root：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

在修复所有权后，重新运行 `openclaw doctor --fix` 或 `openclaw plugins registry --refresh`，以便持久化的插件注册表与已修复的文件保持一致。

### <a id="slow-plugin-tool-setup"></a> 插件工具设置缓慢

如果 agent 回合在准备工具时似乎停滞，请启用跟踪日志并检查插件工具工厂的耗时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查看以下内容：

```text
[trace:plugin-tools] factory timings ...
```

摘要会列出总工厂耗时以及最慢的插件工具工厂， 包括插件 id、声明的工具名称、结果形状，以及该工具是否为可选项。当单个工厂耗时至少 1s，或插件工具工厂准备总耗时至少 5s 时，慢行会被提升为警告。

OpenClaw 会缓存成功的插件工具工厂结果，以便对相同的有效请求上下文进行重复解析。 缓存键包含有效运行时配置、工作区和 agent id、沙箱策略、浏览器设置、交付上下文、请求者身份以及所有权状态，因此依赖这些受信任字段的工厂会在上下文变化时重新运行。如果耗时仍然很高，插件可能在返回其工具定义之前就执行了昂贵的工作。

如果某个插件在耗时上占主导，请检查其运行时注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将昂贵的依赖加载移到工具执行路径之后，而不是放在工具工厂内部执行。

有关依赖根、包元数据校验、注册表记录、启动重载行为和旧版清理，请参见 [插件依赖解析](/plugins/dependency-resolution)。

## <a id="related"></a> 相关内容

- [管理插件](/plugins/manage-plugins) - 用于 list、install、update、uninstall 和 publish 的命令示例
- [`openclaw plugins`](/cli/plugins) - 完整的 CLI 参考
- [插件清单](/plugins/plugin-inventory) - 生成的内置和外部插件列表
- [插件参考](/plugins/reference) - 按插件生成的参考页面
- [社区插件](/plugins/community) - ClawHub 发现和文档 PR 政策
- [插件依赖解析](/plugins/dependency-resolution) - 安装根、注册表记录和运行时边界
- [构建插件](/plugins/building-plugins) - 原生插件编写指南
- [插件 SDK 概览](/plugins/sdk-overview) - 运行时注册、hooks 和 API 字段
- [插件清单](/plugins/manifest) - 清单和包元数据。
- [上下文引擎](/concepts/context-engine) - 可插入上下文组装插件
- [Diffs](/tools/diffs) - 只读差异查看器和文件渲染器（可选插件工具）
- [ACP 代理 — setup](/tools/acp-agents-setup) - 配置插件提供的 ACP 代理
