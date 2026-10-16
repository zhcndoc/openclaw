---
summary: "通过 Muse 代码 CLI 为 Meta 模型运行 OpenClaw 嵌入式代理轮流"
title: "Muse 代码代理运行时"
read_when:
  - "您希望代理通过 Muse 代码 CLI 运行 Meta Muse Spark 模型"
  - "您需要 `muse` 运行时的配置示例"
  - "您正在为 `meta/*` 模型选择内置 OpenClaw 运行时和 Muse 代码"
---

外部`@openclaw/muse`插件通过[Muse Code](https://dev.meta.ai/docs/muse-code)、Meta的编码代理CLI运行`meta/*`模型的嵌入式代理轮流。该插件启动 `muse serve` 并通过 Muse 会话协议 （MSP） 与官方 `@muse-code/sdk` 客户端进行对话。

Muse Code 拥有低级代理循环：本机 shell、文件 read/write/edit 工具、其 OS 沙箱及其会话状态。 OpenClaw 仍然拥有聊天频道、模型选择、批准、可见的聊天记录以及从 OpenClaw 会话到 Muse 会话的映射。

对于更广泛的 model/provider/runtime 拆分，请从 [Agent 运行时](/concepts/agent-runtimes) 开始。

## <a id="requirements"></a> 要求

- OpenClaw。模型安装程序可以安装并启用 `@openclaw/muse` 插件。
- 如果您的配置使用`plugins.allow`，请允许`muse`（清单ID），而不是npm包名称。
- Muse代码CLI单独安装，`muse`二进制文件位于`PATH`或配置的`binaryPath`上。使用 Meta 的安装程序安装它：

  ```bash
  curl -fsSL https://dev.meta.ai/install.sh | bash
  muse --version
  ```

- A Meta 凭证：Muse Code 浏览器登录、存储的密钥或 OpenClaw 中的 `meta` 身份验证配置文件（请参阅 [Auth](#auth)）。

## <a id="install"></a> 安装

当您选择 **Muse Code** 时，模型安装程序会安装该插件。要手动安装它：

```bash
openclaw plugins install @openclaw/muse
```

该插件不会安装或更新 `muse` 二进制文件。它在启动的进程上设置 `MUSE_NO_AUTO_UPDATE=1`，因此 Muse 不会在网关运行过程中更新自身。使用其自己的安装程序更新 Muse。

## <a id="quickstart"></a> 快速开始

1. 在Control UI中打开**模型设置** （`/models`）。
2. 在**AI设置**中，选择**连接提供商**，然后**Meta→Muse代码**。
3. 开始登录，确认浏览器中显示的设备代码并批准。
4. 接受**使用Muse Code的本机权限？**完成所选OpenClaw代理的设置。

OpenClaw 启用 Muse 插件，并默认选择 `meta/muse-spark-1.3` 和 `muse` 运行时。如果您在设置过程中选择另一个 Meta 模型，则该模型将使用 Muse。无需终端登录或手动运行时配置。

您还可以在 **Provider Access** 连接对话框中选择 **Meta → Muse Code**。它登录、验证访问并启用 Muse 运行时，而无需更改活动模型。成功对话框确认 **Muse 代码已连接** 并使用网关的提供程序目录为您的代理准备好模型，而无需等待浏览器中的目录刷新。选择 **与 Muse Spark 1.3** 开始新的聊天，以使用该模型进行新的聊天，或选择 **Close** 以保留提供商访问权限。使用 **AI Setup** 在一个流程中连接并选择默认模型。

对于手动配置，通过 Muse 运行时路由一个 Meta 模型：

```json5
{
  agents: {
    defaults: {
      model: "meta/muse-spark-1.3",
      models: {
        "meta/muse-spark-1.3": {
          agentRuntime: { id: "muse" },
        },
      },
    },
  },
}
```

在一个模型条目上设置 `agentRuntime.id` 以仅路由该模型，或在 `meta` 提供程序上设置以路由每个 Meta 模型。没有此路由的模型通过 [Meta 提供程序 ](/providers/meta) 使用内置 OpenClaw 运行时。

在模型设置中选择 **Muse Code** 通过 Muse 为正在设置的代理路由所选模型。它写入该代理的模型条目，替换其中已有的任何运行时选择。全局模型默认值，其他代理和其他 Meta 模型保留其现有的运行时策略。

该harness仅接受 Meta 官方端点 （`https://api.meta.ai/v1`） 上的标准 `meta` 提供商路线。具有另一个 `baseUrl` 或具有请求传输覆盖的 `meta` 提供程序条目将被拒绝，因为 Muse 代码调用 Meta 本身。

## <a id="auth"></a> 身份验证

使用 **模型设置 → Meta → Muse Code** 在 **Provider Access** 或 **AI 在浏览器的 Control UI 中设置**登录。该凭证保留在 Muse Code 自己的凭证存储中； OpenClaw 不会将其复制到身份验证配置文件中。此登录授权 Muse 运行时，而不是直接 Meta API 路由。

当登录对话框在浏览器中显示 **正在等待批准…** 时，请保持登录对话框打开。设备代码和 **Open 登录** 链接在等待期间保持可用。审核通过后，OpenClaw检查访问权限后，显示**Muse Code已连接**；然后您可以开始新的聊天或关闭对话框。

设置显示 **正在测试您的 AI 连接…**，同时检查模型访问，然后显示 **正在打开您的 AI 连接…**，同时启用运行时并应用网关配置。当该应用程序完成时，连接就准备好了。

对于 Muse 拥有的登录，OpenClaw 检查 Muse 是否可以从 Meta 的实时目录中获取候选模型。它在验证期间不会运行模型转向或公开本机工具。在提交激活之前再次运行相同的检查。只读Muse主机被重用，而其凭证绑定保持不变；预提交检查仍然请求实时目录并重新检查调用者权限。取消登录会关闭其验证主机，包括在启动期间。 **AI 设置** 选择该模型； **Provider Access** 保留活动模型。

网关驱动的登录始终使用 OpenClaw 状态目录 （`muse/muse/auth.json`） 下的 Muse 文件凭证后端。它需要一种浏览器批准，并且不访问 macOS 钥匙串。当凭证文件存在时，验证和聊天使用相同的凭证目录。

在首次登录代理之前，OpenClaw 会要求您接受 Muse Code 的本机权限。继续会记住该代理的此选择，因此将来的 Muse 聊天不会再次询问。 Muse运行在Gateway主机上，有自己的工具； OpenClaw 的可选本机工具和沙箱限制对其不适用。 OpenClaw-托管工具保留其策略检查。通过从代理的 **Remembered 本机运行时权限** 设置中删除 `muse` 来撤销同意。

或者，在网关主机上运行 `muse login` 并批准浏览器代码，或使用 `muse auth set` 存储 API 密钥。当不存在网关管理的凭据文件时，该工具将使用 Muse 自己的默认凭据存储，包括其本机钥匙串支持，而无需 OpenClaw 身份验证配置文件。

该harness每次尝试都会选择一个凭证，顺序如下：

1. API 密钥 OpenClaw 已解析为尝试选择的 `meta` 身份验证配置文件。
2. API 密钥来自确切选定的 `meta:` 身份验证配置文件，通过提供程序身份验证运行时解析。
3. 网关环境中的 `META_API_KEY`，后跟网关管理的 Muse 凭证文件（如果存在）；否则 Muse 自己的默认凭证存储。

当 OpenClaw 选择一个键时，harness会将其作为 `META_API_KEY` 提供给 Muse。 Meta提供商的`MODEL_API_KEY`不会传递给Muse；缪斯没有读它。

每个凭证都有自己的 `muse serve` 进程。更改密钥会启动新的 Muse 会话，而不是恢复属于另一凭证的会话。在本机和网关管理的凭据之间切换，或更改托管凭据文件，会退出池进程并启动新的会话。

如果 Muse 拒绝该凭证，或者找不到任何凭证，则该轮次失败。聊天显示OpenClaw的通用故障通知；网关日志 （`openclaw logs --follow`） 包含可操作的原因，例如“Muse 代码未在网关主机上登录...在那里运行 `muse login`，或为网关设置 META_API_KEY”，加上 Muse stderr 的最后几行（仅在那里出现无效的 `META_API_KEY`）。

## <a id="configuration"></a> 配置

| 键          | 默认值 | 用途                                                     |
| ------------ | ------- | ----------------------------------------------------------- |
| `binaryPath` | `muse`  | Muse 可执行路径，或在 `PATH` 上解析的命令名称。 |

```json5
{
  plugins: {
    entries: {
      muse: {
        enabled: true,
        config: { binaryPath: "/opt/homebrew/bin/muse" },
      },
    },
  },
}
```

模型选择来自 OpenClaw 模型参考。思维水平映射到 Muse 的推理工作：`off` 变为 `minimal`（Muse Spark 不接受 `none`），以及 `minimal`、`low`、`medium`、`high`、`xhigh`、 `max`、`ultra` 穿过。 `adaptive` 被拒绝，因为 Muse 没有自适应模式。

准备好的图像附件将作为本机 MSP 图像输入转发到 Muse，包括其媒体类型和 base64 有效负载。

## <a id="approvals-and-sandbox"></a> 审批和沙箱

该工具按顺序解析 `tools.exec.mode`、旧版 `security`/`ask` 设置、代理特定设置和每会话执行覆盖。显式模式取代同一层中的旧字段。然后，主机本地执行批准默认值和座席特定批准设置将应用为更严格的安全性并询问楼层； `tools.exec.mode: "full"` 不会绕过它们。只有显式的完整会话提升才能绕过这些楼层，同时其有效安全性仍然保持完整。有效的政策映射到Muse的审批模式和沙箱态势：

| OpenClaw 执行策略                 | 缪斯行为                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `security: "deny"`                   | `muse serve --disable-shell --disable-write`，审批模式`denyUnmatched`。                  |
| `security: "full"` 与 `ask: "off"` | 审批模式`allowAll`。                                                                     |
| 默认和其他组合       | 批准模式 `promptUnmatched`：Muse 应用自己的规则并询问 OpenClaw 其余的信息。 |
| `security: "allowlist"`              | 拒绝了。 Muse 无法强制执行 OpenClaw 的执行白名单。                                       |
| `ask: "always"`                      | 拒绝了。 Muse 无法保证每个本机命令都有批准提示。                   |

当 Muse 请求批准时，OpenClaw 会向观看会话的批准界面（例如 Control UI）显示其正常批准提示，其中包括 **Allow Once** 和 **Deny**。harness通过 Muse 提供的选择来回答。被拒绝、过期或取消的批准会发送拒绝选择，没有表面显示的批准也会发送拒绝选择。每个批准最多等待两分钟。该harness永远不会授予持久批准。

当 OpenClaw 需要 OpenClaw 沙箱或仅限工作区的文件访问时，该harness也会拒绝尝试。 Muse 在网关主机上运行，​​无法强制执行这些边界。为这些代理或会话选择 `openclaw` 运行时。

一旦您接受本机运行时提示，对话工具策略（例如 `tools.deny`）就不会阻止 Muse。 Muse没有收到OpenClaw的代理工具，因此策略没有什么可过滤的，并且它自己的工具遵循上面的审批模式。未经同意，OpenClaw 拒绝转牌。

**Provider Access** 和 **AI Setup** 在浏览器登录之后和验证之前请求此权限一次。成功的设置会记住您对所选 OpenClaw 代理的选择，包括当您在不更改活动模型的情况下连接 Muse 时。使用 Muse 的新聊天然后从 **开始完全访问** 并关闭可选的沙箱，而无需重复提示。

如果您通过 CLI 或手动配置来设置 Muse，则在需要同意时，Control UI 仍可能会提供 **继续此聊天**。这些流程之外的设置不会自动授予权限。该后备仅更改当前聊天。从 `agents.entries.<agentId>.nativeRuntimeConsent` 中删除 `muse` 以撤销记住的选择。所需的沙箱和工作区边界仍然适用。

在任何 `muse` 进程启动之前，被拒绝的尝试失败，并出现命名设置的错误。

## <a id="sessions"></a> 会话

该插件在其插件状态下为每个 OpenClaw 会话存储一个绑定：Muse 会话 ID 加上工作区的指纹、模型、凭证、只读状态和批准模式。仅当 Muse 接受回合后，绑定才会保存。当指纹匹配时，下一轮将恢复 Muse 会话。如果这些输入中的任何一个发生更改，或者先前的记录被标记为无法安全重播，则下一回合将启动新的 Muse 会话。对 Muse 自己的 MCP 配置的更改不会启动新会话。

如果 Muse 拒绝恢复存储的会话，则该工具将启动一个新的 Muse 会话并记录原因。 Muse 在拒绝简历时不会运行任何内容，并且 OpenClaw 记录会保留对话。这涵盖了不再存在的会话以及 Muse 无法再打开的保留会话（例如，使用权限配置文件创建的会话在 `muse logout` 之后需要订阅的自动审阅者）。传输故障以及 Muse 报告的会话正在使用或过载，会使转弯失败，因此可能仍在运行的转弯永远不会重复。

每个新的 Muse 会话都会在当前提示之前接收保留的 OpenClaw 对话分支，包括在模型更改、拒绝恢复或提交的历史记录重置之后。此传输受 OpenClaw 的模型上下文读取器的限制。如果无法在该范围内安全地读取保留的上下文，则轮次将失败，而不是在没有其历史记录的情况下静默启动；压缩会话或切换到 `openclaw` 运行时。

新会话还接收 OpenClaw 工作区引导上下文，例如 `SOUL.md`、`USER.md` 和 `MEMORY.md`，以及正常会话、通道和引导模式过滤器。 MSP 没有系统消息或历史导入字段，因此该工具将此上下文作为第一个本机用户输入的前缀。恢复的会话不会重复该前缀。

`/new` 和 `/reset` 停止活动的 Muse 转动并删除绑定。在同一 OpenClaw 会话中倒回或切换分支也会使绑定无效，但仅限于历史更改提交之后。

停止转动会等待 Muse 的终止事件，而不仅仅是其中断确认。如果 Muse 在五秒内没有稳定下来，harness会在释放尝试之前关闭主机。

`muse serve` 进程按工作区、凭证和只读状态进行池化，并在五分钟空闲后关闭。

## <a id="transcript"></a> 成绩单

每个已完成的 Muse 项目（辅助文本、推理、工具调用和工具结果）在 Muse 完成后立即写入 OpenClaw 会话记录，并由 Muse 会话和项目 ID 键入，因此重试的写入不会重复条目。成绩单写入失败会导致轮次停止。

## <a id="mcp-servers"></a> MCP 服务器

Muse 拥有 MCP 配置。在Muse本身中添加MCP服务器； OpenClaw 的 `mcp.servers` 不会传递到 Muse 会话。

## <a id="limitations"></a> 限制

- OpenClaw 自己的代理工具（消息、`sessions_spawn`、浏览器和其他 OpenClaw 工具）不适用于 Muse。 MSP 没有客户端工具合同。 Muse 使用其本机工具和自己的 MCP 服务器。回复从最后一轮文本返回到频道。
- 无实时转向：在活动转弯期间发送的消息等待转弯完成。
- 没有本机压缩、独立完成或通过 Muse 提出 `/btw` 附带问题。 `/btw` 直接使用配置的模型提供程序，就像在其他非 Codex 运行时一样。
- 没有来自Muse的`ask_user`-风格的问题。
- MSP 没有系统指令字段。 OpenClaw 的额外系统提示被添加到每回合的用户消息之前。
- Muse 仅在网关主机上运行。它不适用于 OpenClaw 沙箱或远程节点执行。
- Muse 的内置 `echo` 提供程序无法通过 `muse serve` 使用，因此运行时始终需要有效的 Meta 凭证。
- Model 安装程序通过短暂的工具限制探测转动来检查新的 Meta API-key 登录。 Muse 无法强制执行该限制，因此当 `meta/*` 模型路由到 `muse` 时，在模型设置中激活新的 `meta` API 密钥会失败，并显示“Muse 代码无法强制执行此对话的工具策略”。请改用 Muse 自己的登录（请参阅 [Auth](#auth)）。

## <a id="live-tests"></a> 实时测试

```bash
# Real `muse` binary, no credentials: handshake, start/resume, auth error, interrupt, exit
OPENCLAW_MUSE_LIVE_HOST=1 node scripts/run-vitest.mjs \
  --config test/vitest/vitest.live.config.ts extensions/muse/src/runtime.live.test.ts

# Docker, offline after setup: fake MSP host behind a real Gateway
pnpm test:docker:muse-runtime

# Docker, real Muse: approve the printed MUSE_DEVICE_CODE in the browser,
# or pass OPENCLAW_MUSE_LIVE_KEY=<key> instead of device auth
OPENCLAW_MUSE_LIVE_AUTH=device pnpm test:docker:live-muse
```

Docker 通道使用一次性网关；凭证仅存在于容器中。实时通道是选择加入的，并检查真实回复、网关重新启动后的召回、允许一次 shell 批准以及 `muse logout` 后的登录错误。

## <a id="related"></a> 相关内容

- [元提供商](/providers/meta)
- [Agent 运行时](/concepts/agent-runtimes)
- [Agent harness 插件](/plugins/sdk-agent-harness)
