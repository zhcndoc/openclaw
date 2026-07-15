---
summary: "OpenClaw 从哪里加载环境变量以及优先级顺序"
read_when:
  - 你需要知道会加载哪些环境变量，以及按什么顺序加载
  - 你正在调试 Gateway 中缺失的 API key
  - 你正在编写提供商认证或部署环境文档
title: "环境变量"
---

OpenClaw 从多个来源加载环境变量。规则是**绝不覆盖现有值**。
Workspace `.env` 文件属于低信任来源：OpenClaw 在应用优先级规则前，会忽略 workspace `.env` 中的提供商凭据和受保护的运行时控制项。

## Priority (from high to low)

1. **Process environment** (what the Gateway process inherits from the parent shell/daemon).
2. **`.env` in the current working directory** (dotenv default behavior; does not overwrite; ignores provider credentials and protected runtime control keys).
3. **Global `.env`**: `~/.openclaw/.env` (i.e. `$OPENCLAW_STATE_DIR/.env`; recommended for provider API keys; does not overwrite).
4. **`env` block in `~/.openclaw/openclaw.json`** (applied only when missing).
5. **Optional login shell import** (`env.shellEnv.enabled` or `OPENCLAW_LOAD_SHELL_ENV=1`), applied only to missing expected keys.

On a fresh Ubuntu install using the default state directory, OpenClaw also uses `~/.config/openclaw/gateway.env` as a compatibility fallback after the global `.env`. If both files exist and differ, OpenClaw keeps `~/.openclaw/.env` and prints a warning.

If the configuration file is completely missing, step 4 is skipped; if shell import is enabled, step 5 still runs.

## Provider Credentials and workspace `.env`

Do not store provider API keys only in the workspace `.env`. OpenClaw will block a broad class of provider credentials and endpoint override keys from workspace `.env` files, including all known provider auth environment variables (for example `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `PERPLEXITY_API_KEY`, `BRAVE_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`), as well as any key ending in `_API_HOST`, `_BASE_URL`, or `_HOMESERVER`, plus the entire `OPENCLAW_*`, `CLAWHUB_*`, `ANTHROPIC_API_KEY_*`, and `OPENAI_API_KEY_*` namespaces.

Instead, provide provider credentials from one of the following trusted sources:

- The Gateway process environment, such as shell, launchd/systemd unit, container secret, or CI secret.
- The global runtime dotenv file: `~/.openclaw/.env` or `$OPENCLAW_STATE_DIR/.env`.
- The `env` block in `~/.openclaw/openclaw.json`.
- Optional login shell import when `env.shellEnv.enabled` or `OPENCLAW_LOAD_SHELL_ENV=1` is enabled.

If you previously kept provider keys only in the workspace `.env`, migrate them to one of the trusted sources above. Workspace `.env` can still provide ordinary project variables that are not credentials, endpoint overrides, host overrides, or `OPENCLAW_*` runtime control variables.

See [Workspace `.env` files](/gateway/security#workspace-env-files) for the security rationale.

## 配置 `env` 块

设置内联环境变量有两种等价方式（两者都不会覆盖已有值）：

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

配置中的 `env` 块只接受字面字符串值。它不会展开 `file:...` 值；例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"` 会作为该精确字符串传递给提供商。

对于由文件支持的提供商密钥，请在支持它的凭据字段上使用 SecretRef：

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

有关受支持字段，请参见 [密钥管理](/gateway/secrets) 和 [SecretRef 凭据表面](/reference/secretref-credential-surface)。

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
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`（默认 `15000`）

## Exec shell 快照

在非 Windows 的 Gateway 主机上，bash 和 zsh 的 `exec` 命令默认使用启动快照。
在 Gateway 进程环境中设置 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 可以禁用这一路径。
`false`、`no` 和 `off` 也会禁用它。单次调用的 `exec.env` 值无法切换快照或重定向快照缓存。

## Runtime injected environment variables

OpenClaw also injects context markers into spawned child processes:

- `OPENCLAW_SHELL=exec`: Commands run via the `exec` tool will set this.
- `OPENCLAW_SHELL=acp-client`: Set when `openclaw acp client` starts the ACP bridge process.
- `OPENCLAW_SHELL=tui-local`: Set by local TUI `!` shell commands.
- `OPENCLAW_CLI=1`: Set by child processes spawned from the CLI entry point.

These are runtime markers (not required user configuration). They can be used in shell/profile logic
to apply context-specific rules.

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

## Secret refs vs `${ENV}` 字符串

OpenClaw 支持两种基于环境变量的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 用于支持 secrets 引用字段的 SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`）。

两者都会在激活时从进程环境中解析。SecretRef 的细节记录在 [密钥管理](/gateway/secrets) 中。
配置中的 `env` 块本身不会解析 SecretRef 或 `file:...`
简写值。

## Path-related environment variables

| Variable                     | Purpose                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------ |
| `OPENCLAW_HOME`          | Override the home directory used for internal OpenClaw path defaults (`~/.openclaw/`, agent directory, sessions, credentials, installer onboarding, and the default development checkout directory). Useful when running OpenClaw as a dedicated service user. |
| `OPENCLAW_STATE_DIR`     | Override the state directory (default `~/.openclaw`).                                                                                                                                                                                   |
| `OPENCLAW_CONFIG_PATH`   | Override the config file path (default `~/.openclaw/openclaw.json`).                                                                                                                                                                    |
| `OPENCLAW_INCLUDE_ROOTS` | A list of directory paths where `$include` directives may resolve files outside the configuration directory (default: none — `$include` is constrained to the configuration directory). Supports tilde expansion.                                                         |

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

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上 Termux 的 `PREFIX` home 回退 > `os.homedir()`

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
