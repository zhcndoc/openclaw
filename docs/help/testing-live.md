---
summary: "实时（联网）测试：模型矩阵、CLI 后端、ACP、媒体提供商、凭据"
read_when:
  - "运行实时模型矩阵 / CLI 后端 / ACP / 媒体提供商冒烟测试"
  - "调试实时测试的凭据解析"
  - "添加新的特定提供商实时测试"
title: "测试：实时套件"
sidebarTitle: "实时测试"
---

如需快速入门、QA 运行程序、unit/integration 套件和 Docker 流程，请参阅 [Testing](/help/testing)。本页面涵盖 **live**（网络接触）测试：模型矩阵、CLI 后端、ACP、媒体提供商和凭证处理。

此页是一个索引。实时测试套件共六页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                                        | 读它的时候                                                                   |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [快活抽烟和Android节点扫](/help/testing-live/quick-smokes)             | 您需要快速的临时烟雾或 Android 节点扫描。                         |
| [真人模型烟雾（轮廓键）](/help/testing-live/model-smoke)                           | 您正在通过直接层和网关层吸烟供应商或模型。     |
| [CLI 后端和 APN 通道](/help/testing-live/cli-backends)                               | 您正在驱动本地 CLI 后端，或检查 APNs 代理的可达性。      |
| [ACP 绑定和 Codex 应用程序服务器通道](/help/testing-live/acp-and-codex)                     | 您正在调试 ACP 绑定或 Codex 应用程序服务器harness。                 |
| [OpenAI 长上下文和实时模型矩阵](/help/testing-live/long-context-and-matrix) | 您需要长上下文校样、配方或精选模型列表。 |
| [媒体提供商直播通道](/help/testing-live/media-providers)                             | 您正在运行图像、音乐、视频或其他媒体提供商扫描。         |

## <a id="live-tests-vs-your-real-gateway"></a> 实时测试与您的真实网关

实时测试套件和临时冒烟测试绝不能干扰已经在提供真实流量的网关（无论是您的还是其他操作员的）：

- 自带网关：使用进程内网关（[Live模型smoke](/help/testing-live/model-smoke)上的第2层）或使用隔离状态目录（`OPENCLAW_STATE_DIR=<scratch>`）和空闲端口启动开发实例。当真实网关正在运行时，请勿绑定默认网关端口（18789）。
- 不要对本会话中并非由您启动的服务执行 `openclaw gateway stop`/`restart`（或 `launchctl`/`systemctl`/tmux 等效命令）——那是操作员正在使用的实时实例。请先获得明确批准。
- 需要真实数据吗？将实时 state/DB 复制到您的开发状态目录中并针对该副本进行测试。实时网关状态的就地迁移也需要明确的批准。

## <a id="credentials-(never-commit)"></a><a id="credentials-never-commit"></a> 凭据（切勿提交）

Live 测试发现凭据的方式与 CLI 相同。实际影响：

- 如果 CLI 可用，live 测试也应该能找到相同的密钥。
- 如果某个 live 测试提示“no creds”，排查方式应与排查 `openclaw models list` / 模型选择相同。
- 无法解析其凭据的 OpenClaw Live Suite 必须在具有 Vitest 测试上下文 `skip(reason)` 的报告器中明显跳过，否则会失败；它决不能在未到达提供者的情况下通过绿色，因为未到达提供者的绿色运行不是活生生的证据。

- Per-agent 身份验证配置文件：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 中的 SQLite 凭证行（这就是“配置文件密钥”在实时测试中的含义）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 旧版 OAuth 目录：`~/.openclaw/credentials/`（存在时会复制到临时的 live home 中，但不是主 profile-key 存储）
- Local live 运行复制活动配置（`agents.*.workspace` / `agentDir` 覆盖被剥离）并通过 auth-store reader/writer API 暂存每个代理存储的 SQLite auth credential/state 行，而不是通过复制其数据库或其目录的其余部分。代理会话、`workspace/` 和 `sandboxes/` 数据未暂存。运行程序还复制旧版 `credentials/` 目录并支持外部 CLI 身份验证 files/dirs（`.claude.json`、`.claude/.credentials.json`、`.claude/settings*.json`、`.claude/backups`、`.codex/auth.json`、 `.codex/config.toml`、`.gemini`、`.minimax`）进入临时测试室。

