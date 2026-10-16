---
summary: "使用外部管理的 Lightpanda 浏览器执行 JavaScript 和 DOM 任务"
title: "轻量级浏览器"
read_when:
  - "您希望浏览器任务使用轻量级引擎而不是 Chromium"
  - "您在Docker中运行OpenClaw或其浏览器"
  - "您需要 Lightpanda 浏览器配置文件的限制"
---

# <a id="lightweight-browsers"></a> 轻量级浏览器

Lightpanda 是一个用于文本和 DOM 浏览器任务的选择引擎。它通过显式配置的配置文件使用相同的 OpenClaw `browser` 工具。它不是视觉浏览器的替代品：为屏幕截图、PDF 输出以及需要不受支持的浏览器功能的应用程序保留 Chromium 配置文件。

该示例引脚 Lightpanda **1.0.0**。它们不会更改您现有的浏览器配置文件、安装服务或迁移登录的 Chrome 配置文件。

## <a id="browser-plugin-architecture"></a> 浏览器插件架构

捆绑的浏览器插件拥有两个引擎适配器。 Chromium 和 Lightpanda 使用相同的 `browser` 工具、配置文件选择、路由准入、导航策略和会话生命周期。注册的适配器选择功能、CDP 规范化、快照默认值和连接生命周期；它不添加第二个浏览器工具或进程管理器。

浏览器状态报告 `availableEngines` 以及所选引擎的 `sessionScope` 和 `screenshotFidelity`。 Chromium 保留其托管、现有会话、扩展中继和远程 CDP 配置文件。 Lightpanda 仍然是一个明确选择的、仅附加的外部引擎，每个连接一页，并且在会话丢失后不会自动读取重放。

这些是现有插件内的适配器，而不是可单独安装的第三方插件。启用适配器不会下载、启动或捆绑 Lightpanda 引擎。现有配置文件和发动机配置保持不变。

## <a id="licensing-and-distribution"></a> 许可和分发

