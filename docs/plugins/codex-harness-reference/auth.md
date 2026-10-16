---
summary: "Codex 身份验证选择顺序、凭证处理和环境隔离"
read_when:
  - "您需要 Codex 授权选择订单"
  - "您正在共享或隔离本机 Codex 主页"
  - "您正在将 Codex 凭证或资产迁移到代理中"
title: "Codex 身份验证和环境隔离"
sidebarTitle: "身份验证和隔离"
---

Codex 使用哪个凭证，以及应用程序服务器子进程继承什么凭证。 [Codex harness参考 ](/plugins/codex-harness-reference) 的一部分； [ 每个部分移动的位置](/plugins/codex-harness-reference#where-each-section-moved) 列出每个部分。

## <a id="auth-and-environment-isolation"></a> 认证和环境隔离

在默认的每个代理主目录中，stdio 启动使用 Codex 的临时凭证存储，包括由 `appServer.command` 或 `OPENCLAW_CODEX_APP_SERVER_BIN` 选择的自定义命令。命令包装器必须转发 Codex 的 `-c` 配置参数。对于使用显式 `app-server` 子命令启动的 stdio，OpenClaw 会在该子命令之前对 `-c` / `--config` 覆盖进行分组，保留它们的顺序并保留包装器前缀和其他参数。当标志出现在 `app-server` 的两侧时，这可以防止 Codex 丢弃较早的覆盖。当 OpenClaw 拥有 auth 时，OpenClaw 的临时凭证存储覆盖保持在最后；本机用户主目录身份验证未更改。工作区写入轮流还保留这些参数中的显式 `sandbox_workspace_write` 临时根排除，包括附加的 `-ckey=value` 标志和布尔值后面的 TOML 注释。最后一个显式值获胜。显式的轮流沙箱策略和网络代理权限配置文件保持其现有的优先级。

OpenClaw 按以下顺序提供身份验证：

1. 为该 agent 显式指定或按顺序排列的 OpenClaw 认证 profile。
2. 仅适用于 API-key 路由，从 `CODEX_API_KEY` 到 `OPENAI_API_KEY` 的准备好的密钥或本地 stdio 回退。

应用程序服务器在此模式下不会读取现有的 `codex-home/auth.json`。如下所述显式导入该文件。仅当应用程序服务器应拥有并使用运营商的本机 Codex 帐户时，才设置 `appServer.homeScope: "user"`。

有关移交内容、谁刷新以及共享本机帐户如何影响受监督聊天的并排说明，请参阅 [ 凭据和帐户所有权](/plugins/codex-harness/native-features#credentials-and-account-ownership)。

在此模式下，任何一个 home 中都不会写入任何凭证文件。订阅配置文件作为 `chatgptAuthTokens` 类型的 `account/login/start` 请求移交，Codex 将其安装为内存中外部身份验证而不是持久保存；临时凭证存储涵盖 API-key 登录，否则将写入 `CODEX_HOME/auth.json`。

令牌刷新是反向的，因此长期秘密永远不会离开 OpenClaw。 Codex 仅持有短期访问令牌，并且在未经授权的响应时，它会通过同一连接将 `account/chatgptAuthTokens/refresh` 请求发送回 OpenClaw。 OpenClaw 根据其自己的身份验证配置文件存储进行刷新并返回新的访问令牌，因此刷新令牌保留在 SQLite 中。在应用程序服务器的超时时间内未响应的刷新将失败，而不是回退到另一个凭据。刷新失败会使共享客户端不再重用；现有的租约耗尽，下一个请求启动一个新的客户端。如果工作区发生更改，请重试该请求。如果凭据无法刷新，请使用 `openclaw models auth login --provider openai` 再次登录并选择该配置文件。共享客户端在重复使用之前会重新检查所选配置文件，因此更改同一配置文件 ID 下的帐户也会选择新客户端。

当 OpenClaw 看到 ChatGPT 订阅风格的 Codex auth profile（OAuth 或 token 凭据类型）时，它会从启动的 Codex 子进程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。 这样可以让 Gateway 级别的 API key 可用于 embeddings 或直接的 OpenAI 模型， 同时避免原生 Codex app-server 的交互意外通过 API 计费。

显式 Codex API-key 配置文件和本地 stdio env-key 后备使用应用程序服务器登录而不是继承的子进程环境。 WebSocket 应用程序服务器连接不接收网关环境 API-key 回退；使用显式身份验证配置文件或远程应用程序服务器自己的帐户。

Stdio应用程序服务器启动默认继承OpenClaw的进程环境。 OpenClaw 拥有 Codex 应用程序-服务器帐户桥，并将 `CODEX_HOME` 设置为该代理的 OpenClaw 状态下的每个代理目录。这使得 Codex 配置、帐户、插件 cache/data 和线程状态的范围仅限于 OpenClaw 代理，而不是从操作员的个人 `~/.codex` 主目录泄漏。

设置 `appServer.homeScope: "user"` 以与 Codex Desktop 和 CLI 共享本机 Codex 状态。这种本地用户主模式支持托管 stdio 和显式 Unix 传输。它在设置时使用 `$CODEX_HOME`，否则使用 `~/.codex`，包括本机身份验证、配置、插件和线程。 OpenClaw 跳过应用程序服务器的身份验证配置文件桥。经过验证的所有者可以使用 `codex_threads` 列出（使用可选的 `search` 过滤器）、读取、分叉、重命名、存档和取消存档这些线程。在OpenClaw中继续线程之前分叉一个线程；独立的 Codex 进程不协调同一线程的并发写入程序。

`homeScope` 选择加入适用于普通的harness会话。即使普通会话共享用户主目录，托管网络搜索和最终确定也使用私有临时主目录和 OpenClaw 身份验证。通过 Codex 会话创建的聊天改为使用其私有监督连接，这会保留主分支和未来恢复的本机连接的身份验证和提供程序配置。如果该受监督轮次完成工具工作而没有最终答案，则 OpenClaw 不会借用主机凭据来生成最终答案。它提供 [ 已解决工具后备 ](/plugins/codex-harness-runtime#final-answers-after-settled-tool-work)，而无需重复已完成的操作。

在模型锁定的受监督 Chat 中，`codex_threads` 不能附加到不同的分叉，也不能归档 Chat 绑定的原生线程。列表和仅元数据读取仍然可用。原始转录读取需要 `allowRawTranscripts`；当它被禁用时，列表搜索也会被拒绝，因为原生搜索可能匹配转录预览。对不属于其他 OpenClaw Chat 的无关线程进行重命名、取消归档、分叉（分离）和归档，需要 `allowWriteControls`。这两个选项都不能绕过已锁定的绑定。

OpenClaw 不会为正常的本地应用程序服务器启动重写 `HOME`。 Codex-run 子进程（例如 `openclaw`、`gh`、`git`）、云 CLI 和 shell 命令可查看正常进程主目录，并可以找到用户主目录配置和令牌。 Codex还可能发现`$HOME/.agents/skills`和`$HOME/.agents/plugins/marketplace.json`； `.agents` 发现有意与操作员主页共享，并且与隔离的 `~/.codex` 状态分开。

在默认代理范围内，OpenClaw插件和OpenClaw技能快照仍然流经OpenClaw自己的插件注册表和技能加载器；个人Codex `~/.codex` 资产没有。如果您有有用的 Codex CLI 技能或来自 Codex 主目录的插件（应成为独立 OpenClaw 代理的一部分），请显式清点它们：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

凭据需要通过敏感迁移路径处理，因为默认的 agent 范围不会直接使用复制或挂载的 `codex-home/auth.json`。将 `<agent-id>` 替换为拥有此 Codex home 的已配置 agent：

```bash
openclaw migrate plan codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai
openclaw migrate apply codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai --yes
```

如果部署需要额外的环境隔离，请将这些变量添加到 `appServer.clearEnv`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` 仅影响生成的 Codex 应用程序服务器子进程。 OpenClaw 在本地启动规范化期间从此列表中删除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持指向所选代理或用户范围，而 `HOME` 保持继承状态，因此子进程可以使用正常的用户主状态。

## <a id="upgrading-from-2026.9.4-with-codex-sign-in"></a><a id="upgrading-from-2026-9-4-with-codex-sign-in"></a> 通过 Codex 登录从 2026.9.4 升级

If `openai:default`仅通过本机存在Codex登录后，您可以准备2026.9.4在升级到之前2026.9.5，不再提供该覆盖层。对于常规的`main`共享商店所有者，通过以下方式完成新的设备代码登录OpenClaw并验证持久化的配置文件：

```bash
openclaw models auth login --provider openai --method device-code --profile-id openai:default --agent main
openclaw models auth list --agent main --json
```

保留 `--profile-id`：在 2026.9.4 上省略它可以在不同的 ID 下导入并删除旧的覆盖。 `openai:default` 应出现在上面未过滤的列表中。其他代理 [ 继承共享配置文件 ](/auth-credential-semantics#agent-copy-portability)，包括具有不相关本地凭据的代理。具有相同 ID 的本地配置文件会覆盖它；使用 `--agent <id>` 单独登录只是为了创建或替换有意的本地 OpenAI 覆盖。
