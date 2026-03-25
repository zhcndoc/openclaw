---
summary: "OpenClaw 环境变量的加载来源及优先级顺序"
read_when:
  - 你需要了解加载了哪些环境变量及其加载顺序
  - 你正在调试 Gateway 中缺失的 API 密钥
  - 你正在编写提供商认证或部署环境的文档
title: "环境变量"
---

# 环境变量

OpenClaw 从多个来源拉取环境变量。规则是 **绝不覆盖已有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程从父级 shell/守护进程继承的环境变量）。
2. **当前工作目录下的 `.env` 文件**（dotenv 默认行为；不覆盖已有值）。
3. **`~/.openclaw/.env` 处的全局 `.env` 文件**（即 `$OPENCLAW_STATE_DIR/.env`；不覆盖已有值）。
4. 配置文件中的 `env` 块，位于 `~/.openclaw/openclaw.json`（仅在缺失时应用）。
5. 可选的登录 shell 导入（通过 `env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1` 启用），仅导入缺失的预期键。

如果配置文件完全缺失，则跳过第 4 步；但如果启用，仍执行 shell 导入。

## 配置文件中的 `env` 块

有两种等效方式可设置内联环境变量（均不覆盖已有值）：

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

## Shell 环境导入

`env.shellEnv` 会运行你的登录 shell，仅导入缺失的预期键：

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

对应的环境变量等效设置：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 运行时注入的环境变量

OpenClaw 还会向子进程注入上下文标记：

- `OPENCLAW_SHELL=exec`：针对通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：针对 ACP 运行时的后台进程（例如 `acpx`）生成时设置。
- `OPENCLAW_SHELL=acp-client`：针对 `openclaw acp client` 在生成 ACP 桥接进程时设置。
- `OPENCLAW_SHELL=tui-local`：针对本地 TUI 中的 `!` shell 命令设置。

这些是运行时标记（不需要用户配置），可在 shell/profile 逻辑中使用以应用特定上下文规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当终端背景为浅色时，强制使用浅色 TUI 配色方案。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 配色方案。
- `COLORFGBG`：如果终端导出此变量，OpenClaw 会使用背景颜色提示自动选择 TUI 配色方案。

## 配置中的环境变量替换

你可以直接在配置字符串值中通过 `${VAR_NAME}` 语法引用环境变量：

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

更多详情参见 [配置：环境变量替换](/gateway/configuration-reference#env-var-substitution)。

## Secret 引用与 `${ENV}` 字符串

OpenClaw 支持两种基于环境变量的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 在支持秘密引用的字段中使用 SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`）。

两者均在激活时从进程环境解析。SecretRef 的详细说明参见 [秘密管理](/gateway/secrets)。

## 与路径相关的环境变量

| 变量                   | 作用                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆盖用于所有内部路径解析的主目录（如 `~/.openclaw/`、agent 目录、会话、凭据）。适用于将 OpenClaw 以专用服务用户运行的场景。 |
| `OPENCLAW_STATE_DIR`   | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                        |
| `OPENCLAW_CONFIG_PATH` | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                      |

## 日志相关

| 变量                 | 作用                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆盖文件及控制台日志级别（例如 `debug`、`trace`）。优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值会被忽略并输出警告。 |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 会替代系统主目录（`$HOME` / `os.homedir()`）用于所有内部路径解析。这使得无头服务账户可以实现完整的文件系统隔离。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**示例**（macOS LaunchDaemon 配置）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/kira</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（如 `~/svc`），会在使用前用 `$HOME` 展开。

## nvm 用户：web_fetch TLS 故障

如果 Node.js 是通过 **nvm** 安装的（而非系统包管理器），内置的 `fetch()` 会使用
nvm 捆绑的 CA 证书存储，可能缺少现代根 CA（ISRG Root X1/X2 用于 Let's Encrypt，
DigiCert Global Root G2 等）。这会导致 `web_fetch` 在访问大多数 HTTPS 站点时失败，报错 `"fetch failed"`。

在 Linux 上，OpenClaw 会自动检测 nvm 并在实际启动环境中应用修复：

- `openclaw gateway install` 将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口点会在 Node 启动前以设置了 `NODE_EXTRA_CA_CERTS` 的环境重新执行自身

**手动修复（适用于旧版本或直接 `node ...` 启动）：**

在启动 OpenClaw 前导出该变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要仅依赖写入 `~/.openclaw/.env` 来设置此变量；Node 在进程启动时读取
`NODE_EXTRA_CA_CERTS`。

## 相关链接

- [Gateway 配置](/gateway/configuration)
- [FAQ：环境变量和 .env 加载](/help/faq#env-vars-and-env-loading)
- [模型概览](/concepts/models)
