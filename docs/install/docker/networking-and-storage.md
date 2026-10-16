---
summary: "绑定模式、到达主机提供商、Claude CLI 后端、Bonjour 以及持续存在的内容"
read_when:
  - "容器无法访问在您的主机上运行的提供程序"
  - "您正在决定安装和备份什么"
  - "您希望容器内有 Claude CLI 后端"
title: "Docker 网络、提供商和存储"
sidebarTitle: "网络和存储"
---

绑定模式、主机提供商 URL、Claude CLI 后端、Bonjour/mDNS 和安装状态。 [Docker](/install/docker) 指南的一部分。

## <a id="lan-vs-loopback"></a> LAN 与环回

`scripts/docker/setup.sh` 默认将 `OPENCLAW_GATEWAY_BIND=lan`，因此主机上的 `http://127.0.0.1:18789` 可以通过 Docker 端口发布正常访问。

- `lan`（默认）：主机浏览器和主机 CLI 都可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程可以直接访问网关。

<Note>
在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），不要使用诸如 `0.0.0.0` 或 `127.0.0.1` 之类的主机别名。
</Note>

## <a id="host-local-providers"></a> 主机本地提供商

在容器内部，`127.0.0.1` 指的是容器自身，而不是主机。对于在主机上运行的提供商，请使用 `host.docker.internal`：

| 提供者  | 主机默认 URL         | Docker 设置 URL                    |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

捆绑设置使用这些 URL 作为 LM Studio/Ollama 载入默认值，并且 `docker-compose.yml` 将 `host.docker.internal` 映射到 Linux Docker 引擎上的主机网关（Docker 桌面在 macOS/Windows 上提供相同的别名）。主机服务必须侦听 Docker 可以到达的地址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

使用您自己的 Compose 文件或 `docker run`？自己添加相同的映射，e.g. `--add-host=host.docker.internal:host-gateway`。

## <a id="claude-cli-backend-in-docker"></a> Claude CLI Docker 后端

官方镜像不会预装 Claude Code。请在容器内以 `node` 用户身份安装并登录，然后持久化该容器的 home 目录，这样镜像升级时就不会擦除二进制文件或认证状态。

对于新安装，请在运行设置之前启用一个持久化的 `/home/node` 卷：

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
export OPENCLAW_HOME_VOLUME="openclaw_home"
./scripts/docker/setup.sh
```

对于已有安装，请先停止栈并重新加载当前的 `.env` 值——设置脚本总是会根据当前 shell 和默认值重写 `.env`，它不会自行读取该文件：

```bash
set -a
. ./.env
set +a
export OPENCLAW_HOME_VOLUME="${OPENCLAW_HOME_VOLUME:-openclaw_home}"
./scripts/docker/setup.sh
```

如果 `.env` 包含你的 shell 无法直接 source 的值，请先手动重新导出你依赖的内容（`OPENCLAW_IMAGE`、端口、绑定模式、自定义路径、`OPENCLAW_EXTRA_MOUNTS`、sandbox、skip-onboarding）。生成的 overlay 会为 `openclaw-gateway` 和 `openclaw-cli` 两个服务挂载 home 卷；后续命令请使用该 overlay 运行（如果你使用了 `docker-compose.override.yml`，请先加上它）：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  --entrypoint sh openclaw-cli -lc \
  'curl -fsSL https://claude.ai/install.sh | bash'
```

原生安装程序会将 `claude` 写入 `/home/node/.local/bin/claude`。OpenClaw 镜像已将 `/home/node/.local/bin` 加入 `PATH`，因此内置的 Anthropic 插件无需适配器配置覆盖即可找到它。

