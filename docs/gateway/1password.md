---
summary: "使用 1Password 插件、捆绑技能或官方 MCP 与 OpenClaw"
read_when:
  - "您想要 API 密钥位于 openclaw.json 之外并位于 1Password 内"
  - "您运行无头网关并需要服务帐户身份验证"
  - "Homebrew 升级破坏了手动 1Password 执行提供程序"
  - "您希望代理使用 1Password 读取、注入或维护机密"
title: "1密码"
---

OpenClaw 以四种独立方式与 **1Password** 配对：

- **Config Secrets：** `openclaw.json`中的任何[SecretRef](/gateway/secrets)字段在运行时都可以通过`op` CLI来解析，因此API密钥永远不会存在于配置文件中。
- **代理工作流程：** 捆绑的 `1password` 技能教代理登录并使用 `op` 读取或注入机密以完成自己的任务。
- **桌面环境：** 官方 1Password MCP 服务器允许交互式桌面代理批准访问 1Password 环境。
- **浏览器登录：** `claude-cli` 后端可以使用 Claude Code 的 Chrome 与 [1Password for Claude](https://support.1password.com/1password-claude/) 的集成，让代理无需登录网站即可登录网站密码曾经到达模型或 OpenClaw。

## <a id="requirements"></a> 要求

- [1密码CLI](https://developer.1password.com/docs/cli/get-started/)（`op`）安装在网关主机上。
- A 1无人值守插件路径的密码服务帐户。
- 对于直接技能工作流程，服务帐户、桌面应用程序集成或独立 `op signin`。

## <a id="resolve-config-secrets-with-the-plugin"></a> 使用插件解决配置机密

启用捆绑插件并创建其服务帐户令牌文件。在首先运行此命令的 shell 中将服务帐户的令牌导出为 `OP_SERVICE_ACCOUNT_TOKEN` - 该块将该值写入磁盘，然后从环境中清除它，因此如果没有它，您将获得一个空令牌文件：

```bash
openclaw plugins enable onepassword
mkdir -p ~/.openclaw/credentials/onepassword
chmod 700 ~/.openclaw/credentials/onepassword
printf '%s' "$OP_SERVICE_ACCOUNT_TOKEN" > \
  ~/.openclaw/credentials/onepassword/service-account-token
chmod 600 ~/.openclaw/credentials/onepassword/service-account-token
unset OP_SERVICE_ACCOUNT_TOKEN
```

当设置 `OPENCLAW_STATE_DIR` 时，使用该目录而不是 `~/.openclaw`。然后生成并应用 SecretRef 计划：

```bash
openclaw onepassword secretref setup \
  --openai-id op://Automation/OpenAI/credential \
  --anthropic-id op://Automation/Anthropic/credential \
  --plan-out ./openclaw-1password-secrets-plan.json

openclaw onepassword secretref status
openclaw secrets apply --from ./openclaw-1password-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from ./openclaw-1password-secrets-plan.json --allow-exec
openclaw secrets audit --check --allow-exec
openclaw secrets reload
```

设置命令至少需要一个目标。在应用计划之前，状态可能会报告提供程序未配置，同时仍报告 `prerequisites ready: yes`；申请后，`ready: yes` 确认提供者、受信任的 `op` 可执行文件和接受的非空令牌文件均已准备好。

该插件接受本机 `op://<vault>/<item>/<field>` 和 `op://<vault>/<item>/<section>/<field>` 引用。它仅解析已注册的 OpenClaw 凭证目标，限制并行 `op read` 调用，并强制关闭桌面应用程序集成。有关手动配置、自定义目标和单独审核的代理工具，请参阅 [ 插件指南](/plugins/onepassword)。

## <a id="the-1password-skill-for-agents"></a> 适用于代理的 1password 技能

OpenClaw 捆绑了 `1password` 技能，该技能教导代理选择可用的身份验证模式、验证访问权限，并优先选择 `op run` 或 `op inject` 而不是将秘密值写入磁盘。

代理将其用于故意超出插件狭隘合同的工作流程，例如创建或旋转项目或将凭据注入一次性命令。当凭证已连接到 OpenClaw SecretRef 目标时，拥有的 OpenClaw 工作流程应解析它；代理无需直接呼叫`op`。

## <a id="official-1password-mcp-server"></a> 官方1密码MCP服务器

官方 MCP 服务器是 [1Password Environments](https://developer.1password.com/docs/environments/mcp-server/) 的测试版桌面工作流程。它需要 1Password 桌面应用程序和每次交互的明确批准。它可以管理环境变量名称并通过内存中的 `.env` 文件将值挂载到本地进程中；秘密值不会返回到 MCP 客户端或模型。

它不提供对任意保管库项目的无头服务帐户访问，并且 OpenClaw 插件不会调用它。如果 MCP- 托管环境启动 OpenClaw 并已安装变量，请使用 OpenClaw 的 `env` SecretRefs 作为这些值。当网关本身应在启动或重新加载时解析 1Password 引用时，请使用该插件。

## <a id="browser-sign-in-with-1password-for-claude"></a> 使用 Claude 的 1Password 浏览器登录

[1Password for Claude](https://support.1password.com/1password-claude/) 允许 Claude 请求登录，而 1Password 浏览器扩展则通过加密通道将凭据直接填充到页面中。该秘密永远不会进入模型上下文、转录本或 OpenClaw。当 OpenClaw 运行 [`claude-cli` 后端 ](/gateway/cli-backends#claude-cli-specifics) 并启用 Claude Code 的 Chrome 集成时，代理任务可以将该流程用于需要真实登录会话的网站。

除了后端本身之外，这还需要什么：

- A macOS网关主机与Chrome， 这[克劳德在Chrome扩大](https://code.claude.com/docs/en/chrome)连接、1Password 桌面应用程序和 1Password 浏览器扩展（均8.12.28或稍后）。
- Claude Code 登录直接 Anthropic 计划（Pro、Max、Team 或 Enterprise）。 Chrome 集成不可通过 Amazon Bedrock、Google 云或其他第三方提供商提供。
- Anthropic 侧的一次性 1Password 连接：Claude 的 1Password 通过 Claude 桌面应用程序或 [1Password 指南 ](https://support.1password.com/1password-claude/) 中描述的扩展流程设置，目前是一个macOS 测试版。在 1Password Business 上，管理员必须首先在策略下启用“允许 AI 代理为用户自动填充”； Anthropic Team/Enterprise 计划也将集成关闭，直到所有者启用它。
- A [CLI 后端插件](/plugins/cli-backend-plugins)，将 `--chrome` 添加到 Claude 启动参数中；捆绑后端不启用 Chrome。
- A 网关主机上的人员：每个凭证使用都会显示在那里确认的 1Password 提示（例如使用 Touch ID）。在限制性执行策略下，浏览器工具调用自身也会首先以 OpenClaw 批准的方式转发到您的频道。

在将其连接到 OpenClaw 之前，请验证网关主机上交互式会话中的各个部分：运行 `claude --chrome`，确认扩展已连接，并检查 `claude-in-chrome` 工具是否包含凭证工具。如果它们没有出现在那里，它们也不会通过 OpenClaw 出现。

一次性密码由同一页面1Password填写；切勿通过聊天传递验证码或密码。无头或远程网关目前无法使用此流程，因为审批和浏览器都位于网关主机上。

## <a id="security-notes"></a> 安全说明

- 通过 exec 提供程序解析的秘密值保留在网关内存中；配置快照和 `config.get` 响应编辑 SecretRef 字段。
- 插件解析器和代理强制 `OP_LOAD_DESKTOP_APP_SETTINGS=false` 和 `OP_BIOMETRIC_UNLOCK_ENABLED=false`，因此无人值守读取无法触发桌面批准或 macOS 权限对话框。
- 在传递服务帐户令牌之前，插件会解析 `op` 可执行文件并拒绝其他本地帐户可写的路径或具有无法验证的 Windows ACL 或所有权的路径。绝对 `CLAW_1PASSWORD_OP` 覆盖也需接受相同的检查。
- A 解析器请求仅限于 32 个引用。读取一次运行四次，每次读取超时七秒；提供程序范围内的 90 秒超时涵盖了完全支持的批处理以及进程和权限检查开销。
- 切勿将秘密值放入 `openclaw.json`、日志或聊天中。将服务帐户的范围仅限于 OpenClaw 需要的保管库和项目。

## <a id="troubleshooting"></a> 故障排查

- `op` 丢失：在网关主机上安装 CLI，检查它是否在 `PATH` 上，或将 `CLAW_1PASSWORD_OP` 设置为其绝对路径。
- `op` 不受信任：使用当前用户或 root 拥有的可执行文件，并从可执行文件及其父链中删除 group/other 写访问权限。
- 身份验证失败：使用 `openclaw onepassword status` 检查插件令牌文件、其内容以及服务帐户的保管库权限。
- A 引用被拒绝：当名称很长或包含不受支持的 1Password 引用字符时，显式包含保管库并使用稳定的保管库、项目、部分和字段 ID。

### <a id="homebrew-command-symlinks"></a> Homebrew 命令符号链接

如果手动执行提供程序报告 `command must not be a symlink` 为 `/opt/homebrew/bin/op` 或 `/usr/local/bin/op`，请使用 [ 插件设置流程](/gateway/1password#resolve-config-secrets-with-the-plugin)。手动执行提供程序需要非符号链接命令。将 Homebrew 链接解析为版本化的 `Caskroom` 路径仅在该版本保持安装状态时有效；稍后的软件包升级或清理可以将其删除。

该插件针对每个解析器请求从网关进程的 `PATH` 解析 `op`，然后在传递服务帐户令牌之前检查真正的可执行文件及其父目录。现有的 `CLAW_1PASSWORD_OP` 覆盖可以命名稳定的绝对 Homebrew 链路并接收相同的检查。该插件在升级后遵循替换链接，而不将其版本目标存储在 `openclaw.json` 中。组或其他可写可执行文件仍然会失败，就像让另一个用户替换已检查路径的父目录一样。

迁移之前，将每个现有凭据目标映射到其旧命令读取的确切 1Password 引用。手册提供者可以将该参考放在 `args` 中并使用不相关的 SecretRef `id`；将该 ID 复制到插件中将选择不同的秘密或失败。如果 `onepassword` 已经命名了手动提供程序，请使用 `--provider-alias <alias>` 选择未使用的提供程序别名：替换该提供程序也会更改使用其别名的未列出的引用。如上所示创建插件令牌文件，然后生成具有显式映射的计划，例如：

```bash
openclaw onepassword secretref setup \
  --target 'models.providers.anthropic.apiKey=op://Automation/Anthropic/credential' \
  --target 'models.providers.openai.apiKey=op://Automation/OpenAI/credential' \
  --plan-out ./openclaw-1password-secrets-plan.json
```

在使用上面的状态、空运行、应用、审核和重新加载命令之前，请检查计划的提供程序别名和每个目标。仅在所有对旧手册提供者的引用均已移动后才删除该提供者；在该检查中包括身份验证配置文件和通道凭据。
