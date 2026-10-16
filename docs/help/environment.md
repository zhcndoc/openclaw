---
summary: "OpenClaw 从哪里加载环境变量以及优先级顺序"
read_when:
  - "你需要知道会加载哪些环境变量，以及按什么顺序加载"
  - "你正在调试网关中缺失的 API 密钥"
  - "你正在编写提供商认证或部署环境文档"
title: "环境变量"
---

OpenClaw 从多个来源提取环境变量。正常规则是 **永远不会覆盖现有值**。对于 OpenClaw- 安装的 systemd 服务，全局 `.env` 可以仅替换 OpenClaw 记录为托管的服务值。运营商拥有的服务价值仍然优先。工作区 `.env` 文件是信任度较低的源：OpenClaw 在应用优先级之前会忽略工作区 `.env` 中的提供者凭据和受保护的运行时控件。

Systemd 启动会保留配置引用的托管进程值，包括 `$include` 文件中的 `${VAR}` 和 `$VAR` SecretRef 简写。这还涵盖了运算符 `EnvironmentFile=` 提供的值。受信任的 dotenv 文件和当前配置引用中缺少的托管值将从网关进程环境中删除。

## <a id="precedence-(highest-to-lowest)"></a><a id="precedence-highest-to-lowest"></a> 优先级（从高到低）

1. **进程环境**（网关进程已经从父shell/daemon获得的环境）。
2. 当前工作目录中的**`.env`**（dotenv默认）。它不会覆盖。 OpenClaw 忽略此文件中的提供者凭据和受保护的运行时控件。
3. **Global `.env`** 位于 `~/.openclaw/.env`，也称为 `$OPENCLAW_STATE_DIR/.env`。建议用于提供商 API 密钥。除了记录的 OpenClaw- 管理的 systemd 服务值外，它不会覆盖。
4. **Config `env` block** in `~/.openclaw/openclaw.json`（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅用于填充缺失的预期变量。

在使用默认状态目录的新 Ubuntu 安装上，OpenClaw 也会读取 `~/.config/openclaw/gateway.env`。该文件是全局 `.env` 之后的兼容性回退。如果两个文件都存在并且不一致，则 OpenClaw 保留 `~/.openclaw/.env` 并打印警告。

如果配置文件完全丢失，则跳过步骤 4。如果启用，Shell 导入仍会运行。

## <a id="supported-operator-facing-variables"></a> 支持的面向运维人员的变量

以下变量是面向运维人员的受支持环境变量契约。未记录的 `OPENCLAW_*` 变量属于内部实现细节，可能会在不另行通知的情况下消失。

### <a id="paths-and-instances"></a> 路径和实例

| 变量                  | 用途                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`           | 覆盖用于 OpenClaw 路径默认值的主目录。                                         |
| `OPENCLAW_STATE_DIR`      | 覆盖可变状态目录。                                                                |
| `OPENCLAW_CONFIG_PATH`    | 覆盖当前使用的配置文件路径。                                                                |
| `OPENCLAW_WORKSPACE_DIR`  | 覆盖默认代理工作区。                                                                |
| `OPENCLAW_PROFILE`        | 选择命名配置文件及其隔离的默认值。                                                    |
| `OPENCLAW_GIT_DIR`        | 覆盖开发渠道更新所使用的源代码检出目录。                                    |
| `OPENCLAW_INCLUDE_ROOTS`  | 允许 `$include` 从其他根目录解析。                                                   |
| `OPENCLAW_SQLITE_LIBRARY` | 在 macOS](/install/bun-compatibility#sqlite-library-selection) 上覆盖 [Bun 的 SQLite 库。 |

#### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 会替代系统 home 目录（`$HOME` / `os.homedir()`），用于内部 OpenClaw 路径默认值。这包括默认 state 目录、配置路径、agent 目录、凭据、安装器引导工作区，以及 `openclaw update --channel dev` 使用的默认开发检出目录。

`OPENCLAW_HOME` 不授予 OS 帐户的本机网关服务的所有权。网关服务管理命令将重新安置的家庭视为隔离状态。当需要单独的本机服务标识时，请使用 OS 帐户主目录和命名配置文件。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上的 Termux `PREFIX` home 回退 > `os.homedir()`

空白值和文字字符串 `undefined` 和 `null`（修剪后）被视为未设置。在这种情况下，CLI 主路径显示使用 `~`；有效覆盖使用 `$OPENCLAW_HOME`。

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 还可以设置为波形符路径 （e.g. `~/svc`），在使用前使用相同的 OS 主回退链进行扩展。

显式路径变量（例如 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR`）仍然优先。 OS-account 任务（例如 shell 启动文件检测、包管理器设置和主机 `~` 扩展）可能仍使用真实系统主目录。