使用同一个已持久化的 home 目录登录并验证：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  --entrypoint /home/node/.local/bin/claude openclaw-cli auth login
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  --entrypoint /home/node/.local/bin/claude openclaw-cli auth status --text
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  openclaw-cli models auth login \
  --provider anthropic --method cli --set-default
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  openclaw-cli models list --provider anthropic
```

登录保留 `anthropic/*` 模型引用并通过捆绑的 `claude-cli` 后端运行它们：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml run --rm \
  openclaw-cli agent \
  --agent main \
  --model anthropic/claude-sonnet-4-6 \
  --message "Say hello from Docker Claude CLI"
```

`OPENCLAW_HOME_VOLUME` 保留 `/home/node/.local/bin` 和 `/home/node/.local/share/claude` 下的本机安装，以及 `/home/node/.claude` 和 `/home/node/.claude.json` 下的 Claude Code settings/auth。仅坚持 `/home/node/.openclaw` 是不够的；如果您使用 `OPENCLAW_EXTRA_MOUNTS` 而不是主卷，请将所有这些 Claude 路径安装到这两个服务中。

<Note>
对于共享生产自动化或可预测的 Anthropic 计费，首选 Anthropic API-key 路径。 Claude CLI 重用遵循 Claude Code 的安装版本、帐户登录、计费和更新行为。
</Note>

## Bonjour / mDNS

Docker 桥接网络通常不会可靠地转发 Bonjour/mDNS 组播 （`224.0.0.251:5353`）。当 `OPENCLAW_DISABLE_BONJOUR` 未设置时，捆绑的 Bonjour 插件一旦检测到它在容器中运行，就会自动禁用 LAN 广告，因此它不会崩溃循环重试桥接丢弃的多播。设置 `OPENCLAW_DISABLE_BONJOUR=1` 强制关闭它，无论是否检测到，或者设置 `0` 强制打开它（仅在主机网络、macvlan 或已知 mDNS 多播工作的其他网络上）。

否则，请对 Docker 主机使用已发布的网关 URL、Tailscale 或广域 DNS-SD。请参阅 [Bonjour discovery](/gateway/bonjour) 了解陷阱和故障排除。

## <a id="storage-and-persistence"></a> 存储与持久化

Docker 组合绑定安装 `OPENCLAW_CONFIG_DIR` 到 `/home/node/.openclaw`、`OPENCLAW_WORKSPACE_DIR` 到 `/home/node/.openclaw/workspace` 以及 `OPENCLAW_AUTH_PROFILE_SECRET_DIR` 到 `/home/node/.config/openclaw`，因此这些路径在容器更换后仍然存在。未设置变量时，如果 `HOME` 本身丢失，则 `docker-compose.yml` 会回退到 `${HOME}` 或 `/tmp` 之下，因此 `docker compose up` 永远不会在裸环境中发出空源卷规范。

该挂载的配置目录包含：

- 用于行为配置的 `openclaw.json`
- `state/openclaw.sqlite` 用于共享提供商身份验证，`agents/<agentId>/agent/openclaw-agent.sqlite` 用于代理本地 OAuth/API-key 配置文件
- `.env` 用于环境支持的运行时机密，例如 `OPENCLAW_GATEWAY_TOKEN`

auth-profile 秘密目录存储用于恢复旧版加密 OAuth sidecar 凭证的本地加密密钥。将其与 Docker 主机状态保持一致，但与 `OPENCLAW_CONFIG_DIR` 分开。

当前的 OAuth 令牌材料以明文形式存储在 `OPENCLAW_CONFIG_DIR` 下的 SQLite 中，包括访问、刷新和 ID- 令牌值。单独的密钥安装不会加密当前的 SQLite 行或保护这些令牌免受仅状态备份或副本的影响。将配置目录及其备份视为凭据。

已安装的可下载插件会在挂载的 OpenClaw 主目录下存储包状态，因此安装记录和包根目录会在容器替换后保留；网关启动不会重新生成内置插件的依赖树。

有关完整的 VM 持久化细节，请参见 [Docker VM Runtime - What persists where](/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** `media/`、每个 agent 的 SQLite 数据库、旧版 session JSONL 转录、共享的 SQLite 状态数据库、已安装插件的包根目录，以及 `/tmp/openclaw/` 下的滚动文件日志。
