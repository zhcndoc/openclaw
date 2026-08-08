---
summary: "OpenClaw 从哪里加载环境变量以及优先级顺序"
read_when:
  - 你需要知道会加载哪些环境变量，以及按什么顺序加载
  - 你正在调试网关中缺失的 API 密钥
  - 你正在编写提供商认证或部署环境文档
title: "环境变量"
---

OpenClaw 从多个来源加载环境变量。通常的规则是**绝不覆盖现有值**。对于通过 OpenClaw 安装的 systemd 服务，全局 `.env` 只能替换 OpenClaw 记录为由其管理的服务值；由操作员自行设置的服务值仍然具有更高优先级。
工作区 `.env` 文件属于较低信任级别的来源：OpenClaw 会在应用优先级顺序之前，忽略工作区 `.env` 中的提供商凭据和受保护的运行时控制项。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程已经从父 shell/守护进程获得的环境）。
2. **当前工作目录中的 `.env`**（dotenv 默认行为；不会覆盖现有值；提供商凭据和受保护的运行时控制项会被忽略）。
3. **全局 `.env`**，位于 `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`；推荐用于提供商 API 密钥；除已记录的 OpenClaw 管理的 systemd 服务值外，不会覆盖现有值）。
4. **`~/.openclaw/openclaw.json` 中的配置 `env` 块**（仅在变量缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅用于填充缺失的预期变量。

在使用默认状态目录的全新 Ubuntu 安装中，OpenClaw 还会在全局 `.env` 之后使用 `~/.config/openclaw/gateway.env` 作为兼容性回退。如果两个文件都存在且内容不同，OpenClaw 会保留 `~/.openclaw/.env` 并打印警告。

如果配置文件完全缺失，则跳过第 4 步；如果启用了 shell 导入，第 5 步仍会运行。

## 支持的面向运维人员的变量

以下变量是面向运维人员的受支持环境变量契约。未记录的 `OPENCLAW_*` 变量属于内部实现细节，可能会在不另行通知的情况下消失。

### 路径和实例

| 变量                     | 用途                                                   |
| ------------------------ | ------------------------------------------------------ |
| `OPENCLAW_HOME`          | 覆盖用于 OpenClaw 路径默认值的主目录。                 |
| `OPENCLAW_STATE_DIR`     | 覆盖可变状态目录。                                     |
| `OPENCLAW_CONFIG_PATH`   | 覆盖当前使用的配置文件路径。                           |
| `OPENCLAW_WORKSPACE_DIR` | 覆盖默认代理工作区。                                   |
| `OPENCLAW_PROFILE`       | 选择命名配置文件及其隔离的默认值。                     |
| `OPENCLAW_GIT_DIR`       | 覆盖开发渠道更新所使用的源代码检出目录。               |
| `OPENCLAW_INCLUDE_ROOTS` | 允许 `$include` 从其他根目录解析。                     |

### 网关和身份验证

| 变量                       | 用途                                              |
| -------------------------- | ------------------------------------------------- |
| `OPENCLAW_GATEWAY_URL`     | 覆盖客户端使用的远程网关 URL。                    |
| `OPENCLAW_GATEWAY_PORT`    | 覆盖本地网关端口。                                |
| `OPENCLAW_GATEWAY_TOKEN`   | 为网关服务器和客户端提供令牌身份验证。            |
| `OPENCLAW_GATEWAY_PASSWORD` | 为网关服务器和客户端提供密码身份验证。            |

### 提供商凭据

核心及捆绑的提供商插件识别以下凭据和提供商选择变量。如果需要范围限定的凭据，而不是整个进程范围内的单一值，请优先使用各提供商的配置或 SecretRef 字段。