### <a id="temporary-compile-cache"></a> 临时编译缓存

当设置了 `NODE_COMPILE_CACHE` 时，打包的 OpenClaw 使用 `NODE_COMPILE_CACHE/openclaw/<version>/<build>`，否则使用 OS 临时目录下的 `node-compile-cache/openclaw`。网关工作线程和子进程重用相同的构建命名空间，包括在运行构建的源签出时。网关主线程保持未缓存状态：Node 的同步缓存刷新可以在启动或关闭时停止其事件循环。工作线程在自己的线程上保留现有的刷新边界。继承的活动缓存需要启动重生；在具有 `execve` 的平台上，服务进程保持其 PID。 Node 权限模式保留已激活的调用者缓存，因为它可以禁止进程替换。

短期 CLI 命令保留其现有策略：通过 `NODE_COMPILE_CACHE` 选择加入缓存，并且源 CLI 入口点保持不缓存。显式释放预热仍会填充缓存。 `NODE_DISABLE_COMPILE_CACHE` 禁用网关及其工作线程的缓存。

发布版本使用版本 ID 的稳定 16 字符哈希。在 Windows 上，OpenClaw 会跳过超过 200 个字符的缓存路径并发出警告，并禁用子进程的不安全继承缓存，从而避免 Node 启动挂起。

编译缓存引导程序所有者在独立进程中开始尽力维护，因此清理可以在简短的 CLI 命令退出后完成。 Node 权限模式会跳过维护，因为子进程无法继承其文件系统限制。 `openclaw` 子树之外的其他应用程序的缓存将被保留。

清理以有界的方式流式传输组合的发布缓存，逐出最旧的观察到的文件以定位 512 MiB 和 4,096 个文件，并删除超过 7 天的字节码。每个通道最多访问 16,384 个条目，并在 30 秒后停止调度文件系统工作。文件系统锁串行化清理；废弃的锁可以在五分钟后回收。只有完成的通行证才会提前每小时的维护时间戳。不完整的传递使下一次调用有资格继续修剪。这些是维护目标，而不是硬盘配额：并发写入可能会暂时超过它们，并且大量积压可能需要多次调用。

### <a id="gateway-and-authentication"></a> 网关和身份验证

