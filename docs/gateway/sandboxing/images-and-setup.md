---
summary: "构建默认、通用和浏览器沙箱映像以及网络和证书默认值"
title: "图像和设置"
read_when: "您需要构建或自定义沙箱映像。"
---

从源签出或 npm 安装构建沙盒映像，以及塑造映像必须已包含的内容的网络和证书默认值。

## <a id="images-and-setup"></a> 镜像与设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

<Note>
**源码检出 vs npm install**

`scripts/sandbox-setup.sh`、`scripts/sandbox-common-setup.sh` 和 `scripts/sandbox-browser-setup.sh` 辅助脚本仅在从 [源码检出](https://github.com/openclaw/openclaw) 运行时可用。它们不包含在 npm 包中。

如果您安装了全局 OpenClaw npm 软件包，请改用如下所示的内联 `docker build` 命令。
</Note>

<Steps>
  <Step id="build-the-default-image" title="构建默认镜像">
    从源码检出：

    ```bash
    scripts/sandbox-setup.sh
    ```

    从 npm 安装（不需要源码检出）：

    ```bash
    docker build -t openclaw-sandbox:bookworm-slim - <<'DOCKERFILE'
    FROM debian:bookworm-slim
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
      && rm -rf /var/lib/apt/lists/*
    RUN useradd --create-home --shell /bin/bash sandbox
    USER sandbox
    WORKDIR /home/sandbox
    CMD ["sleep", "infinity"]
    DOCKERFILE
    ```

    默认镜像**不**包含 Node。如果某个技能需要 Node（或其他运行时），请构建自定义镜像，或通过 `sandbox.docker.setupCommand` 安装（需要网络外连 + 可写根目录 + root 用户）。

    当 `openclaw-sandbox:bookworm-slim` 丢失时，OpenClaw 不会默默地替换普通的 `debian:bookworm-slim`。以默认映像为目标的沙箱运行会因构建指令而快速失败，直到您构建它为止，因为捆绑的映像带有用于沙箱 write/edit 帮助程序的 `python3`。

  </Step>
  <Step id="optional%3A-build-the-common-image" title="可选：构建通用镜像">
    为获得一个带有常用工具（例如 `curl`、`jq`、Node 24、pnpm、`python3` 和 `git`）的功能更完整的沙箱镜像：

    从源码检出：

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    从 npm 安装中，首先构建默认映像（见上文）。将 [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) 和根 [`package.json`](https://github.com/openclaw/openclaw/blob/main/package.json) 从同一 OpenClaw 提交或标记下载到空目录中。保留它们的文件名，然后从该目录运行：

    ```bash
    docker build -t openclaw-sandbox-common:bookworm-slim -f Dockerfile.common .
    ```

    `package.json` 提供固定的 pnpm 版本，并且必须位于构建上下文中，即使使用 `--build-arg INSTALL_PNPM=0` 也是如此。它是只读构建输入；您不需要源签出或主机 pnpm 安装。

    然后将 `agents.defaults.sandbox.docker.image` 设置为 `openclaw-sandbox-common:bookworm-slim`。

  </Step>
  <Step id="optional%3A-build-the-sandbox-browser-image" title="可选：构建沙盒浏览器映像">
    从源码检出：

    ```bash
    scripts/sandbox-browser-setup.sh
    ```

    npm 包不包含浏览器 Dockerfile 或入口点。请使用源码检出构建此镜像。

  </Step>
</Steps>

默认情况下，本地容器沙箱运行时**不使用网络**。通过 `agents.defaults.sandbox.docker.network` 覆盖此设置。

默认关闭的 [ 秘密出口代理](/gateway/secrets#secret-egress-proxy) 仅是网关环回。沙盒执行程序既不接收其 proxy/CA 环境，也不接收受保护的哨兵。 Sandbox/container 代理可达性未实现；不要启用期望秘密替换在此版本中工作的沙盒网络。

<Note>
系统包安装和证书存储更改是映像配置，而不是正常的沙箱转换行为。默认设置故意结合了无网络、只读根文件系统和非根映像用户，因此依次系统包安装应该会失败。当操作员启用网络出口时，可以将项目本地依赖项安装在可写工作区中。首选已包含系统包和私有证书根的自定义映像。如果 Node 进程需要私有 CA，还可以通过自定义映像或 `sandbox.docker.env` 配置 Node 的 CA 路径，例如使用 `NODE_EXTRA_CA_CERTS`。
</Note>

<AccordionGroup>
  <Accordion id="sandbox-browser-chromium-defaults" title="沙盒浏览器 Chromium 默认值">
    内置沙箱浏览器镜像会为容器化工作负载应用保守的 Chromium 启动标志：

    - `--remote-debugging-address=127.0.0.1`
    - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
    - `--user-data-dir=${HOME}/.chrome`
    - `--no-first-run`
    - `--no-default-browser-check`
    - `--disable-dev-shm-usage`
    - `--disable-background-networking`
    - `--disable-breakpad`
    - `--disable-crash-reporter`
    - `--no-zygote`
    - `--metrics-recording-only`
    - `--password-store=basic`
    - `--use-mock-keychain`
    - `--headless=new`（当 `browser.headless` 启用时）。
    - `--no-sandbox --disable-setuid-sandbox`（在沙箱浏览器容器中始终启用）。
    - 默认使用 `--disable-3d-apis`、`--disable-gpu`、`--disable-software-rasterizer`；这些图形强化标志有助于在不支持 GPU 的容器中运行。若工作负载需要 WebGL 或其他 3D 功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
    - 默认使用 `--disable-extensions`；对于依赖扩展的流程，请设置 `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0`。
    - 默认使用 `--renderer-process-limit=2`；由 `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 保留 Chromium 的默认值。

    如果你需要不同的运行时配置，请使用自定义浏览器镜像并提供自己的入口点。对于本地（非容器）Chromium 配置文件，请使用 `browser.extraArgs` 追加额外的启动标志。

  </Accordion>
  <Accordion id="network-security-defaults" title="网络安全默认值">
    - `network: "host"` 被阻止。
    - `network: "container:<id>"` 默认被阻止（存在命名空间加入绕过风险）。
    - 紧急放行覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

  </Accordion>
</AccordionGroup>

Docker 安装和容器化网关位于此处：[Docker](/install/docker)

对于 Docker 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。设置 `OPENCLAW_SANDBOX=1`（或 `true`/`yes`/`on`）以启用该路径。可通过 `OPENCLAW_DOCKER_SOCKET` 覆盖套接字位置。完整的设置和环境变量参考：[Docker](/install/docker#agent-sandbox)。
