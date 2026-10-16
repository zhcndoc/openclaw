---
summary: "数据位置、AGENTS.md 和 SOUL.md 放置、备份和卸载"
title: "东西在磁盘上的位置"
read_when:
  - "您需要查找、备份或移动 OpenClaw 数据"
  - "您正在决定代理指令文件的所属位置"
---

## <a id="where-things-live-on-disk"></a> 磁盘上的内容位置

<AccordionGroup>
  <Accordion id="is-all-data-used-with-openclaw-saved-locally" title="OpenClaw 使用的所有数据都保存在本地吗？">
    不是：**OpenClaw 自身的状态保存在本地**，但**外部服务仍然能看到你发送给它们的内容**。

    - **默认本地存储**：会话、记忆文件、配置和工作区都位于 Gateway 主机上（`~/.openclaw` 以及你的工作区目录）。
    - **必须远程**：发送到模型提供者（Anthropic/OpenAI/etc.）的消息会转到他们的API，聊天平台（Slack/Telegram/WhatsApp/etc.）将消息数据存储在他们的服务器上。
    - **由你控制数据留存范围**：本地模型会将提示词保留在你的机器上，但频道流量仍会经过相应频道的服务器。

    相关内容：[Agent workspace](/concepts/agent-workspace)、[Memory](/concepts/memory)。

  </Accordion>

  <Accordion id="where-does-openclaw-store-its-data" title="OpenClaw 的数据存储在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | 路径                                                               | 用途                                                            |
    | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                                 | 主配置（JSON5）                                                 |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                        | `openclaw doctor --fix` 的旧版 OAuth 迁移源           |
    | `$OPENCLAW_STATE_DIR/state/openclaw.sqlite`                         | 共享 SQLite 状态，包括共享身份验证配置文件                 |
    | `$OPENCLAW_STATE_DIR/secrets.json`                                  | 用于 `file` SecretRef 提供方的可选文件后端密钥载荷   |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`              | `openclaw doctor --fix` 的旧版身份验证迁移源             |
    | `$OPENCLAW_STATE_DIR/credentials/`                                  | 提供方状态（例如 `whatsapp/<accountId>/creds.json`）      |
    | `$OPENCLAW_STATE_DIR/agents/`                                       | 每个代理状态（agentDir + legacy/archive 会话工件）        |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/openclaw-agent.sqlite`  | 每个代理 SQLite 状态，包括本地身份验证配置文件、会话和成绩单 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                    | 旧会话迁移源和 archive/support 工件      |

    旧版单 agent 路径 `~/.openclaw/agent/*` 会由 `openclaw doctor` 迁移。

    旧版 `auth-profiles.json` 文件由 `openclaw doctor --fix` 导入；新登录写入 SQLite。代理本地配置文件会覆盖共享的通读基础。较旧的安装将该共享存储保留在主代理的数据库中，直到医生重新定位它；请参阅 [Auth 凭证语义](/auth-credential-semantics#agent-copy-portability)。

    你的**工作区**（AGENTS.md、memory 文件、skills 等）是单独的，通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion id="where-should-agents-md-soul-md-user-md-memory-md-live" title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该住在哪里？">
    它们位于**agent 工作区**中，而不是 `~/.openclaw`。

    - **工作区（每个 agent）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`memory/YYYY-MM-DD.md`。根目录中的小写 `memory.md` 仅用于旧版修复输入；当两个文件同时存在时，`openclaw doctor --fix` 可以将其合并到 `MEMORY.md` 中。
    - **State dir （`~/.openclaw`）**：配置、channel/provider 状态、身份验证配置文件、会话、日志、共享技能 （`~/.openclaw/skills`）。

    默认工作区是 `~/.openclaw/workspace`，可配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记”了内容，请确认 Gateway 每次启动都使用相同的工作区（远程模式使用的是**gateway 主机**上的工作区，而不是你本地笔记本上的）。

    提示：如果需要持久行为或偏好，最好让机器人把它**写入 AGENTS.md 或 MEMORY.md**，而不是依赖聊天历史。

    参见 [Agent workspace](/concepts/agent-workspace) 和 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion id="can-i-make-soul-md-bigger" title="我可以把SOUL.md变大吗？">
    可以。`SOUL.md` 是注入到 agent 上下文中的工作区启动文件之一。默认单文件注入上限为 `20000` 个字符；跨文件的总启动预算为 `60000` 个字符。

    更改共享默认值：

    ```json5
    {
      agents: {
        defaults: {
          bootstrapMaxChars: 50000,
          bootstrapTotalMaxChars: 300000,
        },
      },
    }
    ```

    或在 `agents.entries.*.bootstrapMaxChars` / `bootstrapTotalMaxChars` 下为某个 agent 单独设置。

    使用 `/context` 查看原始大小与注入后大小，以及是否发生了截断。保持 `SOUL.md` 重点描述语气、立场和个性；把操作规则放在 `AGENTS.md` 中，把持久事实放在 memory 中。

    参见 [Context](/concepts/context) 和 [Agent config](/gateway/config-agents)。

  </Accordion>

  <Accordion id="recommended-backup-strategy" title="推荐的备份策略">
    将你的**agent 工作区**放在一个**私有**的 git 仓库中，并把它备份到某个私有位置（例如 GitHub private）。这样可以保存 memory 以及 AGENTS/SOUL/USER 文件，并允许你以后恢复助手的“思维”。

    **not** 是否在 `~/.openclaw` 下提交任何内容（凭证、会话、令牌、加密秘密有效负载）。对于完整恢复，请分别备份工作区和状态目录。

    文档：[Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion id="how-do-i-completely-uninstall-openclaw" title="如何彻底卸载OpenClaw？">
    参见 [Uninstall](/install/uninstall)。
  </Accordion>

  <Accordion id="can-agents-work-outside-the-workspace" title="客服人员可以在工作空间之外工作吗？">
    可以。工作区是**默认 cwd** 和记忆锚点，而不是硬性沙箱。相对路径会解析到工作区内；如果未启用沙箱，绝对路径可以访问主机上的其他位置。若要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing) 或每个 agent 的沙箱设置。要把某个仓库设为默认工作目录，请把该 agent 的 `workspace` 指向仓库根目录——OpenClaw 仓库本身只是源代码，所以除非你有意让 agent 在其中工作，否则应保持工作区分离。

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/path/to/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="remote-mode-where-is-the-session-store" title="远程模式：会话存储在哪里？">
    会话状态归**gateway 主机**所有。在远程模式下，你关心的会话存储位于远程机器上，而不是你本地的笔记本上。参见 [Session management](/concepts/session)。
  </Accordion>
</AccordionGroup>