| 变量                                  | 用途                                                                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_GATEWAY_URL`                    | 覆盖客户端使用的远程网关 URL。                                                                                                                                                                         |
| `OPENCLAW_GATEWAY_PORT`                   | 覆盖本地网关端口。                                                                                                                                                                                         |
| `OPENCLAW_GATEWAY_TOKEN`                  | 为网关服务器和客户端提供令牌身份验证。                                                                                                                                                             |
| `OPENCLAW_GATEWAY_PASSWORD`               | 为网关服务器和客户端提供密码身份验证。                                                                                                                                                          |
| `OPENCLAW_MAX_PREAUTH_CONNECTIONS_PER_IP` | 每个已解析客户端 IP 的未完成未验证 WebSocket 连接上限（默认 `128`；正整数）。请参阅 [ 预验证连接限制 ](/gateway/security/rate-limiting#unauthenticated-websocket-connections)。 |

### <a id="provider-credentials"></a> 提供者凭证

核心及捆绑的提供商插件识别以下凭据和提供商选择变量。如果需要范围限定的凭据，而不是整个进程范围内的单一值，请优先使用各提供商的配置或 SecretRef 字段。

`AI_GATEWAY_API_KEY`、`ANTHROPIC_ADMIN_API_KEY`、`ANTHROPIC_ADMIN_KEY`、`ANTHROPIC_API_KEY`、`ANTHROPIC_OAUTH_TOKEN`、`ARCEEAI_API_KEY`、`AZURE_OPENAI_API_KEY`、`AZURE_SPEECH_API_KEY`、`AZURE_SPEECH_KEY`、 `AZURE_SPEECH_REGION`、`BASETEN_API_KEY`、`BRAVE_API_KEY`、`BYTEPLUS_API_KEY`、`BYTEPLUS_SEED_SPEECH_API_KEY`、`CEREBRAS_API_KEY`、`CHUTES_API_KEY`、`CHUTES_OAUTH_TOKEN`、`CLAWROUTER_API_KEY`、 `CLOUDFLARE_AI_GATEWAY_API_KEY`、`CODEX_API_KEY`、`COHERE_API_KEY`、`COMFY_API_KEY`、`COMFY_CLOUD_API_KEY`、`COPILOT_GITHUB_TOKEN`、`DASHSCOPE_API_KEY`、`DEEPGRAM_API_KEY`、`DEEPINFRA_API_KEY`、 `DEEPSEEK_API_KEY`、`ELEVENLABS_API_KEY`、`EXA_API_KEY`、`FAL_API_KEY`、`FAL_KEY`、`FEATHERLESS_API_KEY`、`FIRECRAWL_API_KEY`、`FIREWORKS_API_KEY`、`FISH_API_KEY`、 `FISH_AUDIO_API_KEY`、`GCLOUD_PROJECT`、`GEMINI_API_KEY`、`GMI_API_KEY`、`GOOGLE_API_KEY`、`GOOGLE_APPLICATION_CREDENTIALS`、`GOOGLE_CLOUD_API_KEY`、`GOOGLE_CLOUD_LOCATION`、`GOOGLE_CLOUD_PROJECT`、 `GRADIUM_API_KEY`、`GROQ_API_KEY`、`HF_TOKEN`、`HUGGINGFACE_HUB_TOKEN`、`INWORLD_API_KEY`、`KILOCODE_API_KEY`、`KIMICODE_API_KEY`、`KIMI_API_KEY`、`LITELLM_API_KEY`、 `LLAMA_SERVER_API_KEY`、`LM_API_TOKEN`、`LONGCAT_API_KEY`、`MINIMAX_API_KEY`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`、`MISTRAL_API_KEY`、`MODELSTUDIO_API_KEY`、 `MODEL_API_KEY`、`MOONSHOT_API_KEY`、`NOVITA_API_KEY`、`NVIDIA_API_KEY`、`OLLAMA_API_KEY`、`OPENAI_ADMIN_KEY`、`OPENAI_API_KEY`、`OPENCODE_API_KEY`、`OPENCODE_ZEN_API_KEY`、 `OPENROUTER_API_KEY`、`PARALLEL_API_KEY`、`PERPLEXITY_API_KEY`、`PIXVERSE_API_KEY`、`QIANFAN_API_KEY`、`QWEN_API_KEY`、`QWEN_TOKEN_PLAN_API_KEY`、`RUNWAYML_API_SECRET`、`RUNWAY_API_KEY`、 `SENSEAUDIO_API_KEY`、`SGLANG_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`、`STEPFUN_API_KEY`、`SYNTHETIC_API_KEY`、`TAVILY_API_KEY`、`TOGETHER_API_KEY`、`TOKENHUB_API_KEY`、 `TOKENPLAN_API_KEY`、`VENICE_API_KEY`、`VLLM_API_KEY`、`VOLCANO_ENGINE_API_KEY`、`VOLCENGINE_TTS_API_KEY`、`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOYAGE_API_KEY`、`VYDRA_API_KEY`、 `XAI_API_KEY`、`XIAOMI_API_KEY`、`XIAOMI_TOKEN_PLAN_API_KEY`、`XI_API_KEY`、`ZAI_API_KEY` 和 `Z_AI_API_KEY`。

安装的第三方插件可能会在其插件清单中声明其他凭据变量。这些变量是声明它们的插件的契约，而不是核心 OpenClaw 变量。

### <a id="logging-and-diagnostics"></a> 日志记录和诊断

