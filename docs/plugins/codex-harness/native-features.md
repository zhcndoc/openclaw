---
summary: "共享本机 Codex 线程、监督会话并启用本机插件和计算机使用"
read_when:
  - "您希望 OpenClaw 共享本机 Codex 主页"
  - "您想使用本地现有的 Codex config.toml 并登录"
  - "您正在启用 Codex 监督"
  - "您正在启用本机 Codex 插件或计算机使用"
title: "本机 Codex 状态和功能"
sidebarTitle: "本机状态和功能"
---

将 OpenClaw 代理连接到本机 Codex 状态和 Codex- 拥有的功能的选择加入功能。 [Codex harness](/plugins/codex-harness) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness#where-each-section-moved) 列出每个部分。

## <a id="share-threads-with-codex-desktop-and-cli"></a> 与 Codex Desktop 和 CLI 共享线程

默认的 `appServer.homeScope: "agent"` 会将每个 OpenClaw 代理与操作员的原生 Codex 状态隔离开来。若想让所有者能够检查并管理与 Codex Desktop 和 Codex CLI 显示的相同原生线程，请启用用户 Codex 主目录：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            homeScope: "user",
          },
        },
      },
    },
  },
}
```

用户主模式支持本地管理的 stdio 进程或共享 Unix 套接字传输。它在设置时使用 `$CODEX_HOME`，否则使用 `~/.codex`，包括该家庭的本机 Codex 身份验证、配置、插件和线程存储。 OpenClaw 不会将 OpenClaw 身份验证配置文件注入此应用程序服务器，即使代理的模型路由具有存储的 OpenAI 配置文件也是如此。相反，本机帐户会在两个方向上根据路由进行验证：

- 订阅路由要求原生主目录已登录 ChatGPT。如果某个回合报告缺少订阅凭据，请在该主目录中运行 `codex login`。
- A 平台 （API-key） 路线拒绝使用 ChatGPT 订阅登录的本地家庭，因此 API-billed 路线永远不会默默地花费该计划。使用 `codex login --with-api-key` 登录该主页，或切换到 `homeScope: "agent"` 并让 OpenClaw 注入其已持有的密钥。

存储的 OpenAI 配置文件可以与 `homeScope: "user"` 共存；OpenClaw 会为代理范围的连接保留该配置文件，但不会将其交给原生主目录。使用 `openclaw models auth list --provider openai` 检查存储的配置文件，并使用 `openclaw models auth logout <profileId> --yes` 移除不再需要的配置文件。

所有者轮流获得 `codex_threads` 工具：列出、搜索、读取、分叉、重命名、存档和恢复本机线程。 fork一个线程以在OpenClaw中继续它；该分叉附加到当前 OpenClaw 会话，并保持 ID 从其他本机 Codex 客户端可读。它在第一个用户轮流后出现在本机线程列表中。归档需要明确确认该线程在其他地方已关闭。当还启用监督时，转录本字段和突变需要匹配的 `supervision.allowRawTranscripts` 或 `supervision.allowWriteControls` 选择加入。

不要通过彼此独立受管的 stdio App Server 并发恢复或写入同一个线程。Codex 只会在同一个 App Server 内协调活动写入者，而不会跨独立进程协调。对于普通的用户主目录 stdio 会话，分叉是安全的共存方式。

`appServer.homeScope: "user"` 本身不控制机队目录。当插件处于活动状态时，会启用本机会话发现；设置 `sessionCatalog.enabled: false` 将其从 OpenClaw 侧边栏删除，而不禁用 Codex。目录使用单独的监督连接；如果没有明确的 `appServer` 连接设置，该连接默认为托管用户主目录 stdio，而普通harness仍处于代理范围内。两条路径均遵循显式 `appServer` 设置。当普通harness也应共享本机状态时，如上所述显式设置 `homeScope: "user"`。

<a id="use-an-existing-local-configtoml" />

## <a id="use-an-existing-local-config.toml"></a><a id="use-an-existing-local-config-toml"></a> 使用本地现有的config.toml

连接到同一本地 Codex 应用服务器以重用现有的 `$CODEX_HOME/config.toml`（默认为 `~/.codex/config.toml`）、登录和本机线程。 Codex 拥有加载该文件、受信任的项目配置及其正常配置优先级。您无需将TOML复制到OpenClaw中或通过OpenClaw再次登录。

在 macOS 或 Linux 上，保持现有 Codex 守护程序运行。如果您使用 Codex 的独立托管安装并且其守护程序未运行，请使用以下命令启动它：

```bash
codex app-server daemon start
```

该命令可以安全地重复并在其 JSON 响应中报告控制套接字。对于其他安装，请使用现有的本地 App Server 的 Unix 套接字；不要针对已由不同进程拥有的线程启动另一个应用程序服务器。

将这些插件设置合并到您的 OpenClaw 配置中：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "unix",
            homeScope: "user",
          },
          supervision: {
            enabled: true,
          },
        },
      },
    },
  },
}
```