OpenClaw 的适配器仍获得 MIT- 许可。可选的Lightpanda引擎是**AGPL-3.0或更高版本**，而不是MIT：请参阅其[固定源通知](https://github.com/lightpanda-io/browser/blob/588f6223b9cae8a2406aeef035ed9363a3e404fd/src/main.zig#L1)和[许可证](https://github.com/lightpanda-io/browser/blob/588f6223b9cae8a2406aeef035ed9363a3e404fd/LICENSE)。现有Playwright客户端为Apache-2.0；现有的`ws`客户端是MIT。他们的许可证和第三方通知仍然适用。

这些示例通过 CDP 连接到独立安装、未经修改的引擎。他们不会在 OpenClaw 的软件包或映像中捆绑或重新许可 Lightpanda。引擎及其容器依赖项不是 MIT-only 发行版。如果您的部署不包括 Copyleft 软件，请不要选择此引擎。

镜像或捆绑引擎需要单独的重新分发审查，包括许可通知、相应源和第三方义务。修改网络服务引擎还需要审查 AGPL 第 13 节。单独的过程并不是全面的法律豁免，并且校验和验证并不能确定许可证合规性。请参阅 [ 工件和依赖性审查 ](https://github.com/openclaw/openclaw/blob/main/deploy/lightpanda/README.md)，了解已验证的引脚和剩余限制。

## <a id="alternatives-reviewed"></a> 替代方案已审核

以下是截至 **2026-09-21** 的许可比较，并非声称这些替代方案已通过 OpenClaw 集成或跨平台测试。 MIT- 兼容的应用程序和完全宽松的引擎分发是不同的要求。

| 选项                  | 引擎和许可边界                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromium 无头外壳 | 已建立的 CDP 引擎，不是完全许可的二进制文件。被检查的153.0.8010.12发行版的`LICENSE.headless_shell`包括LGPL和MPL通知；其固定来源识别出 [FFmpeg 的 LGPL 术语 ](https://chromium.googlesource.com/chromium/third_party/ffmpeg/+/53fa34a23be9054d25ac2500dbdae9a0e570bb5c/README.chromium) 和 [ 混合许可连字符数据 ](https://chromium.googlesource.com/chromium/src/+/971a7443b0c9b0a9b2860529b33331b76077ec62/third_party/hyphenation-patterns/README.chromium)。 |
| Cloudflare 风筝冲浪     | [托管的无状态浏览器运行引擎](https://developers.cloudflare.com/browser-run/kitesurf/)，在本次评论中不是可下载的替代品。 Cloudflare 的 [announcement](https://blog.cloudflare.com/kitesurf/#final-notes) 将开源描述为未来的工作；自托管引擎版本及其许可证不适用于本次审核。服务条款与客户端库许可证是分开的。                                                                                                         |
| 暗箱 0.2.3           | 具有嵌入式 Deno/V8 和 [Apache-2.0 根许可证](https://github.com/h4ckf0r0day/obscura/blob/1a3169da276d7720732c7b20535474942917fb83/LICENSE) 的独立 Rust 引擎。它是为避免 AGPL 引擎而审查的最强大的独立轻量级候选者，但具有 MPL 依赖性和未解决的重新分发通知工作。它不是一个完全允许的替代品。                                                                                                                                    |

自动化客户端不会替换引擎。例如，[Vercel的代理浏览器](https://github.com/vercel-labs/agent-browser/blob/44583ac8385d814ab98cbf40feec97620376b50e/README.md)提供Chrome和Lightpanda后端；其自己的 Apache-2.0 许可证不会更改所选引擎的许可证。同样的区别也适用于 Playwright 和 Puppeteer 客户端。

### <a id="obscura-audit-boundary"></a> Obscura审计边界

[发布 v0.2.3](https://github.com/h4ckf0r0day/obscura/releases/tag/v0.2.3) 在提交 `1a3169da276d7720732c7b20535474942917fb83` 时进行了审核。其[lockfile](https://github.com/h4ckf0r0day/obscura/blob/1a3169da276d7720732c7b20535474942917fb83/Cargo.lock)包含471个注册表包。他们的许可证声明不包含 AGPL，但有 5 个仅包含 MPL-2.0：`cooked-waker` 5.0.0、`cssparser` 0.34.0、`cssparser-macros` 0.6.1、`dtoa-short` 0.3.5 和 `selectors` 0.26.0. 这些依赖项保留在无渲染引擎的 DOM/JavaScript 路径中。 [MPL的文件级义务](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)不需要不相关的MIT适配器文件成为MPL；它们仍然适用于所涵盖的代码及其分发。

下载的 Linux x86-64 无渲染存档与版本 SHA-256 `b5e55e8f2c97814127a521cd59af1a84b79dc40cf658fda04df04af81a2d89f3` 相匹配。它仅包含 `obscura` 和 `obscura-worker`，没有许可证或通知文件。固定的 [release 工作流程](https://github.com/h4ckf0r0day/obscura/blob/1a3169da276d7720732c7b20535474942917fb83/.github/workflows/release.yml) 仅打包那些可执行文件，并且不使用 Cargo 的 `--locked` 标志。因此，源锁元数据并不能证明每个发布二进制文件内的完整依赖关系集。在捆绑或推荐集成部署之前，完整的 V8/third-party 和平台库审查、通知、源可用性和运行时兼容性仍有待验证。

## <a id="choose-where-the-engine-runs"></a> 选择发动机运行的位置

| OpenClaw 位置       | 光熊猫位置                              | 简介 CDP URL        |
| ----------------------- | ------------------------------------------------ | ---------------------- |
| 主机，包括Windows | Docker/Podman 具有环回发布端口     | `ws://127.0.0.1:9222`  |
| Linux 或 macOS 主机     | 同一主机上的本机二进制文件                   | `ws://127.0.0.1:9222`  |
| Docker 撰写          | 同一 Compose 项目中的 Sidecar              | `ws://lightpanda:9222` |
| WSL                     | 同一 WSL 发行版中的本机 Linux 二进制文件 | `ws://127.0.0.1:9222`  |

OpenClaw 容器内的 `localhost` 表示该容器，而不是主机，也不是 Lightpanda sidecar。使用容器到容器连接的服务名称。在 Windows 上，在 **Linux 容器** 模式中运行 Docker Desktop，或者在 WSL 中同时运行 OpenClaw 和 Linux 引擎。 Lightpanda 不发布本机 Windows 二进制文件。 macOS 和 Linux 具有官方 x86-64 和 ARM64 发行二进制文件；官方容器镜像有 Linux amd64 和 arm64 变体。 [上游安装信息](https://github.com/lightpanda-io/browser#install)。

## <a id="docker-with-openclaw-on-the-host"></a> Docker 与主机上的 OpenClaw

从存储库根目录：

```sh
docker compose -f deploy/lightpanda/compose.yaml -f deploy/lightpanda/compose.host.yaml up -d
docker compose -f deploy/lightpanda/compose.yaml -f deploy/lightpanda/compose.host.yaml exec lightpanda /bin/lightpanda version
```

该示例仅在 `127.0.0.1:9222` 上发布 CDP。设置 `LIGHTPANDA_PORT` 以选择另一个主机端口，并更新配置文件 URL 以匹配。该映像由其多平台摘要固定，因此 Docker 选择主机架构，而无需拉动移动的 `latest` 或 `nightly` 版本。

CDP 为客户端提供对浏览器的控制权；该示例未添加 CDP 身份验证。不要更改与公共地址的环回绑定。使用经过身份验证的隧道从另一台主机进行访问。

仅停止并删除此示例的容器和网络：

```sh
docker compose -f deploy/lightpanda/compose.yaml -f deploy/lightpanda/compose.host.yaml down
```

## <a id="docker-compose-with-openclaw-in-a-container"></a> Docker 在容器中与 OpenClaw 组合

将 sidecar 合并到存储库的现有 Compose 项目中：

```sh
docker compose -f docker-compose.yml -f deploy/lightpanda/compose.yaml up -d lightpanda
```

在下面的配置文件中使用 `cdpUrl: "ws://lightpanda:9222"` 配置 OpenClaw 网关。启动网关时使用相同的 Compose 文件和项目名称。在此变体中，没有浏览器端口发布到主机。容器共享项目的桥接网络并保留出站互联网访问；该网络未声明为 `internal: true`，因为这会阻止公共站点浏览。

使用正常的 OpenClaw Docker 设置来进行其状态目录、身份验证和网关启动。 sidecar 不会安装您的 OpenClaw 状态、浏览器 cookie 或主机 Docker 套接字。

对于 Podman，请使用已安装的 Compose 提供程序并在选择 sidecar URL 之前验证服务名称 DNS。没有 `aardvark-dns` 帮助程序的 netavark 安装可以启动环回发布的引擎，同时使容器 DNS 损坏；引擎成功启动并不能证明边车连接。

## <a id="native-linux-and-macos"></a> Native Linux 和 macOS

从 [Lightpanda 1.0.0](https://github.com/lightpanda-io/browser/releases/tag/1.0.0). 下载适用于您的操作系统和 CPU 的发布二进制文件。示例的 `deploy/lightpanda/SHA256SUMS` 记录发布资产摘要。

对于 Linux x86-64，从存储库根运行：

```sh
curl --fail --location --output lightpanda-x86_64-linux https://github.com/lightpanda-io/browser/releases/download/1.0.0/lightpanda-x86_64-linux &&
  sha256sum --check --ignore-missing deploy/lightpanda/SHA256SUMS &&
  chmod +x lightpanda-x86_64-linux &&
  LIGHTPANDA_DISABLE_TELEMETRY=1 LIGHTPANDA_DISABLE_CORE_DUMP=1 ./lightpanda-x86_64-linux serve --host 127.0.0.1 --port 9222
```

对于 macOS Apple 硅：

```sh
curl --fail --location --output lightpanda-aarch64-macos https://github.com/lightpanda-io/browser/releases/download/1.0.0/lightpanda-aarch64-macos &&
  shasum --algorithm 256 --check --ignore-missing deploy/lightpanda/SHA256SUMS &&
  chmod +x lightpanda-aarch64-macos &&
  LIGHTPANDA_DISABLE_TELEMETRY=1 LIGHTPANDA_DISABLE_CORE_DUMP=1 ./lightpanda-aarch64-macos serve --host 127.0.0.1 --port 9222
```

对于 Linux ARM64 使用 `lightpanda-aarch64-linux` 或对于 Intel macOS 使用 `lightpanda-x86_64-macos`。仅在校验和匹配后才执行下载的二进制文件。 Linux 发布二进制文件需要 glibc；在基于 musl 的系统（例如 Alpine）上使用官方容器镜像。这些命令在前台运行引擎；使用 Ctrl+C 停止它。

## <a id="configure-an-opt-in-profile"></a> 配置选择加入配置文件

将此浏览器块合并到您现有的配置中：

```json5
{
  browser: {
    profiles: {
      lightpanda: {
        engine: "lightpanda",
        cdpUrl: "ws://127.0.0.1:9222",
        attachOnly: true,
      },
    },
  },
}
```

在浏览器工具调用中使用 `profile: "lightpanda"`。当所选工作负载通过检查后，将 `browser.defaultProfile` 设置为 `"lightpanda"` 以使其成为默认工作负载。保留您的 Chromium 配置文件并明确选择它用于视觉或不受支持的工作。恢复之前的 `defaultProfile` 以撤消选择。

`engine`声明能力合同；一个CDP终点本身并不意味着Chromium兼容性。`attachOnly`方法OpenClaw附加到您启动的服务，而不是启动或获取本地服务的所有权Chrome过程。不设置`executablePath`到Lightpanda：它的CLI不是Chrome的推出CLI。

## <a id="session-and-capability-limits"></a> 会话和能力限制

- A Lightpanda CDP 连接拥有其页面状态。关闭连接、停止容器或重新启动引擎都会丢失该状态；重新连接不会恢复上一页或登录。
- One CDP 连接支持一页目标。单独的连接可以共存，但 Lightpanda 配置文件不是一般的多选项卡 Chromium 会话。
- 操作失败后不会发生自动跨引擎重放。单击或表单提交可能已经发生；在重复之前检查其结果。
- Lightpanda 的文本布局预览不是渲染的屏幕截图。它无法证明 CSS、图像、字体或视觉布局的正确性。
- 已验证的快照路径为 AI 格式，并带有 `aria` 引用。引擎默认选择这些引用，包括高效的快照模式。此适配器不支持显式角色引用、selector/frame-scoped 快照、带标签的屏幕截图和单独的 `aria` 快照格式。
- JavaScript 和 Web API 并不能保证每个网站都能正常运行。验证您实际使用的网站和交互模式。
- Lightpanda 1.0.0 默认强制执行 CORS。跨源 fetch/XHR 请求需要目标相应的 CORS 标头；该示例不会禁用此保护。该引擎还采用 `--locale` 的语言，而不是退回到英语。

该引擎及其会话模型记录在 [pinned Lightpanda 源 ](https://github.com/lightpanda-io/browser/tree/588f6223b9cae8a2406aeef035ed9363a3e404fd) 中。有关共享配置文件和路由规则，请参阅 [ 浏览器配置文件](/tools/browser/profiles) 和 [ 远程浏览器](/tools/browser/remote)。

## <a id="verification-and-benchmarks"></a> 验证和基准测试

引擎启动、CDP 连接、任务完成和完整 OpenClaw 集成是单独的检查。正在运行的容器或成功的 `Browser.getVersion` 并不能证明快照、引用和操作可以通过 OpenClaw 发挥作用。

### <a id="chromium-headless-shell-baseline"></a> Chromium 无头壳基线

对于没有 Lightpanda 的 AGPL 引擎的替代方案，首先通过现有的 Chromium 配置文件测试 Chromium 的无头 shell。保留Chromium的第三方许可义务；这不是 MIT-only 二进制文件。它不需要另一个自动化守护程序或 OpenClaw 引擎适配器。

使用存储库固定的 Playwright 安装程序而不是未固定的包装器：

```sh
node node_modules/playwright-core/cli.js install chromium-headless-shell
node node_modules/playwright-core/cli.js install --dry-run chromium-headless-shell
```

第二个命令打印所选版本、平台下载和安装目录。在该目录中找到 `chrome-headless-shell`（或 Windows 上的 `chrome-headless-shell.exe`）。 Linux还需要浏览器的系统库和字体；请参阅 [Linux 故障排除](/tools/browser-linux-troubleshooting)。从存储库根运行，引用包含空格的路径：

```sh
node --import ./scripts/tsx.mjs extensions/browser/scripts/bench-lightweight.ts --headless-shell "/path/to/chrome-headless-shell" --iterations 10 --output headless-shell-benchmark.json
```

该报告将请求的分发与其 Chromium 协议引擎和观察到的浏览器版本分开标记。 `--headless-shell` 仅选择基准可执行文件：它不安装生产浏览器、更改配置文件或建立二进制来源。在检查部署时保留其完整的分布和 `LICENSE.headless_shell`。安装程序还会下载平台帮助程序资产，包括 FFmpeg；单独审查并保留自己的通知。使用单独的调用进行完整的 Chromium 和 headless-shell 比较；必须测量内存或启动节省，而不是从下载大小推断。

### <a id="native-engine-comparison"></a> Native引擎比较

安装开发依赖项后，从存储库根运行选择加入的综合路由基准测试：

```sh
node --import ./scripts/tsx.mjs extensions/browser/scripts/bench-lightweight.ts --lightpanda /path/to/lightpanda --chromium /path/to/chrome --iterations 10 --output lightweight-benchmark.json
```

任何二进制标志都可以单独使用。该脚本创建隔离的 OpenClaw 状态和浏览器数据，提供本地表单，然后验证导航、默认高效的 AI 快照、基于引用的 typing/clicking、通过浏览器路由调度程序完成一个表单提交、等待和文本提取。 Chromium 基线使用 OpenClaw 的托管无头启动标志，并禁用此隔离本地装置的沙箱；它不会更改生产浏览器配置。最小的 Linux 主机仍然需要 Chromium 的共享库和字体。可以使用 `LD_LIBRARY_PATH` 和 `FONTCONFIG_FILE` 选择任务本地安装，而无需更改主机的软件包。 Lightpanda 还检查不支持的操作拒绝、单页限制以及断开连接后拒绝过时的目标。这些检查不使用 LLM，也不测量模型推理或端到端代理令牌成本。

`--iterations` 接受 1 到 100 并计数 **warm 任务**。单独的第一个任务包括初始页面打开和 CDP 附件；每个温暖的任务都包括导航和相同的表单工作流程。本机运行还报告进程启动以及从启动到第一个完成任务的时间。温暖的百分位数排除了第一个任务。 Capability/session 检查在测量窗口后运行。

联合运行使用一台Node控制器并记录发动机命令；其较新的引擎可以重用较早引擎已加载的控制器模块。第一个任务和进程启动数字不是 CLI/controller 冷测量。比较独立初始化的控制器时使用单独的调用。

内存字段是 **最大采样进程树 PSS/RSS**，而不是真正的峰值。他们使用 Linux `/proc`，每 50 毫秒在任务边界进行一次采样尝试。短期进程或瞬时分配可能会被错过。不受支持的主机和外部管理的引擎报告 `null`，就像使用不可读的进程内存运行一样，永远不会猜测引擎内存数字。控制器 RSS 是一个单独的工作负载结束示例，不是增量控制器开销；不要添加独立采样的最大值并调用总峰值主机内存。

### <a id="an-externally-managed-engine"></a> 外部管理引擎

使用专用引擎实例。外部模式关闭基准测试的控制连接及其自己的 Chromium 选项卡，但不会停止引擎进程：

```sh
node --import ./scripts/tsx.mjs extensions/browser/scripts/bench-lightweight.ts --endpoint ws://127.0.0.1:9222 --engine lightpanda --fixture-bind 0.0.0.0 --fixture-host host.docker.internal --iterations 10 --output lightweight-container-benchmark.json
```

此示例从其主机寻址 Docker 桌面引擎。合成固定装置侦听器在主机上显式公开，以便容器可以访问它； `--fixture-host` 必须从浏览器的网络命名控制器，而不是从控制器自己的网络命名。 Linux Docker 需要可到达的主机地址或配置的 `host-gateway` 映射。当省略这些标志时，默认夹具 listener/hostname 仍保留为 `127.0.0.1`。

外部模式将引擎启动和内存报告为 `null`。与报告一起单独捕获固定的 container/binary 版本。 Windows Node 控制器可以使用相同的外部引擎接口，但尚未针对此示例验证 Windows Docker 运行时行为。

将相同的固定任务与固定的 Chromium 基线进行比较。在报告速度或内存改进之前记录任务完成情况；不受支持或失败的工作不得算作成功的快速结果。分别报告热运行和冷运行、引擎版本、主机 OS/architecture、客户端开销以及内存是否包含整个进程树或容器。

对于 Docker Desktop，容器内存不包括 VM 的主机开销。不要将本机进程 RSS 数据与仅容器数据进行比较，并将差额称为主机节省总额。将所有基准装置保持为公开或本地；不要导出现有的登录浏览器配置文件来进行基准测试。

上面列出的平台支持描述了上游分发和部署拓扑，而不是声称每个平台都通过了相同的运行时测试。使用基准报告记录实际平台和容器运行时结果。