| 变量                             | 用途                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`                 | 覆盖文件和控制台日志级别。                         |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT`     | 启用模型传输计时诊断。                    |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`       | 选择经过脱敏的模型负载诊断。                    |
| `OPENCLAW_DEBUG_SSE`                 | 选择 SSE 计时或事件预览诊断。                  |
| `OPENCLAW_DEBUG_CODE_MODE`           | 启用代码模式界面诊断。                         |
| `OPENCLAW_DIAGNOSTICS`               | 启用命名诊断标志，或使用 `0` 禁用所有标志。 |
| `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` | 选择时间线诊断的 JSONL 路径。               |
| `OPENCLAW_DIAGNOSTICS_EVENT_LOOP`    | 将事件循环采样添加到时间线诊断中。               |

### <a id="feature-and-runtime-toggles"></a> 功能和运行时开关

| 变量                             | 用途                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `OPENCLAW_CONFIG_READONLY`           | 对于 [ 外部管理的不可变配置 ](/cli/config#externally-managed-config) 设置为 `1`。 |
| `OPENCLAW_LOAD_SHELL_ENV`            | 从登录 Shell 导入缺失的预期变量。                                      |
| `OPENCLAW_SHELL_ENV_TIMEOUT_MS`      | 设置登录 Shell 导入超时时间。                                                          |
| `OPENCLAW_EXEC_SHELL_SNAPSHOT`       | 使用 `0` 禁用 exec Shell 快照。                                                       |
| `OPENCLAW_OFFLINE`                   | 阻止下载固定版本的代理辅助二进制文件。                                           |
| `OPENCLAW_BROWSER_HEADLESS`          | 强制托管浏览器以有头（`0`）或无头（`1`）模式启动。                               |
| `OPENCLAW_DISABLE_BONJOUR`           | 强制开启（`0`）或关闭（`1`）Bonjour 广播。                                             |
| `OPENCLAW_NO_AUTO_UPDATE`            | 禁用自动应用更新。                                                            |
| `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS` | 允许受信任的私有 DNS `ws://` 连接，作为紧急解锁覆盖选项。                     |
| `OPENCLAW_ALLOW_MULTI_GATEWAY`       | 允许多个网关进程，同时保留每个状态的所有权锁。                 |
| `OPENCLAW_SKIP_CHANNELS`             | 在不启动通道传输的情况下启动网关，以便进行故障排除。                            |
| `OPENCLAW_THEME`                     | 强制 TUI 调色板为 `light` 或 `dark`。                                                  |

### <a id="filesystem-observation"></a> 文件系统观察

配置热重载、技能刷新、内存索引和开发监视管理器使用 `@openclaw/fs-safe/watch`。 Docker、虚拟机和其他需要观察首选项的部署仍然支持现有的 `CHOKIDAR_*` 变量名称：

| 变量              | 值                                   | 行为                                                                                    |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `CHOKIDAR_USEPOLLING` | 未设置、`false`、`0` 或空字符串 | `auto`：更喜欢本机事件，当没有事件后端可用时使用轮询回退。     |
| `CHOKIDAR_USEPOLLING` | 任何其他非空值                | 选择 `poll`。值不区分大小写。                                                 |
| `CHOKIDAR_INTERVAL`   | 以毫秒为单位的正整数        | 显式轮询和自动回退的轮询间隔；覆盖下面的默认值。 |

Linux、macOS 和 Windows 上的 Node.js 支持本机事件。在 `auto` 模式下，Bun 和没有本机后端的运行时使用与显式轮询相同的 `CHOKIDAR_INTERVAL` 设置的轮询。本机事件保留 fs-safe 的 30 秒协调间隔。配置热重载和开发主管默认为`100`毫秒轮询；内存索引和技能刷新默认为`30000`毫秒，以绑定空闲后台扫描。有效的显式 `CHOKIDAR_INTERVAL` 会覆盖这些默认值，最小值为 `20` ms，最大值为 `2147483647` ms。无效或非正值使用所有者的默认值。原生事件提示仍会触发提示更新；当使用自动轮询回退时，内存和技能会为每个观察者记录一个警告。

