---
summary: "沙盒模式、主机文件夹绑定以及代理内存如何保留"
title: "沙箱和内存"
read_when:
  - "您正在启用或放松沙箱"
  - "内存并没有按照你期望的方式持续存在"
---

## <a id="sandboxing-and-memory"></a> 沙箱和内存

<AccordionGroup>
  <Accordion id="is-there-a-dedicated-sandboxing-doc" title="有专门的沙箱文档吗？">
    是：[沙盒](/gateway/sandboxing)。有关 Docker- 特定设置（Docker 或沙箱映像中的完整网关），请参阅 [Docker](/install/docker)。
  </Accordion>

  <Accordion id="docker-feels-limited-how-do-i-enable-full-features" title="Docker 感觉有限 - 如何启用全部功能？">
    默认镜像以安全优先运行，并且以 `node` 用户身份运行，因此不包含系统包、Homebrew 和捆绑浏览器。要获得更完整的设置：

    - 将 `/home/node` 与 `OPENCLAW_HOME_VOLUME` 一起保留，以便缓存得以保留。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES` 将系统依赖打包进镜像。
    - 将Playwright Chromium及其系统依赖项烘焙到`OPENCLAW_INSTALL_BROWSER=1`的映像中。

    文档：[Docker](/install/docker)、[浏览器](/tools/browser)。

  </Accordion>

  <Accordion id="can-i-keep-dms-personal-but-make-groups-public-sandboxed-with-one-agent" title="我可以保留 DM 的私密性，但与一名代理建立群组 public/sandboxed 吗？">
    是，如果专用流量为 **DMs**，公共流量为 **groups**。设置 `agents.defaults.sandbox.mode: "non-main"`，以便 group/channel 会话（非主密钥）在配置的沙箱后端中运行，而主 DM 会话保留在主机上。选择 `backend: "docker"` 为 Docker 或 `backend: "podman"` 为 Podman。通过 `tools.sandbox.tools` 限制沙盒会话中可用的工具。

    设置演练：[ 群组：个人 DM + 公共群组](/channels/groups#pattern-personal-dms-public-groups-single-agent)。主要参考：[网关配置](/gateway/config-agents/sandbox#agentsdefaultssandbox)。

  </Accordion>

  <Accordion id="how-do-i-bind-a-host-folder-into-the-sandbox" title="如何将主机文件夹绑定到沙箱中？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:container:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局和按代理的挂载会合并；当 `scope: "shared"` 时，会忽略按代理的挂载。对任何敏感内容都使用 `:ro`；挂载会绕过沙箱文件系统边界。

    OpenClaw 根据规范化路径和通过最深的现有祖先解析的真实路径验证绑定源，因此即使最终路径段尚不存在，符号链接父转义也会被拒绝。

    请参阅 [Sandboxing](/gateway/sandboxing#multiple-folders-for-one-agent) 和 [Sandbox 与工具策略与 Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion id="how-does-memory-work" title="记忆是如何运作的？">
    OpenClaw 内存是座席工作区中的 Markdown 文件：`memory/YYYY-MM-DD.md` 中的每日笔记、`MEMORY.md` 中的策划长期笔记（仅限 main/private 会话）。

    OpenClaw 还会在压缩总结对话之前静默执行一次 **压缩前内存刷新**，提醒模型先写入持久化笔记。它只会在工作区可写时运行（只读沙箱会跳过）；可通过 `agents.defaults.compaction.memoryFlush.enabled: false` 关闭。参见 [内存](/concepts/memory)。

  </Accordion>

  <Accordion id="memory-keeps-forgetting-things-how-do-i-make-it-stick" title="记忆总是忘记事情。我怎样才能让它粘住？">
    让机器人 **把事实写入内存**：长期笔记放在 `MEMORY.md` 中，短期上下文放在 `memory/YYYY-MM-DD.md` 中。提醒模型存储记忆通常就能解决问题。如果它仍然忘记，请确认网关每次运行时使用的是同一个工作区。

    文档：[内存](/concepts/memory)、[代理工作区](/concepts/agent-workspace)。

  </Accordion>

  <Accordion id="does-memory-persist-forever-what-are-the-limits" title="记忆会永远存在吗？有什么限制？">
    内存文件保存在磁盘上，会一直保留直到被删除；限制取决于你的存储空间，而不是模型。**会话上下文**仍受模型上下文窗口限制，因此长对话可能会被压缩或截断——这就是为什么需要内存搜索：它只把相关部分重新拉回上下文中。

    文档：[内存](/concepts/memory)、[上下文](/concepts/context)。

  </Accordion>

  <Accordion id="does-semantic-memory-search-require-an-openai-api-key" title="语义记忆搜索是否需要 OpenAI API 密钥？">
    否。 **OpenAI embeddings**（默认提供程序）可以在帐户授予嵌入访问权限时使用存储的 Codex OAuth 配置文件，或 API 密钥（`OPENAI_API_KEY` 或`models.providers.openai.apiKey`）。单独的“使用 ChatGPT 登录”令牌共享授予并不授权嵌入。运行 `openclaw memory status --deep` 检查您配置的帐户。

    To stay local， set `memory.search.provider: "local"` （GGUF/llama.cpp）.其他支持的提供程序：Bedrock、DeepInfra、Gemini（`GEMINI_API_KEY` 或 `memory.search.remote.apiKey`）、GitHub Copilot、LM Studio、Mistral、Ollama、OpenAI- 兼容、和航程。有关设置详细信息，请参阅 [Memory](/concepts/memory) 和 [Memory search](/concepts/memory-search)。

  </Accordion>
</AccordionGroup>