`AI_GATEWAY_API_KEY`、`ANTHROPIC_ADMIN_API_KEY`、`ANTHROPIC_ADMIN_KEY`、`ANTHROPIC_API_KEY`、`ANTHROPIC_OAUTH_TOKEN`、`ARCEEAI_API_KEY`、`AZURE_OPENAI_API_KEY`、`AZURE_SPEECH_API_KEY`、`AZURE_SPEECH_KEY`、`AZURE_SPEECH_REGION`、`BASETEN_API_KEY`、`BRAVE_API_KEY`、`BYTEPLUS_API_KEY`、`BYTEPLUS_SEED_SPEECH_API_KEY`、`CEREBRAS_API_KEY`、`CHUTES_API_KEY`、`CHUTES_OAUTH_TOKEN`、`CLAWROUTER_API_KEY`、`CLOUDFLARE_AI_GATEWAY_API_KEY`、`CODEX_API_KEY`、`COHERE_API_KEY`、`COMFY_API_KEY`、`COMFY_CLOUD_API_KEY`、`COPILOT_GITHUB_TOKEN`、`DASHSCOPE_API_KEY`、`DEEPGRAM_API_KEY`、`DEEPINFRA_API_KEY`、`DEEPSEEK_API_KEY`、`ELEVENLABS_API_KEY`、`EXA_API_KEY`、`FAL_API_KEY`、`FAL_KEY`、`FEATHERLESS_API_KEY`、`FIRECRAWL_API_KEY`、`FIREWORKS_API_KEY`、`GCLOUD_PROJECT`、`GEMINI_API_KEY`、`GH_TOKEN`、`GITHUB_TOKEN`、`GMI_API_KEY`、`GOOGLE_API_KEY`、`GOOGLE_APPLICATION_CREDENTIALS`、`GOOGLE_CLOUD_API_KEY`、`GOOGLE_CLOUD_LOCATION`、`GOOGLE_CLOUD_PROJECT`、`GRADIUM_API_KEY`、`GROQ_API_KEY`、`HF_TOKEN`、`HUGGINGFACE_HUB_TOKEN`、`INWORLD_API_KEY`、`KILOCODE_API_KEY`、`KIMICODE_API_KEY`、`KIMI_API_KEY`、`LITELLM_API_KEY`、`LM_API_TOKEN`、`LONGCAT_API_KEY`、`MINIMAX_API_KEY`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN`、`MISTRAL_API_KEY`、`MODELSTUDIO_API_KEY`、`MODEL_API_KEY`、`MOONSHOT_API_KEY`、`NOVITA_API_KEY`、`NVIDIA_API_KEY`、`OLLAMA_API_KEY`、`OPENAI_ADMIN_KEY`、`OPENAI_API_KEY`、`OPENCODE_API_KEY`、`OPENCODE_ZEN_API_KEY`、`OPENROUTER_API_KEY`、`PARALLEL_API_KEY`、`PERPLEXITY_API_KEY`、`PIXVERSE_API_KEY`、`QIANFAN_API_KEY`、`QWEN_API_KEY`、`QWEN_TOKEN_PLAN_API_KEY`、`RUNWAYML_API_SECRET`、`RUNWAY_API_KEY`、`SENSEAUDIO_API_KEY`、`SGLANG_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`、`STEPFUN_API_KEY`、`SYNTHETIC_API_KEY`、`TAVILY_API_KEY`、`TOGETHER_API_KEY`、`TOKENHUB_API_KEY`、`TOKENPLAN_API_KEY`、`VENICE_API_KEY`、`VLLM_API_KEY`、`VOLCANO_ENGINE_API_KEY`、`VOLCENGINE_TTS_API_KEY`、`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOYAGE_API_KEY`、`VYDRA_API_KEY`、`XAI_API_KEY`、`XIAOMI_API_KEY`、`XIAOMI_TOKEN_PLAN_API_KEY`、`XI_API_KEY`、`ZAI_API_KEY` 和 `Z_AI_API_KEY`。

已安装的第三方插件可能会在其插件清单中声明其他凭据变量；这些变量属于声明它们的插件的契约，而不是 OpenClaw 核心变量。

### 日志记录和诊断

| 变量                              | 用途                                               |
| --------------------------------- | -------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`              | 覆盖文件和控制台日志级别。                         |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT`  | 启用模型传输计时诊断。                             |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`    | 选择经过脱敏的模型负载诊断。                       |
| `OPENCLAW_DEBUG_SSE`              | 选择 SSE 计时或事件预览诊断。                      |
| `OPENCLAW_DEBUG_CODE_MODE`        | 启用代码模式界面诊断。                             |
| `OPENCLAW_DIAGNOSTICS`            | 启用命名诊断标志，或使用 `0` 禁用所有标志。        |
| `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` | 选择时间线诊断的 JSONL 路径。                   |
| `OPENCLAW_DIAGNOSTICS_EVENT_LOOP` | 将事件循环采样添加到时间线诊断中。                 |

### 功能和运行时开关

