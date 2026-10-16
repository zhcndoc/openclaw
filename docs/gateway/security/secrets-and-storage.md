---
summary: "OpenClaw 写入磁盘的内容、哪些文件保存凭据以及如何处理日志和记录"
read_when:
  - "决定在网关主机上备份或加密哪些内容"
  - "锁定状态和配置文件权限"
  - "查看会话记录和日志可以包含哪些内容"
title: "秘密、存储和日志"
sidebarTitle: "秘密和存储"
---

## <a id="deployment-and-host-trust"></a> 部署和主机信任

- 网关主机全盘加密；如果主机是共享的，则首选网关的专用 OS 用户帐户。
- 已发布的包依赖关系：`pnpm-lock.yaml` 是经过审查的源依赖关系图。插件默认打包bundle运行时依赖；本机重插件在安装时从精确固定的直接依赖关系中解析它们，并且根 `openclaw` 包也在安装时解析依赖关系。根和插件 tarball 既不提供 `npm-shrinkwrap.json` 也不提供 `package-lock.json`。请参阅 [ 依赖锁定](/gateway/security/dependency-locking)。
- 安全文件操作：OpenClaw 使用 `@openclaw/fs-safe` 进行根范围文件访问、原子写入、存档提取、临时工作区和秘密文件助手。本机模式在 macOS/Linux 上默认为 **off**，在 Windows 上默认为 **auto**，其中安全凭证读取需要匹配的本机帮助程序。仍支持显式模式设置；禁用或忽略 Windows 帮助程序会使这些读取不可用。详细信息：[安全文件操作](/gateway/security/secure-file-operations)。
- 共享 Slack 工作区风险：如果 Slack 中的每个人都可以向机器人发送消息，则核心风险是委派工具权限 - 任何允许的发送者都可以在代理策略内引发工具调用（`exec`、浏览器、network/file 工具），来自一个发送者的 prompt/content 注入可能会影响共享 state/devices/outputs，如果共享代理具有敏感的 credentials/files，则任何允许的发件人都可能通过工具使用来驱动渗漏。使用单独的 agents/gateways 和最少的工具来实现团队工作流程；确保个人数据代理的私密性。
- 公司共享代理（可接受的模式）：当使用代理的每个人都处于同一信任边界（例如一个公司团队）并且代理严格限于业务范围时，很好。在专用 machine/VM/container 上运行它，使用专用 OS 用户 + 专用 browser/profile/accounts，并且不要将该运行时登录到个人 Apple/Google 帐户或个人密码 manager/browser 配置文件中。在同一运行时混合个人和公司身份会破坏分离并增加个人数据暴露风险。

## <a id="secrets-on-disk"></a> 磁盘上的密钥

假设 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何内容都可能包含密钥或私人数据：

