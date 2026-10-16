---
summary: "选择 OpenAI 运行时并了解本机 Codex 身份验证"
doc-schema-version: 1
read_when:
  - "您需要知道转弯是在 OpenClaw 还是本机 Codex harness上运行"
  - "您正在将 openai、codex 和 agentRuntime 名称映射到层"
  - "您正在调试本机 Codex 应用程序服务器帐户选择"
title: "OpenAI 运行时和 Codex 身份验证"
sidebarTitle: "运行时和 Codex 身份验证"
---

## <a id="naming-map"></a> 命名映射

| 你看到的名称                            | 层             | 含义                                                                                  |
| --------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| `openai`                                | 提供者前缀   | 标准OpenAI模型路线；路由事实决定隐式运行时间。                 |
| `codex` 插件                          | 插件            | 捆绑插件，提供原生 Codex 应用服务器运行时和 `/codex` 聊天控制。 |
| provider/model `agentRuntime.id: codex` | 代理运行时     | 强制使用本机 Codex 应用程序服务器harness来匹配嵌入式转弯。                   |
| `/codex ...`                            | 聊天命令集  | Bind/control Codex 对话中的应用程序服务器线程。                               |
| `runtime: "acp", agentId: "codex"`      | ACP 会话路由 | 运行 Codex 到 ACP/acpx. 的显式后备路径                                 |

## <a id="implicit-agent-runtime"></a> 隐式代理运行时

当 provider/model 的 `agentRuntime` 策略未设置或为 `auto` 时，OpenAI 的 provider-owned 路由策略会根据有效端点和适配器选择隐式运行时：

| 有效路由事实                                                                                                                                                           | 隐式运行时      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 使用 `openai-responses` 的官方 Platform HTTPS 端点，或使用 `openai-chatgpt-responses` 的官方 ChatGPT HTTPS 端点；且未编写 provider 请求覆盖 | 可能选择 Codex |
| 已编写的 `openai-completions` 适配器                                                                                                                                           | OpenClaw              |
| 自定义端点                                                                                                                                                                 | OpenClaw              |
| 使用 HTTP 的显式官方精确端点                                                                                                                                     | 已拒绝              |
| 带有已编写的 provider/model 请求覆盖的路由                                                                                                                          | OpenClaw              |