| 变量                              | 用途                                                                    |
| --------------------------------- | ----------------------------------------------------------------------- |
| `OPENCLAW_LOAD_SHELL_ENV`         | 从登录 Shell 导入缺失的预期变量。                                       |
| `OPENCLAW_SHELL_ENV_TIMEOUT_MS`   | 设置登录 Shell 导入超时时间。                                           |
| `OPENCLAW_EXEC_SHELL_SNAPSHOT`    | 使用 `0` 禁用 exec Shell 快照。                                         |
| `OPENCLAW_OFFLINE`                | 阻止下载固定版本的代理辅助二进制文件。                                  |
| `OPENCLAW_BROWSER_HEADLESS`       | 强制托管浏览器以有头（`0`）或无头（`1`）模式启动。                      |
| `OPENCLAW_DISABLE_BONJOUR`        | 强制开启（`0`）或关闭（`1`）Bonjour 广播。                              |
| `OPENCLAW_NO_AUTO_UPDATE`         | 禁用自动应用更新。                                                      |
| `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS` | 允许受信任的私有 DNS `ws://` 连接，作为紧急解锁覆盖选项。            |
| `OPENCLAW_ALLOW_MULTI_GATEWAY`    | 允许多个网关进程，同时保留每个状态的所有权锁。                          |
| `OPENCLAW_SKIP_CHANNELS`          | 在不启动通道传输的情况下启动网关，以便进行故障排除。                    |
| `OPENCLAW_THEME`                  | 强制 TUI 调色板为 `light` 或 `dark`。                                   |

## 提供方凭据和工作区 `.env`

不要只把提供方 API 密钥保存在工作区 `.env` 中。OpenClaw 会阻止工作区 `.env` 文件中一大批提供方凭据和端点重定向密钥，包括所有已知的提供方认证环境变量（例如 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY`、`FIRECRAWL_API_KEY`），以及任何以 `_API_HOST`、`_BASE_URL`、`_ENDPOINT` 或 `_HOMESERVER` 结尾的键，还有整个 `OPENCLAW_*`、`CLAWHUB_*`、`ANTHROPIC_API_KEY_*` 和 `OPENAI_API_KEY_*` 命名空间。

请改为从以下受信任来源之一提供提供方凭据：

- Gateway 进程环境，例如 shell、launchd/systemd 单元、容器密钥或 CI 密钥。
- 全局运行时 dotenv 文件：`~/.openclaw/.env` 或 `$OPENCLAW_STATE_DIR/.env`。
- `~/.openclaw/openclaw.json` 中的 `env` 块。
- 当启用 `env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1` 时，可选的登录 shell 导入。

如果你之前只把提供方密钥或端点路由值存储在工作区 `.env` 中，请将它们移动到上述受信任来源之一。工作区 `.env` 仍然可以提供普通的项目变量，只要它们不是凭据、端点重定向、主机覆盖或 `OPENCLAW_*` 运行时控制项。

参见 [工作区 `.env` 文件](/gateway/security#workspace-env-files) 了解安全原因。

## 配置 `env` 块

设置内联环境变量有两种等效方式（两者都不会覆盖现有值）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

配置中的 `env` 块仅接受字面字符串值。它不会展开 `file:...` 值；例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"` 将以该字符串原样传递给提供商。

对于由文件提供的提供商密钥，请在支持该功能的凭据字段上使用 `SecretRef`：

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

有关支持的字段，请参阅 [密钥](/gateway/secrets) 和 [SecretRef 凭据范围](/reference/secretref-credential-surface)。

## Shell 环境导入

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

## Exec shell 快照

在非 Windows 的 Gateway 主机上，bash 和 zsh 的 `exec` 命令默认使用启动快照。  
在 Gateway 进程环境中设置 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 可以禁用此路径。  
`false`、`no` 和 `off` 也会禁用它。单次调用的 `exec.env` 值无法切换快照或重定向快照缓存。

## 运行时注入的环境变量

OpenClaw 还会向启动的子进程注入上下文标记：

- `OPENCLAW_SHELL=exec`：通过 `exec` 工具运行的命令会设置此项。
- `OPENCLAW_SHELL=acp-client`：当 `openclaw acp client` 启动 ACP 桥接进程时设置。
- `OPENCLAW_SHELL=tui-local`：由本地 TUI 的 `!` shell 命令设置。
- `OPENCLAW_CLI=1`：由从 CLI 入口点启动的子进程设置。

这些是运行时标记（不是必需的用户配置）。它们可用于 shell/profile 逻辑中
应用与上下文相关的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当终端是浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果终端导出了它，OpenClaw 会使用背景色提示自动选择 TUI 调色板。

## 配置中的环境变量替换

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