| 路径                                           | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw.json`                                | 配置可能包含令牌（网关、远程网关）、提供商设置和允许列表。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `credentials/**`                               | 通道凭据（例如 WhatsApp 凭据）、配对允许列表、旧版 OAuth 导入数据。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `state/openclaw.sqlite`                        | 共享运行时状态，包括本机 MCP OAuth access/refresh 令牌、动态客户端注册密钥和发现状态。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `agents/<agentId>/agent/openclaw-agent.sqlite` | 每个代理的运行时状态，包括模型身份验证配置文件。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `agents/<agentId>/agent/auth-profiles.json`    | 旧版模型身份验证迁移源；doctor 会将受支持的记录导入每个代理的 SQLite 数据库。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `agents/<agentId>/agent/codex-home/**`         | 每个代理的 Codex 应用服务器账户、配置、技能、插件、原生线程状态和诊断信息（默认）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `$CODEX_HOME/**` 或 `~/.codex/**`              | 本机 Codex 运行时状态。普通harness只能通过显式 `plugins.entries.codex.config.appServer.homeScope: "user"` 来访问它。当其解析的主范围为 `"user"` 时，单独的监督连接将访问它，这是未设置时 stdio 或 Unix 的默认值。包含本机 Codex 帐户、配置、插件和线程存储。监督列出源元数据并保留持续聊天的主要本机分支，然后打开该连接；分支将持久的用户和助理历史记录复制到经过身份验证、模型锁定的 OpenClaw 聊天中。仅对所有者控制的网关启用。请参阅 [Codex harness ](/plugins/codex-harness/native-features#share-threads-with-codex-desktop-and-cli) 和 [Codex 监督 ](/plugins/codex-supervision)。 |
| `secrets.json`（可选）                      | 由 `file` SecretRef 提供商（`secrets.providers`）使用的基于文件的密钥载荷。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `agents/<agentId>/agent/auth.json`             | 旧版兼容文件；发现静态 `api_key` 条目时会将其清除。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `agents/<agentId>/agent/openclaw-agent.sqlite` | 每个代理的运行时状态，包括可能包含私人消息和工具输出的会话记录及转录内容。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `agents/<agentId>/sessions/**`                 | 旧版会话迁移源和存档，可能包含私人消息和工具输出。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 捆绑插件包                        | 已安装的插件（及其 `node_modules/`）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `sandboxes/**`                                 | 工具沙箱工作区；可以在沙箱内累积文件 read/written 的副本。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### <a id="credential-storage-map"></a> 凭据存储映射

也可用于备份决策：

- WhatsApp: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- Telegram 机器人令牌：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；符号链接被拒绝）
- Discord 机器人令牌：config/env 或 SecretRef（env/file/exec/store 提供商）
- Slack 代币：config/env （`channels.slack.*`）
- 配对允许列表：`~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）／`<channel>-<accountId>-allowFrom.json`（非默认账户）
- 模型身份验证配置文件：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`（`auth_profile_store`）
- MCP OAuth 会话：`~/.openclaw/state/openclaw.sqlite`（`mcp_oauth_stores`）
- 旧版 OAuth 导入：`~/.openclaw/credentials/oauth.json`

强化：保持权限严格（目录上为 `700`，文件上为 `600`）；在网关主机上使用全盘加密；如果主机是共享的，则首选专用 OS 用户帐户。

### <a id="file-permissions"></a> 文件权限

- `~/.openclaw/openclaw.json`：`600`（仅限用户read/write）
- `~/.openclaw`：`700`（仅用户可访问）

`openclaw doctor` 可以发出警告并建议收紧这些权限。

正常的配置写入、恢复和秘密文件更新保留现有状态根的权限，包括操作员配置的组共享根。新的状态根目录和私有子目录保留为 `700`；配置、备份和秘密文件仍然是 `600`。这不会使组可写状态根成为针对该组的安全边界：即使成员无法读取原始文件，也可以替换目录条目。仅与受信任的管理员共享状态根。对于仅应访问工作区文件的 sidecar，请改为在私有状态根外部配置工作区。

### <a id="workspace-.env-files"></a><a id="workspace-env-files"></a> 工作区 `.env` 文件

OpenClaw 会为代理和工具加载工作区本地的 `.env` 文件，但绝不会让它们悄悄覆盖网关运行时控制：

- 来自不受信任工作区 `.env` 文件的提供商凭证环境变量会被阻止——例如 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY`、`FIRECRAWL_API_KEY`，以及已安装的受信任插件声明的提供商身份验证密钥。请改为将提供商凭证放入网关进程环境、`~/.openclaw/.env`（`$OPENCLAW_STATE_DIR/.env`）、配置中的 `env` 块，或通过可选的登录 shell 导入。
- 任何以 `OPENCLAW_` 开头的密钥都会被阻止从不受信任的工作区 `.env` 文件中获取，从而保留整个运行时命名空间，因此默认情况下会阻止未来的 `OPENCLAW_*` 控件，而不是从签入或攻击者提供的 `.env` 内容中静默继承。
- 工作区 `.env` 覆盖同样会被禁止设置频道和提供商端点路由配置（例如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`、`AZURE_SPEECH_ENDPOINT`，以及其他以 `_ENDPOINT` 结尾的密钥），这样克隆的工作区就无法通过本地端点配置重定向捆绑连接器的流量。这些配置必须来自网关进程环境、全局运行时 dotenv、显式配置或 `env.shellEnv`。
- 受信任的 process/OS 环境变量、全局运行时 dotenv、配置 `env` 和启用的登录 shell 导入仍然适用 - 这仅限制工作区 `.env` 文件加载。

工作区 `.env` 文件通常与代理代码放在一起，容易被误提交，或者被工具写入；阻止提供商凭证可以防止克隆的工作区替换为攻击者控制的提供商账户。

### <a id="logs-and-transcripts"></a> 日志和转录

OpenClaw 将会话记录存储在 [ 每个代理 SQLite 数据库 ](/reference/database-schemas#database-layout) 中，以实现会话连续性和可选内存索引 - 任何具有文件系统访问权限的 process/user 都可以读取它们。将磁盘访问视为信任边界，锁定`~/.openclaw`权限；在单独的 OS 用户或主机下运行代理以实现更强的隔离。

网关日志可能包括工具摘要、错误和 URL；会话记录可以包括粘贴的机密、文件内容、命令输出和链接。

- File 日志存储具有仅限所有者 （`0600`） 权限的原始记录。日志尾部 （`logs.tail`）、控制台输出、diagnostics/support 捆绑包和 remote/OTel 独立导出掩码敏感值。直接文件读取是原始的；像 agent/state 数据库一样保护它们。会话记录、工具参数、工具结果和 `.env` 读取保留其原始文本，包括凭据。
- 通过 `logging.redactPatterns` 添加日志和诊断的自定义模式（令牌、主机名、内部 URL）；这些模式不会改变模型上下文或转录本。
- 分享诊断信息时，优先使用 `openclaw status --all`（可直接粘贴，且已脱敏），而不是原始日志。
- 如果不需要长期保留，请清理旧的会话转录和日志文件。

详情： [日志](/gateway/logging)

## <a id="secret-scanning"></a> 密钥扫描

CI 在每个跟踪的常规文件上运行仓库内 `scripts/detect-private-keys.mts` 扫描仪，除了并置的 `*.test.ts` 夹具和 iOS Fastfile 之外；拉取请求运行扫描仪的基本分支的副本，如果基本分支缺少它，则失败。本地 `detect-private-key` 预提交挂钩对预提交交给它的文本文件运行相同的扫描器。如果 CI 失败，请删除或轮换提交的密钥材料，然后在本地重现：

```bash
node scripts/detect-private-keys.mts
```
