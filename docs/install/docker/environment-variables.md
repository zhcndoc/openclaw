---
summary: "Docker 安装脚本和 Compose 文件接受的每个环境变量"
read_when:
  - "您正在调整 Docker 构建或网关容器"
  - "您需要 OTLP 或沙箱变量名称"
title: "Docker 环境变量"
sidebarTitle: "环境变量"
---

`scripts/docker/setup.sh` 和网关容器的可选变量，以及构建内存调整。 [Docker](/install/docker) 指南的一部分。

## <a id="environment-variables"></a> 环境变量

`scripts/docker/setup.sh` 接受的可选变量（对于网关容器，也可直接由 `docker-compose.yml` 接受）：

| 变量                                        | 用途                                                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                                | 使用远程镜像，而不是在本地构建                                                                                      |
| `OPENCLAW_GATEWAY_PORT`                         | 主机发布的网关端口（默认`18789`）；两个容器内部都保留端口 `18789`                                         |
| `OPENCLAW_IMAGE_APT_PACKAGES`                   | 在构建期间安装额外的 apt 软件包（以空格分隔）。旧版别名：`OPENCLAW_DOCKER_APT_PACKAGES`                             |
| `OPENCLAW_IMAGE_PIP_PACKAGES`                   | 在构建期间安装额外的 Python 软件包（以空格分隔）                                                                        |
| `OPENCLAW_EXTENSIONS`                           | Compile/package 支持选定的插件并安装其运行时依赖项（逗号或空格分隔的 ID）                   |
| `OPENCLAW_DOCKER_BUILD_NODE_OPTIONS`            | 覆盖本地源码构建的 Node 选项（默认为 `--max-old-space-size=8192`）                                                  |
| `OPENCLAW_DOCKER_BUILD_TSDOWN_MAX_OLD_SPACE_MB` | 以 MB 为单位覆盖本地源码构建的 tsdown 堆内存大小                                                                                   |
| `OPENCLAW_DOCKER_BUILD_SKIP_DTS`                | 在仅运行时的本地镜像构建期间跳过声明文件输出（默认为 `1`）                                                        |
| `OPENCLAW_INSTALL_BROWSER`                      | 在构建时将 Chromium + Xvfb 内置到镜像中                                                                                   |
| `OPENCLAW_EXTRA_MOUNTS`                         | 额外的主机绑定挂载（以逗号分隔的 `source:target[:opts]`）                                                                     |
| `OPENCLAW_HOME_VOLUME`                          | 将 `/home/node` 持久化到一个命名 Docker 卷中                                                                                       |
| `OPENCLAW_TZ`                                   | 将网关和 CLI 容器的时区设置为 IANA 名称（默认为 `UTC`）                                                          |
| `OPENCLAW_SANDBOX`                              | 选择加入沙箱引导（`1`、`true`、`yes`、`on`）                                                                              |
| `OPENCLAW_SKIP_ONBOARDING`                      | 跳过交互式入门步骤（`1`、`true`、`yes`、`on`）                                                                     |
| `OPENCLAW_DOCKER_SOCKET`                        | 覆盖 Docker 套接字路径                                                                                                     |
| `OPENCLAW_DISABLE_BONJOUR`                      | 强制打开（`0`）或关闭（`1`）Bonjour/mDNS广告；参见 [Bonjour / mDNS](/install/docker/networking-and-storage#bonjour-%2F-mdns) |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS`      | 禁用内置插件源绑定挂载覆盖                                                                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                   | 用于 OpenTelemetry 导出的共享 OTLP/HTTP 收集器端点                                                                        |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`                 | 用于跟踪、指标或日志的 Signal- 特定 OTLP 端点                                                                         |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                   | 共享 OTLP 协议回退。仅支持`http/protobuf`                                                                    |
| `OTEL_EXPORTER_OTLP_*_PROTOCOL`                 | Signal- 跟踪、指标或日志的特定协议回退；战胜共享后备                                       |
| `OTEL_SERVICE_NAME`                             | 用于 OpenTelemetry 资源的服务名称                                                                                       |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                 | 选择加入最新的实验性 GenAI 语义属性                                                                             |
| `OPENCLAW_OTEL_PRELOADED`                       | 跳过开始第二个OpenTelemetry SDK当一个被预加载时                                                                      |

更改 `.env` 或 Compose 环境设置后，运行 `docker compose up -d openclaw-gateway` 以使用新值重新创建网关。 `docker compose restart` 不应用环境更改。

The official image ships no Homebrew.在入门引导期间，OpenClaw 在没有 `brew` 的 Linux 容器中隐藏仅限 brew 的技能依赖项安装程序；通过自定义映像提供这些依赖项或手动安装。对 Debian- 打包依赖项使用 `OPENCLAW_IMAGE_APT_PACKAGES`，对 Python 依赖项使用 `OPENCLAW_IMAGE_PIP_PACKAGES`（在构建时运行 `python3 -m pip install --break-system-packages`，因此固定版本并仅使用您信任的索引）。

如果 Docker 报告 `ResourceExhausted`、`cannot allocate memory`，或在 `tsdown` 期间中止，请提高 Docker 构建器的内存限制，或改用更小的显式堆内存重试：

```bash
OPENCLAW_DOCKER_BUILD_NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_DOCKER_BUILD_TSDOWN_MAX_OLD_SPACE_MB=4096
```

显式 tsdown 堆覆盖也是受支持的选择，用于尝试低于自动检测到的安全最小值的构建。这种尝试可能会停滞或失败。