有效模型范围的 `params.fastMode` / `params.fast_mode`、截止值和 `thinking` 值是类型化的代理运行时控件，而不是创作的提供程序请求参数。肯定推理支持和本机推理努力元数据也保留 Codex 选择。请参阅 [ 运行时选择 ](/concepts/agent-runtimes#runtime-selection) 以了解受支持的功能值和仍受保护的请求覆盖。

加载配置时添加的目录默认值不计为创作的请求覆盖。文件支持的 API-key SecretRefs 和秘密出口代理还保留了与官方平台响应路由的兼容性；使用该代理时，请保留官方 HTTPS 模型 `baseUrl`。

显式 `agentRuntime.id: "openclaw"` 在 OpenClaw 上保留 Codex-eligible 路由。显式 `agentRuntime.id: "codex"` 需要注册的 Codex harness；不支持的 routes/auth 会被拒绝，但编写的请求覆盖可以在执行前使用 Codex 声明的精确请求 OpenClaw 回退。当配方依赖于本机执行时，检查完成结果的实际利用。运行时兼容性不会建立凭证类型或计费：平台 API-key 身份验证和 ChatGPT/Codex 订阅身份验证保持不同。

单独的官方 Completions 适配器不会将受支持的模型固定到计量计费：较旧的配置使用带有 Codex 订阅身份验证的适配器。当两种凭证类型都符合条件时，自动选择优先选择订阅路径。该首选项不会更改隐式运行时，也不会要求为 API-only 配置安装 Codex。没有 `auth` 覆盖的文字提供程序 `apiKey` 仍然是合格配置文件之后的后备。所需的配置文件绑定、提供程序身份验证设置、配置的秘密引用和显式身份验证顺序仍然优先。当两种类型都符合条件时，编写的 OpenClaw 运行时选择更喜欢 API 路由；运行时兼容性是独立检查的。未固定的心跳和子代理模型继承其默认模型的路由意图。 Doctor 在保存模型参考迁移后报告已解决的计费路由更改，包括消费者和 old/new 模型、路由和配置文件。

`openclaw doctor --fix` 将旧版 `codex/*` 和 `openai-codex/*` 模型引用、旧版 Codex 身份验证配置文件 ID 和旧版 Codex 身份验证顺序条目迁移到标准 `openai` 路由。迁移的模型引用接收模型范围的 `agentRuntime.id: "codex"`；使用 `auth.order.openai` 进行新的身份验证顺序配置。

<Note>
仅当未配置主要模型时，新的 OpenAI 设置才会应用 GPT-5.6 主要模型。添加或刷新 OpenAI 身份验证会保留现有的显式选择，包括 `openai/gpt-5.5`，除非您显式使用 `models auth login --set-default` 或 `models set`。仅当您需要对代理模型进行 API-key 身份验证时，才使用 API-key 身份验证配置文件。
</Note>

## <a id="native-codex-app-server-auth"></a> 原生 Codex app-server 认证

原生 Codex app-server harness 会在满足条件的精确官方 HTTPS 路由隐式选择 `openai/*` 模型引用时使用它，或者在 provider/model `agentRuntime.id: "codex"` 显式选择它时使用它。其认证仍然基于账户。OpenClaw 按以下顺序选择认证：

1. 为代理按顺序排列的 OpenAI 认证配置文件，优先使用 `auth.order.openai` 下的配置。运行 `openclaw doctor --fix` 可迁移较旧的遗留 Codex 认证配置文件 id 和认证顺序。
2. 本机 Codex 帐户，仅在明确 `appServer.homeScope: "user"` 选择加入且没有主机凭据或帐户选择拥有该路由时。即使 Codex 已登录，普通 OpenClaw 会话也会默认到隔离的代理主目录。准备好的 OpenClaw 凭据保留在该主目录中； OpenClaw 从未将它们登录到本机用户主目录。
3. 仅对于本地 stdio app-server 启动，并且仅当 app-server 报告没有账户时：`CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

通过用户主页选择加入，状态和目录读取会向 Codex 询问其本机登录信息，而无需将凭据导入到 OpenClaw 配置文件中。全新的身份验证刷新会观察本机登录和注销。本机 API-key 和订阅帐户选择其匹配的路由。模型运行时选择使用与思考元数据相同的路由和帐户；无法选择不可用的运行时间。当您需要 OpenClaw- 拥有的配置文件时，显式身份验证导入仍然可用。

如果您之前依赖于自动使用本机 Codex 登录，请使用 `openclaw models auth login --provider openai` 登录并选择生成的 OpenClaw 配置文件。在模型设置中选择检测到的 Codex 会重复使用符合条件的 OpenClaw 凭据，或在测试连接之前打开支持的 OpenAI 登录流程。取消或失败的登录不会推广该路线。如果登录后验证失败，请选择已保存的登录信息重试，无需再次登录。安装程序不再仅仅因为存在本机登录而启用用户主目录共享。现有的显式 `homeScope: "user"` 设置仍然是可选的；删除该设置以使用隔离会话。本机会话采用和监督保持不变。现有个人 Codex 历史记录不会被移动或删除，并且普通 OpenClaw 会话在每个代理 Codex 主目录中保持持久。

默认的每个代理 `codex-home/auth.json` 不是运行时身份验证存储。如果您在那里复制或安装了 Codex CLI 凭证，请在开始本机 Codex 轮次之前将它们导入代理的 OpenClaw 身份验证存储中。将 `<agent-id>` 替换为拥有此 Codex 主目录的已配置代理：

```bash
openclaw migrate plan codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai
openclaw migrate apply codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai --yes
```

本地 ChatGPT/Codex 订阅登录不会被替换，只是因为网关进程还具有用于直接 OpenAI 模型或嵌入的 `OPENAI_API_KEY`。 env API-key 回退仅适用于本地 stdio 无帐户路径；它永远不会通过 WebSocket 应用程序服务器连接发送。当选择订阅样式的 Codex 配置文件时，OpenClaw 还会将 `CODEX_API_KEY` 和 `OPENAI_API_KEY` 保留在生成的 stdio 应用程序服务器子级之外，并通过应用程序服务器登录 RPC 发送选定的凭据。

当该订阅配置文件因 Codex 使用限额而被阻止时，OpenClaw 会将该配置文件标记为已阻止，直到 Codex 公布的重置时间，并让认证顺序轮换到下一个 `openai:*` 配置文件，而不会更改所选模型，也不会退出 Codex harness。一旦重置时间过去，该订阅配置文件即可再次使用。

聊天 `/status` 报告所选运行时当前准备帐户的身份验证模式。本机登录与 OpenClaw 配置文件不同；它不满足不可用的显式配置文件引脚。
