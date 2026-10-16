---
summary: "配置格式和位置、重新启动、网页搜索、config.apply 恢复和浏览器控制"
title: "配置基础知识"
read_when:
  - "您是第一次编辑配置"
  - "您需要网络搜索、浏览器控制或配置恢复"
---

## <a id="config-basics"></a> 配置基础

<AccordionGroup>
  <Accordion id="what-format-is-the-config-where-is-it" title="配置是什么格式？它在哪里？">
    OpenClaw 会从 `$OPENCLAW_CONFIG_PATH` 读取一个可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）。如果文件缺失，它会使用相对安全的默认值，包括默认工作区 `~/.openclaw/workspace`。
  </Accordion>

  <Accordion id="i-set-gateway-bind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized" title='我设置了 gateway.bind：“lan”（或“tailnet”），现在没有任何声音/UI 说未经授权'>
    非回环绑定 **需要有效的 gateway 认证路径**：共享密钥认证（token 或 password），或者在配置正确的支持身份感知的反向代理后使用 `gateway.auth.mode: "trusted-proxy"`。

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    - `gateway.remote.token` / `.password` **not** 自行启用本地网关认证；仅当 `gateway.auth.*` 未设置时，本地调用路径才能使用 `gateway.remote.*` 作为后备。
    - 对于密码认证，请设置 `gateway.auth.mode: "password"` 以及 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果通过 SecretRef 显式配置 `gateway.auth.token` / `.password` 并且未解析，则身份验证将停止，而不会回退到远程凭据。
    - 共享秘密 Control UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password`（存储在 app/UI 设置中）进行身份验证。身份承载模式（例如 Tailscale Serve 或 `trusted-proxy`）使用请求标头 - 避免将共享机密放入 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机回环反向代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`，并在 `gateway.trustedProxies` 中添加一个回环条目。

  </Accordion>

  <Accordion id="why-do-i-need-a-token-on-localhost-now" title="为什么我现在需要本地主机上的令牌？">
    OpenClaw 默认强制启用 gateway 认证，包括回环。若未配置显式认证路径，启动时会解析为 token 模式，并为该次启动生成仅运行时可用的 token，因此本地 WS 客户端必须进行认证。这会阻止其他本地进程调用 Gateway。

    在新的环回启动时，网关在 `/readyz` 之前准备标准的同一用户 CLI 设备凭证，因此正常的 `openclaw` CLI 调用可以进行身份​​验证，而无需保留生成的令牌。其他客户端仍然需要明确的共享秘密或批准的设备配对。

    当客户端需要在重启之间使用稳定的密钥时，请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。你也可以选择密码模式，或为支持身份感知的反向代理选择 `trusted-proxy`。对于开放的回环访问，请显式设置 `gateway.auth.mode: "none"`。`openclaw doctor --generate-gateway-token` 可随时生成 token。

  </Accordion>

  <Accordion id="do-i-have-to-restart-after-changing-config" title="修改配置后需要重启吗？">
    网关监视配置并支持热重载：`gateway.reload.mode: "hybrid"`（默认）热应用安全更改并重新启动关键更改。 `off` 禁用配置重新加载；早期的 `hot` 和 `restart` 模式已停用。大多数 `tools.*`、`agents.*` 策略、`session.*` 和 `messages.*` 更改会立即应用，根本不需要重新加载操作； `gateway.*` binding/port 更改需要重新启动。
  </Accordion>

  <Accordion id="how-do-i-enable-web-search-and-web-fetch" title="如何启用网络搜索（和网络获取）？">
    `web_fetch` 无需 API key 即可运行。`web_search` 取决于你选择的提供商：

    | 提供者 | 无需 key | 环境变量 |
    | --- | --- | --- |
    | Brave | No | `BRAVE_API_KEY` |
    | DuckDuckGo | 是（基于非官方 HTML-） | - |
    | Exa | No | `EXA_API_KEY` |
    | Firecrawl | No | `FIRECRAWL_API_KEY` |
    | Gemini | No | `GEMINI_API_KEY` |
    | Grok | 否（xAI OAuth 或 key） | `XAI_API_KEY` |
    | Kimi | No | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` |
    | MiniMax 搜索 | No | `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY` |
    | Ollama 网页搜索 | 本地：是（需要`ollama signin`）；主办：无 | 主办：`OLLAMA_API_KEY` |
    | Perplexity | No | `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY` |
    | SearXNG | 是（自托管） | `SEARXNG_BASE_URL` |
    | Tavily | No | `TAVILY_API_KEY` |

    Grok 还可以复用模型认证中的 xAI OAuth（`openclaw onboard --auth-choice xai-oauth`）。

    **推荐**：运行 `openclaw configure --section web` 并选择一个提供商。

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
      },
      tools: {
        web: {
          search: {
            enabled: true,
            provider: "brave",
            maxResults: 5,
          },
          fetch: {
            enabled: true,
            provider: "firecrawl", // optional; omit for auto-detect
          },
        },
      },
    }
    ```

    各提供商特定的网页搜索配置位于 `plugins.entries.<plugin>.config.webSearch.*` 下。为兼容旧版，`tools.web.search.*` 的提供商路径仍会加载，但新配置中不应再使用。Firecrawl 的网页抓取后备配置位于 `plugins.entries.firecrawl.config.webFetch.*` 下。

    - 白名单：添加 `web_search`/`web_fetch`/`x_search`，或者使用 `group:web` 同时允许这三者。
    - `web_fetch` 默认启用。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 会从可用凭据中自动检测第一个可用的抓取后备提供商；官方 Firecrawl 插件提供该后备。
    - 守护进程会从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/tools/web)。

  </Accordion>

  <Accordion id="config-apply-wiped-my-config-how-do-i-recover-and-avoid-this" title="config.apply 擦除了我的配置。我该如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**；只提供部分对象会删除其他所有内容。

    目前 OpenClaw 已尽量防止大多数意外覆盖：

    - OpenClaw- 拥有的配置写入在写入之前验证完整的更改后配置。
    - 无效或破坏性的OpenClaw-拥有的写入被拒绝并保存为`openclaw.json.rejected.*`。
    - 当整个结果验证时，Startup 可以使用符合条件的单文件配置中的固定规则迁移旧密钥，从而将先前的配置保留在 `.bak` 环中。其他无效编辑停止启动；热重载会跳过无效编辑，而不重写 `openclaw.json`。
    - `openclaw doctor --fix` 拥有启动迁移之外的修复功能，可以恢复最后一次已知的良好状态，并将被拒绝的文件另存为 `openclaw.json.clobbered.*`。

    恢复方法：

    - 查看 `openclaw logs --follow` 中的 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 检查活动配置旁边最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 运行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 仅使用 `openclaw config set` 或 `config.patch` 把需要的键复制回去。
    - 没有最后一次已知的有效负载或被拒绝的有效负载：从备份恢复，或重新运行 `openclaw doctor` 并重新配置 channels/models.
    - 如果出现意外丢失：带上你最后已知的配置或备份提交 bug。本地编码代理通常可以根据日志或历史重建可工作的配置。

    避免这种情况：使用 `openclaw config set` 进行小更改，使用 `openclaw configure` 进行交互式编辑，使用 `config.schema.lookup` 来检查不熟悉的路径（返回浅模式节点和直接子摘要），使用 `config.patch` 进行部分 RPC 编辑 - 保留 `config.apply` 进行完整配置替换。面向代理的 `gateway` 运行时工具拒绝重写 `tools.exec.ask` / `tools.exec.security`，即使通过旧版 `tools.bash.*` 别名也是如此。

    文档：[Config](/cli/config)、[Configure](/cli/configure)、[Gateway troubleshooting](/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion id="how-do-i-run-a-central-gateway-with-specialized-workers-across-devices" title="如何跨设备运行由专门工作人员组成的中央网关？">
    常见模式：**one Gateway**（例如 Raspberry Pi）加上 **nodes** 和 **agents**。

    - **Gateway（中心）**：负责 channels（Signal/WhatsApp）、路由、会话。
    - **节点（设备）**：Macs/iOS/Android作为外设连接并公开本地工具，例如`system.run`和`camera`； Mac 还可以在本机面板中呈现托管小部件。
    - **代理（工作人员）**：针对特殊角色（例如操作与个人数据）的单独 brains/workspaces。
    - **Agents（worker）**：为特殊角色（例如运维 vs 个人数据）分离出的不同“大脑/工作区”。
    - **TUI**：连接网关并交换机agents/sessions.

    文档：[Nodes](/nodes)、[Remote access](/gateway/remote)、[Multi-Agent Routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[TUI](/web/tui)。

  </Accordion>

  <Accordion id="can-the-openclaw-browser-run-headless" title="OpenClaw浏览器可以无头运行吗？">
    是的：

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    默认值为 `false`（有头模式）。无头模式更容易在某些站点触发反机器人检测（X/Twitter 常常会阻止无头会话）。它使用相同的 Chromium 引擎，并适用于大多数自动化；主要区别是没有可见的浏览器窗口（需要视觉效果时请使用截图）。参见 [Browser](/tools/browser)。

  </Accordion>

  <Accordion id="how-do-i-use-brave-for-browser-control" title="如何使用Brave进行浏览器控制？">
    将 `browser.executablePath` 设置为 Brave 二进制文件（或任何基于 Chromium- 的浏览器）并重新启动网关。请参阅 [Browser](/tools/browser/configuration#use-brave-or-another-chromium-based-browser)。
  </Accordion>
</AccordionGroup>