如果您想依赖环境密钥，请在本地测试之前导出它们，或者使用上面列出的通道页面上的 Docker 运行器以及显式的 `OPENCLAW_PROFILE_FILE`。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/help/testing-live#live-codex-app-server-harness-smoke`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="live%3A-local-smoke-commands" /><a id="live-local-smoke-commands" />[Live：本地烟雾命令](/help/testing-live/quick-smokes#live-local-smoke-commands)
- <a id="live%3A-android-node-capability-sweep" /><a id="live-android-node-capability-sweep" />[直播：Android节点能力扫](/help/testing-live/quick-smokes#live-android-node-capability-sweep)
- <a id="live%3A-model-smoke-(profile-keys)" /><a id="live-model-smoke-profile-keys" />[Live：模型烟雾（轮廓键）](/help/testing-live/model-smoke#live-model-smoke-profile-keys)
- <a id="layer-1%3A-direct-model-completion-(no-gateway)" /><a id="layer-1-direct-model-completion-no-gateway" />[第1层：直接模型完成（无网关）](/help/testing-live/model-smoke#layer-1-direct-model-completion-no-gateway)
- <a id="layer-2%3A-gateway-%2B-dev-agent-smoke-(what-%22%40openclaw%22-actually-does)" /><a id="layer-2-gateway-+-dev-agent-smoke-what-@openclaw-actually-does" />[第2层：网关+开发代理smoke](/help/testing-live/model-smoke#layer-2-gateway-+-dev-agent-smoke-what-@openclaw-actually-does)
- <a id="live%3A-cli-backend-smoke-(claude%2C-gemini%2C-or-other-local-clis)" /><a id="live-cli-backend-smoke-claude-gemini-or-other-local-clis" />[Live：CLI 后端烟雾（Claude、Gemini 或其他本地 CLI）](/help/testing-live/cli-backends#live-cli-backend-smoke-claude-gemini-or-other-local-clis)
- <a id="live%3A-apns-http%2F2-proxy-reachability" /><a id="live-apns-http/2-proxy-reachability" />[Live：APN HTTP/2 代理可达性](/help/testing-live/cli-backends#live-apns-http/2-proxy-reachability)
- <a id="live%3A-acp-bind-smoke-(%2Facp-spawn-...---bind-here)" /><a id="live-acp-bind-smoke-/acp-spawn-bind-here" />[直播：ACP绑定烟雾](/help/testing-live/acp-and-codex#live-acp-bind-smoke-/acp-spawn-bind-here)
- <a id="live%3A-codex-app-server-harness-smoke" /><a id="live-codex-app-server-harness-smoke" />[Live：Codex应用程序服务器harnesssmoke](/help/testing-live/acp-and-codex#live-codex-app-server-harness-smoke)
- <a id="live%3A-openai-long-context" /><a id="live-openai-long-context" />[Live：OpenAI 长上下文](/help/testing-live/long-context-and-matrix#live-openai-long-context)
- <a id="long-context-hard-oracles" />[长上下文硬预言](/help/testing-live/long-context-and-matrix#long-context-hard-oracles)
- <a id="recommended-live-recipes" />[推荐直播食谱](/help/testing-live/long-context-and-matrix#recommended-live-recipes)
- <a id="live%3A-model-matrix-(what-we-cover)" /><a id="live-model-matrix-what-we-cover" />[Live：模型矩阵（我们涵盖的内容）](/help/testing-live/long-context-and-matrix#live-model-matrix-what-we-cover)
- <a id="aggregators-%2F-alternate-gateways" /><a id="aggregators-/-alternate-gateways" />[聚合器/备用网关](/help/testing-live/long-context-and-matrix#aggregators-/-alternate-gateways)
- <a id="deepgram-live-(audio-transcription)" /><a id="deepgram-live-audio-transcription" />[Deepgram live（音频转录）](/help/testing-live/media-providers#deepgram-live-audio-transcription)
- <a id="byteplus-coding-plan-live" />[BytePlus 编码计划直播](/help/testing-live/media-providers#byteplus-coding-plan-live)
- <a id="comfyui-workflow-media-live" />[ComfyUI工作流程媒体直播](/help/testing-live/media-providers#comfyui-workflow-media-live)
- <a id="image-generation-live" />[图像生成直播](/help/testing-live/media-providers#image-generation-live)
- <a id="music-generation-live" />[音乐一代直播](/help/testing-live/media-providers#music-generation-live)
- <a id="video-generation-live" />[视频生成直播](/help/testing-live/media-providers#video-generation-live)
- <a id="media-live-harness" />[媒体直播harness](/help/testing-live/media-providers#media-live-harness)

## <a id="related"></a> 相关内容

- [测试](/help/testing) - 单元、集成、QA 和 Docker 套件。
- [Tests](/reference/test) - 测试参考索引，每个读者作业一页