恢复仍然针对每个所有者。配置热重载使用现有的退避重试失败的订阅。如果未设置 `CHOKIDAR_USEPOLLING`，本机监视故障可能会在重试后另外触发新的轮询订阅。显式覆盖保留现有的重试限制。当本机监视容量耗尽时，内存索引切换为搜索刷新 （`watch-limit`）。每个内存订阅每次扫描最多允许 1,000,000 个目录和 1,000,000 个检查条目，包括排除的条目。在观察重试次数耗尽后，较大的树也会回退到搜索刷新。能力耗尽后，技能会在代理准备过程中刷新，如果观察失败，开发主管会停止其子进程。

## <a id="clawhub-install-telemetry"></a> ClawHub 安装遥测

来自 ClawHub 的经过验证的技能或插件安装会发送尽力安装报告。请参阅 [ClawHub telemetry](/clawhub/telemetry) 了解发送的内容、发送时间以及从未包含的内容。

| 变量                    | 用途                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `CLAWHUB_DISABLE_TELEMETRY` | 使用 `1`、`true`、`yes` 或 `on` 禁用 ClawHub 安装报告。 |

当 `CLAWHUB_DISABLE_TELEMETRY` 未设置或为空时，接受 `CLAWDHUB_DISABLE_TELEMETRY`。

## <a id="provider-credentials-and-workspace-.env"></a><a id="provider-credentials-and-workspace-env"></a> 提供方凭据和工作区 `.env`