有关完整详情，请参阅 [配置：环境变量替换](/gateway/configuration-reference#env-var-substitution)。

## Secret 引用 vs `${ENV}` 字符串

OpenClaw 支持两种基于环境变量的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 用于支持密钥引用字段的 SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`）。

两者都会在激活时从进程环境中解析。SecretRef 的详细信息记录在[密钥管理](/gateway/secrets)中。  
配置中的 `env` 块本身不会解析 SecretRef 或 `file:...`  
简写值。

## 路径相关环境变量

| 变量                     | 作用                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------ |
| `OPENCLAW_HOME`          | 覆盖用于内部 OpenClaw 路径默认值的主目录（`~/.openclaw/`、agent 目录、sessions、credentials、installer onboarding，以及默认的开发检出目录）。当以专用服务用户运行 OpenClaw 时很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                                                                                                                   |
| `OPENCLAW_CONFIG_PATH`   | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                                                                                    |
| `OPENCLAW_INCLUDE_ROOTS` | 可供 `$include` 指令解析配置目录之外文件的一组目录路径（默认：无——`$include` 仅限于配置目录）。支持波浪号展开。                                                         |

## 代理辅助工具下载

设置 `OPENCLAW_OFFLINE=1` 可阻止 OpenClaw 下载其固定版本的 `fd`
和 `ripgrep` 辅助二进制文件。OpenClaw 工具目录下现有的辅助工具以及可用的系统二进制文件仍然符合使用条件；缺失的辅助工具将保持不可用，而不会触发网络请求。

## 日志

| 变量                           | 用途                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 同时覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。优先于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值会被忽略并给出警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在不启用全局 debug 日志的情况下，以 `info` 级别输出有针对性的模型请求/响应时序诊断信息。                                                                                  |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型负载诊断：`summary`、`tools` 或 `full-redacted`。`full-redacted` 有大小上限且会被脱敏，但可能仍包含提示/消息文本。                                               |
| `OPENCLAW_DEBUG_SSE`             | 流式诊断：`events` 用于首个/完成时序，`peek` 用于包含前五个脱敏的 SSE 事件。                                                                                 |
| `OPENCLAW_DEBUG_CODE_MODE`       | 代码模式下的模型表面诊断，包括 provider-tool 隐藏以及紧凑控制/直接强制。                                                                                  |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 会替代系统 home 目录（`$HOME` / `os.homedir()`），用于内部 OpenClaw 路径默认值。这包括默认 state 目录、配置路径、agent 目录、凭据、安装器引导工作区，以及 `openclaw update --channel dev` 使用的默认开发检出目录。

`OPENCLAW_HOME` 不会授予对 OS 账户原生 Gateway 服务的所有权。Gateway 服务管理命令会将重定位后的 home 视为隔离状态；当需要单独的原生服务身份时，请使用 OS 账户 home 和命名配置文件。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上的 Termux `PREFIX` home 回退 > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），使用前会通过相同的 OS home 回退链进行展开。

像 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR` 这样的显式路径变量仍然具有更高优先级。诸如 shell 启动文件检测、包管理器设置以及主机 `~` 展开等 OS 账户任务，仍可能使用真实的系统 home。

## nvm 用户：web_fetch TLS 失败

如果 Node.js 是通过 **nvm** 安装的（而不是系统包管理器），内置的 `fetch()` 会使用
nvm 自带的 CA 存储，其中可能缺少现代根 CA（Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等）。这会导致大多数 HTTPS 网站上的 `web_fetch` 失败，并报出 `"fetch failed"`。

在 Linux 上，OpenClaw 会自动检测 nvm，并在实际启动环境中应用修复：

- `openclaw gateway install` 会将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口会在 Node 启动前重新执行自身，并设置 `NODE_EXTRA_CA_CERTS`

**手动修复（适用于旧版本或直接 `node ...` 启动）：**

在启动 OpenClaw 之前导出该变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要仅依赖将该变量写入 `~/.openclaw/.env`；Node 会在进程启动时读取
`NODE_EXTRA_CA_CERTS`。

## 旧版环境变量

OpenClaw 只读取 `OPENCLAW_*` 环境变量。早期版本中的旧前缀
`CLAWDBOT_*` 和 `MOLTBOT_*` 会被静默
忽略。

如果在 Gateway 进程启动时仍然设置了这些变量，OpenClaw 会发出一条
Node 弃用警告（`OPENCLAW_LEGACY_ENV_VARS`），列出检测到的前缀和
总数。请将每个值中的旧前缀替换为 `OPENCLAW_`（例如将
`CLAWDBOT_GATEWAY_TOKEN` 改为
`OPENCLAW_GATEWAY_TOKEN`）；旧名称不会生效。

## 相关内容

- [Gateway 配置](/gateway/configuration)
- [常见问题：env vars 和 .env 加载](/help/faq#env-vars-and-env-loading)
- [模型概览](/concepts/models)