如果没有 `url`，则 OpenClaw 连接到 `$CODEX_HOME/app-server-control/app-server-control.sock`。网关和本机守护程序必须解析相同的 Codex 主目录。对于自定义套接字，将 `appServer.url` 设置为 `"unix:///absolute/path/to/codex.sock"`。 OpenClaw 连接到正在运行的服务器；它不会启动或停止该守护进程。

要让本机 Codex 选择模型和提供程序，请从 **Codex** 侧边栏打开存储或空闲会话，并从其会话查看器发送消息。生成的模型锁定聊天使用本机配置进行初始选择，并在以后的回合中保留本机所有权。检查该聊天中的 `/codex binding` 以检查实际选择。普通的OpenClaw聊天仍然使用他们的OpenClaw模型路线； `homeScope: "user"` 本身并不使每个聊天都继承 TOML 模型。请参阅 [ 分支行为](/plugins/codex-supervision#branch-from-a-local-session)。

OpenClaw 仍然应用其会话工具、指令和执行策略，而无需重写您的 TOML。一旦制定了该政策，普通后续人员就会重复使用它。初始附件或更改的策略可能需要 Codex 首先卸载空闲线程。如果轮次报告会话策略切换失败，请完成本机工作并关闭该特定线程的其他视图，然后重新连接并重试。其他线程和守护进程可以保持运行。

现有的受监督对话在更新后保留其记录的本机搜索策略。如果在创建对话时禁用本机搜索，则新公布的提供商支持不会在该线程中启用它。从 **Codex** 侧边栏打开另一个存储或空闲的本机会话，并发送消息以使用当前本机搜索功能和 OpenClaw 工具策略创建新分支。

### <a id="credentials-and-account-ownership"></a> 凭证和帐户所有权

连接到共享守护进程重用其本机登录；它不会将该登录导入到 OpenClaw 身份验证配置文件中。对于 ChatGPT 登录，以下两个路径均使用 OAuth 和 Codex 应用服务器。区别在于谁拥有凭证。

| 方面                | 共享本机守护进程：Unix 传输和用户主目录                                                                                   | OpenClaw-托管 OAuth：托管 stdio 和代理主目录                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 登录源          | 所选 `CODEX_HOME` 中的本机 Codex 帐户。无需第二次登录 OpenClaw。                                       | 所选的 OpenClaw OAuth 配置文件。                                                                                                                                               |
| 切换至 Codex      | OpenClaw 无需将 OpenClaw 配置文件发送到 `account/login/start` 或替换守护程序的登录名即可进行连接。                      | OpenClaw 通过 `account/login/start` 发送访问令牌、ChatGPT 帐户 ID 和计划类型。它不发送刷新令牌。                                               |
| 凭证存储    | Codex 保留其配置的本机凭证存储，例如文件或密钥环。                                                       | OpenClaw 在其凭证存储中保留持久凭证。 Codex 将传递的令牌保存在内存中，而不是 `auth.json` 中。代理的 Codex 配置和线程仍然存在。   |
| 令牌刷新         | Codex 刷新其本机 ChatGPT 登录。附加不会在 OpenClaw 中创建另一个刷新所有者。                               | Codex 向 OpenClaw 请求新的访问令牌。 OpenClaw 刷新原配置文件；刷新令牌归该所有者所有。                                                |
| 后来轮到           | 继续使用本机身份验证。保留线程订阅不会复制或固定 OpenClaw 凭证。                 | 重用的客户端保留其原始配置文件并刷新所有者。更改配置文件下的帐户会选择新客户端，而不是重定向旧客户端的刷新请求。 |
| 网关环境   | 附加不会更改已运行的守护程序的环境。它自己的启动环境和本机配置仍然适用。 | 准备好的托管启动清除了 `CODEX_API_KEY`、`OPENAI_API_KEY` 和 `CODEX_ACCESS_TOKEN`，因此继承的值不会替换所选的切换。                               |
| CLI 和桌面登录 | 连接使用本机身份验证，无需将该主页登录到 OpenClaw-selected 帐户。                               | 默认`<agentDir>/codex-home`与原生home分开；切换不会覆盖 CLI 或桌面登录。                                                     |

存储的 OpenClaw 配置文件可以与本机登录共存，但它不是受监督的本机聊天的后备凭据。本机身份验证失败必须在本机连接中解决； OpenClaw 不会借用其普通配置文件或 API-key 后备来更改该聊天帐户。

**A 模型锁定聊天不是帐户锁定聊天。** 同一本机守护程序的消费者共享其身份验证边界。更改其登录名可能会影响使用该守护进程的其他线程和本机客户端； OpenClaw 不会为每个受监督的聊天创建单独的 OpenAI 帐户。在帐户更改后发送更多工作之前，请验证预期的本机帐户。不要假设注销 OpenClaw 配置文件会注销本机 Codex，反之亦然。

当您需要单独的帐户所有权时，请使用具有显式 OpenClaw 帐户选择的普通代理范围会话。代理范围本身并不意味着每人一次登录：共享配置文件保持共享，并且默认情况下不会在代理之间复制 OAuth 刷新凭据。请参阅 [Auth 凭证语义](/auth-credential-semantics#agent-copy-portability) 和 [ 每人模型帐户](/concepts/multi-user#per-person-model-accounts)。

这些规则描述 Codex 连接的身份验证，而不是 shell 子进程或单独配置的 OpenClaw 工具使用的凭据。对于这些边界、刷新失败处理和显式凭据导入，请参阅 [Codex 身份验证和环境隔离](/plugins/codex-harness-reference/auth)。

## <a id="supervise-codex-sessions"></a> 监督 Codex 会话

相同的 `codex` 插件可以列出来自网关计算机和选择加入的配对节点的非存档 Codex 会话。存储或空闲的网关本地会话可以创建模型锁定的聊天，该聊天反映其有限的持久用户和助理历史记录。其私有绑定使用本机快照、主分支和后续轮次的监督连接，而普通 Codex 会话仍处于代理范围内。第一个主线程启动完全使用 Codex 为快照分支返回的模型和提供程序。稍后恢复将选择保留为 Codex 的本机配置；外部 OpenClaw 模型和后备链永远不会取代它。在明确的无其他运行者确认后，可以归档存储的和空闲的本地行。活动源无法创建分支或存档；仍然可以打开现有的受监督聊天。配对节点会话公开有界的、分页的转录本。当节点通告并允许所需的目录和 CLI-resume 命令时，合格的存储或空闲配对节点行还支持 `operator.admin` 的延续。该流程恢复节点上确切的本机线程，而不是创建网关本地分支；配对节点存档仍然不可用。

有关设置、分支规则、配对节点限制、元数据暴露和故障排除，请参见 [监督 Codex 会话](/plugins/codex-supervision)。

## <a id="native-codex-plugins"></a> 原生 Codex 插件

本机 Codex 插件支持在与 OpenClaw harness转弯相同的 Codex 线程中使用 Codex 应用程序服务器自己的应用程序和插件功能。 OpenClaw 不会将 Codex 插件转换为合成 `codex_plugin_*` OpenClaw 动态工具。

`codexPlugins` 仅影响选择原生 Codex harness 的会话。 它对内置 harness 运行、普通 OpenAI provider 运行、ACP conversation bindings 或其他 harness 不产生任何影响。

迁移后的最小配置：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

当 OpenClaw 建立 Codex harness 会话或替换过期的 Codex 线程绑定时，会计算 Thread app 配置；它不会在每个 turn 都重新计算。更改 `codexPlugins` 后，请使用 `/new`、`/reset`，或重启 gateway，以便未来的 Codex harness 会话使用更新后的 app 集合启动。

关于迁移资格、app 库存、破坏性操作策略、询问机制和原生插件诊断，请参见 [原生 Codex 插件](/plugins/codex-native-plugins)。

OpenAI-side 应用程序和插件访问由登录的 Codex 帐户控制，对于 Business 和 Enterprise/Edu 工作区，由工作区应用程序控件控制。请参阅 [ 将 Codex 与 ChatGPT 计划结合使用 ](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)，了解 OpenAI 的帐户和工作区控制概述。

## <a id="computer-use"></a> 计算机使用

计算机使用有其自己的设置指南：[Codex 计算机 Use](/plugins/codex-computer-use)。

简短版本：OpenClaw 不供应桌面控制应用程序或本身执行桌面操作。它准备 Codex 应用程序服务器，验证 `computer-use` MCP 服务器可用，然后让 Codex 在 Codex- 模式轮流期间拥有本机 MCP 工具调用。

## <a id="rich-mcp-forms"></a> Rich MCP 表格

OpenClaw 接受 Codex 的 `openaiForm` 引出变体用于 `openai/elicitation/create` 扩展，并保留旧版 `openai/form` 变体。普通MCP表单和URL请求保留自己的协议语义；打开 URL 并不确认该步骤已完成。

Codex 在转发表单之前应用其本机审批策略。对于OpenClaw-创建的线程中的手动应用程序，当工具需要交互式输入时，请使用提示权限模式，例如Guarded或Workspace。完全访问权限映射到本机 `never` 审批策略，该策略可以在 OpenClaw 收到这些表单之前拒绝这些表单。 OpenClaw 不会打开第二个 MCP 连接来绕过该策略。

Control UI 显示选项描述和 base64 图像缩略图，包括当只有某些选项有图像时的后备图块。 HTTPS 缩略图使用显式外部图像链接，而不是自动专用网络浏览器获取。字符串建议允许自定义答案。字符串数组接受建议的选择和每行一个自定义条目，并对每个提交的值应用相同的字符串、模式、长度、唯一性和基数约束。不安全或不受支持的模式将被拒绝，而不是无限制地评估。

显式资源选择返回提供的 URI，而不是其显示标题。单资源和多资源字段都接受已弃用的 `type: "file"` 别名。默认值必须引用提供的资源并显示为初始选择；清除可选默认值不会默默地恢复它。资源预览和上传需要绑定到待处理表单及其原始 MCP 运行时的功能。借助该功能，显式选择会选择提供的资源，隐式选择会从提交的集中删除资源，而 file/directory 上传控件仅返回主机允许的 URI。预览操作读取链接的 MCP 资源或打开原始服务器的 MCP 应用程序工具。 Web MCP 不支持上传的应用程序表面不得宣传该功能。要求不可用操作的表格被完全拒绝，并给出解释；它永远不会部分显示或替换为无范围的 URI 文本框。

丰富的表单有 12 个字段，每个字段有 64 个选择，以及 16 个自定义数组条目。普通问题保留四个选项的限制。选择和语义输入不会被截断。在发布任何问题之前，无效、不受支持或超出限制的字段会拒绝整个表单。应答保留发起请求的轮次关联、取消和实时执行权限。