不要只把提供方 API 密钥保存在工作区 `.env` 中。OpenClaw 会阻止工作区 `.env` 文件中一大批提供方凭据和端点重定向密钥，包括所有已知的提供方认证环境变量（例如 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY`、`FIRECRAWL_API_KEY`），以及任何以 `_API_HOST`、`_BASE_URL`、`_ENDPOINT` 或 `_HOMESERVER` 结尾的键，还有整个 `OPENCLAW_*`、`CLAWHUB_*`、`ANTHROPIC_API_KEY_*` 和 `OPENAI_API_KEY_*` 命名空间。

请改为从以下受信任来源之一提供提供方凭据：

- Gateway 进程环境，例如 shell、launchd/systemd 单元、容器密钥或 CI 密钥。
- 全局运行时 dotenv 文件：`~/.openclaw/.env` 或 `$OPENCLAW_STATE_DIR/.env`。
- `~/.openclaw/openclaw.json`中的配置`env`块。
- 当启用 `env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1` 时，可选的登录 shell 导入。

如果你之前只把提供方密钥或端点路由值存储在工作区 `.env` 中，请将它们移动到上述受信任来源之一。工作区 `.env` 仍然可以提供普通的项目变量，只要它们不是凭据、端点重定向、主机覆盖或 `OPENCLAW_*` 运行时控制项。

请参阅 [Workspace `.env` 文件](/gateway/security/secrets-and-storage#workspace-env-files) 了解安全原理。

## <a id="config-env-block"></a> 配置 `env` 块

在 `env.vars` 下设置内联 env 变量（值不会覆盖现有值）：

```json5
{
  env: {
    vars: {
      OPENROUTER_API_KEY: "sk-or-...",
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

配置 `env.vars` 块仅接受文字字符串值。它不会扩展 `file:...` 值。例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"` 作为该确切字符串传递给提供商。

对于文件支持的提供程序密钥，请在支持它的凭据字段上使用 SecretRef：

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

有关支持的字段，请参阅 [Secrets Management](/gateway/secrets) 和 [SecretRef 凭证表面 ](/reference/secretref-credential-surface)。

## <a id="shell-env-import"></a> Shell 环境导入

`env.shellEnv` 会运行你的登录 shell，并且只导入**缺失的**预期键：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

环境变量等价项：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`（默认 `15000`）。

对于 Bash，导入使用交互式登录 shell （`bash -lic`），因此 `PS1` 在登录启动文件运行之前初始化。 Bash 读取 `/etc/profile` 和第一个可用的用户登录配置文件（`~/.bash_profile`、`~/.bash_login` 或 `~/.profile`）。许多登录配置文件也源自 `~/.bashrc`。保持这些文件安静并受到限制，因为它们的输出、长时间运行的工作或故障可能会影响 OpenClaw 启动。其他 shell 使用非交互式登录启动 （`-l -c`）。检查在其自己的会话中运行，与终端分离，因此启动文件没有作业控制，也无法接管运行 OpenClaw 的终端。这种交互式 Bash 模式仅限于显式 shell 环境导入。普通网关命令期间的自动可执行 PATH 发现保持非交互式。

成功的检查会被缓存。如果检查失败，则下一个 shell 环境或 PATH 查找会再次尝试。

## <a id="exec-shell-snapshots"></a> Exec shell 快照

在非 Windows 的 Gateway 主机上，bash 和 zsh 的 `exec` 命令默认使用启动快照。 在 Gateway 进程环境中设置 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 可以禁用此路径。 `false`、`no` 和 `off` 也会禁用它。单次调用的 `exec.env` 值无法切换快照或重定向快照缓存。

## <a id="runtime-injected-env-vars"></a> 运行时注入的环境变量

网关端口侦听器诊断和锁所有者身份检查在有限的环境中运行本机实用程序，其中包含可执行路径、OS 引导程序和帐户目录、临时目录以及已知的区域设置和时区设置。这些子项不会继承提供者凭据、应用程序令牌、代理、运行时注入变量或任意应用程序设置。此边界使父环境和正常代理、网关和更新程序有效负载环境保持不变。

OpenClaw 还会向启动的子进程注入上下文标记：

- `OPENCLAW_SHELL=exec`：通过 `exec` 工具运行的命令会设置此项。
- `OPENCLAW_SHELL=acp-client`：当 `openclaw acp client` 启动 ACP 桥接进程时设置。
- `OPENCLAW_SHELL=tui-local`：由本地 TUI 的 `!` shell 命令设置。
- `OPENCLAW_CLI=1`：由从 CLI 入口点启动的子进程设置。

这些是运行时标记（不是必需的用户配置）。它们可用于 shell/profile 逻辑中应用与上下文相关的规则。

## <a id="ui-env-vars"></a> UI 环境变量

- `OPENCLAW_THEME=light`：当终端是浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果终端导出了它，OpenClaw 会使用背景色提示自动选择 TUI 调色板。

## <a id="env-var-substitution-in-config"></a> 配置中的环境变量替换

你可以在配置字符串值中直接使用 `${VAR_NAME}` 语法来引用环境变量：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

丢失或空的变量仍然可见为 `${VAR_NAME}` 并发出警告。需要该价值的消费者将其视为不可用。当需要文字 `${VAR_NAME}` 文本时，请使用 `$${VAR_NAME}`。

有关完整详细信息，请参阅 [ 配置：环境变量替换](/gateway/config-secrets-env#env-var-substitution)。

这适用于 `openclaw.json` 中的字符串值。它还适用于 `openclaw.json` 通过 `$include` 拉入的任何文件。包含案例之所以有效，是因为包含解析后替换会在配置树上运行。 OpenClaw 的 dotenv 加载器不会扩展环境变量值。例如，运行时 `.env` 文件中的 `OPENCLAW_WORKSPACE_DIR=${XDG_CONFIG_HOME}/workspace` 在加载 OpenClaw 时仍保持原义。

由于 OpenClaw 不会扩展这些值，因此请为路径变量提供完全解析的绝对路径。 `OPENCLAW_WORKSPACE_DIR` 也不扩展前导 `~`，因为它直接进入 `path.resolve`。 `OPENCLAW_STATE_DIR` 和 `OPENCLAW_CONFIG_PATH` 确实扩展了 `~`。工作区本地 `.env` 文件会删除整个 `OPENCLAW_*` 命名空间，因为它是不受信任的输入。将这些变量设置在可信全局 `.env` 中的 `$OPENCLAW_STATE_DIR/.env` 中，默认情况下为 `~/.openclaw/.env`。

Docker Compose 遵循自己的 [ 插值规则](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)。在捆绑的 `docker-compose.yml` 中，项目 `.env` 中的 `OPENCLAW_WORKSPACE_DIR` 选择工作区绑定挂载的主机目录。容器端 `OPENCLAW_WORKSPACE_DIR` 保持固定到 `/home/node/.openclaw/workspace`。

## <a id="secret-refs-vs-%24%7Benv%7D-strings"></a> Secret 引用 vs `${ENV}` 字符串

OpenClaw 支持两种基于环境变量的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 用于支持密钥引用字段的 SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`）。

两者都在激活时从进程环境解析。 SecretRef 详细信息记录在 [Secrets Management](/gateway/secrets) 中。配置 `env` 块本身不解析 SecretRefs 或 `file:...` 简写值。

## <a id="path-related-env-vars"></a> 路径相关环境变量

| 变量                 | 用途                                                                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆盖用于内部 OpenClaw 路径默认值的主目录（`~/.openclaw/`、agent 目录、sessions、credentials、installer onboarding，以及默认的开发检出目录）。当以专用服务用户运行 OpenClaw 时很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                                                                                                                   |
| `OPENCLAW_CONFIG_PATH`   | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                                                                                    |
| `OPENCLAW_INCLUDE_ROOTS` | 可供 `$include` 指令解析配置目录之外文件的一组目录路径（默认：无——`$include` 仅限于配置目录）。支持波浪号展开。                                                         |

## <a id="agent-helper-tool-downloads"></a> 代理辅助工具下载

设置 `OPENCLAW_OFFLINE=1` 以防止 OpenClaw 下载其固定的 `fd` 和 `ripgrep` 帮助程序二进制文件。 OpenClaw 工具目录和工作系统二进制文件下的现有助手仍然符合资格。丢失的助手将保持不可用状态，而不是触发网络请求。

## <a id="logging"></a> 日志

| 变量                         | 用途                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆盖文件和控制台的日志级别（e.g. `debug`、`trace`）。配置中优先于 `logging.level` 和 `logging.consoleLevel`。无效值将被忽略并发出警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在 `info` 级别发出目标模型 request/response 时序诊断，而不启用全局调试日志。                                                                                  |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型有效负载诊断：`summary`、`tools` 或 `full-redacted`。 `full-redacted` 已被限制和编辑，但可能包含 prompt/message 文本。                                               |
| `OPENCLAW_DEBUG_SSE`             | 流诊断：`events` 用于 first/done 计时，`peek` 包括前五个经过编辑的 SSE 事件。                                                                                 |
| `OPENCLAW_DEBUG_CODE_MODE`       | 代码模式模型表面诊断，包括提供程序工具隐藏和紧凑的 control/direct 实施。                                                                                  |

## <a id="nvm-users%3A-web_fetch-tls-failures"></a><a id="nvm-users-web_fetch-tls-failures"></a> nvm 用户：web_fetch TLS 失败

如果 Node.js 是通过 **nvm**（不是系统包管理器）安装的，则内置 `fetch()` 使用 nvm 捆绑的 CA 存储，该存储可能缺少现代根 CA（ISRG 根 X1/X2 Let's Encrypt、DigiCert 全局根 G2 等）。这会导致 `web_fetch` 在大多数 HTTPS 站点上失败并显示 `"fetch failed"`。

在 Linux 上，OpenClaw 会自动检测 nvm，并在实际启动环境中应用修复：

- `openclaw gateway install` 会将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口会在 Node 启动前重新执行自身，并设置 `NODE_EXTRA_CA_CERTS`

**手动修复（适用于旧版本或直接 `node ...` 启动）：**

在启动 OpenClaw 之前导出该变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要仅依赖写入 `~/.openclaw/.env` 来存储此变量。 Node 在进程启动时读取 `NODE_EXTRA_CA_CERTS`。

## <a id="legacy-environment-variables"></a> 旧版环境变量

OpenClaw- 特定运行时控件使用 `OPENCLAW_*` 前缀。早期版本中的旧版 `CLAWDBOT_*` 和 `MOLTBOT_*` 前缀将被静默忽略。支持的提供程序和文件系统观察变量保留其记录的名称。

如果在启动时网关进程上仍设置了任何设置，则 OpenClaw 会发出单个 Node 弃用警告 （`OPENCLAW_LEGACY_ENV_VARS`），列出检测到的前缀和总计数。通过将旧前缀替换为 `OPENCLAW_` 来重命名每个值（例如，将 `CLAWDBOT_GATEWAY_TOKEN` 替换为 `OPENCLAW_GATEWAY_TOKEN`）。旧名称无效。

## <a id="related"></a> 相关内容

- [网关配置](/gateway/configuration)
- [FAQ：环境变量和.env加载](/help/faq#env-vars-and-env-loading)
- [模型概览](/concepts/models)
