---
summary: "将 OpenClaw 网关作为 Electron 或其他主机应用程序的子进程进行监管"
read_when:
  - "将 OpenClaw 嵌入桌面或服务器应用程序"
  - "将网关作为子进程进行监控"
  - "处理网关准备情况、重新启动、关闭或无效配置，而无需抓取日志"
title: "嵌入 OpenClaw"
---

嵌入主机应监督已安装的 `openclaw` 可执行文件，使用网关 WebSocket 协议作为其控制平面，并将子进程视为可替换的运行时。这使流程所有权、准备情况、故障恢复和升级保持明确，而不依赖于 OpenClaw 的私有状态布局。

有关客户端身份验证和重新连接状态，请阅读 [ 构建网关客户端](/gateway/clients)。

## <a id="start-the-child-with-an-embedding-preset"></a> 使用嵌入预设启动子级

使用真实的 `node_modules` 安装并生成包可执行文件。对于拥有发现、重启和通道生命周期的主机来说，一个有用的基线是：

```ts
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Supply an absolute path to a real Node runtime managed by the host application.
declare const hostNodeExecutable: string;

const packageEntry = fileURLToPath(import.meta.resolve("openclaw"));
const openclawEntry = resolve(dirname(packageEntry), "..", "openclaw.mjs");
const gateway = spawn(hostNodeExecutable, [openclawEntry, "gateway", "--allow-unconfigured"], {
  env: {
    ...process.env,
    OPENCLAW_DISABLE_BONJOUR: "1",
    OPENCLAW_EXEC_SHELL_SNAPSHOT: "0",
    OPENCLAW_NO_RESPAWN: "1",
    OPENCLAW_SKIP_CHANNELS: "1",
  },
  stdio: ["ignore", "inherit", "inherit"],
});
```

通过安装包解决OpenClaw如图所示；不要假设项目本地 `openclaw` 二进制文件位于主机进程的 `PATH` 上。该示例继承输出，因此子级不能阻塞完整的 stdout 或 stderr 管道。如果主机捕获这些流，则在生成后立即附加消费者。

| 设置                          | 嵌入效应                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_DISABLE_BONJOUR=1`     | 当主机拥有发现时，禁用网关拥有的 LAN 多播广告。                                                                                                             |
| `OPENCLAW_NO_RESPAWN=1`          | 在非托管嵌入子级中，防止 OpenClaw 将更新重新启动交给分离的子级。例行重启仍在进行中，因此主机保留所跟踪的 PID 的所有权。 |
| `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` | 禁用主机执行命令的登录 shell 快照捕获。                                                                                                                              |
| `OPENCLAW_SKIP_CHANNELS=1`       | 跳过频道启动和重新加载。仅当嵌入应用程序需要控制平面或 WebChat-only 网关时才设置它。                                                                        |

`--allow-unconfigured` 仅绕过 `gateway.mode=local` 启动防护。它不会写入配置或修复无效文件。当嵌入应用程序通过载入、配置 CLI 或网关 RPC 提供正常的本地配置时，请忽略它。

### <a id="electron-shell-snapshot-warning"></a> Electron shell 快照警告

Shell 快照捕获从登录 shell 运行 `process.execPath -e <script>`。在正常的 Node 进程中，`process.execPath` 是 Node 可执行文件。在 Electron 下，它是 Electron 二进制文件，它可以将调用解释为应用程序启动并显示“无法找到 Electron 应用程序”弹出窗口。在网关子环境中设置 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0`，而不仅仅是在渲染器进程中。出于同样的原因，`hostNodeExecutable` 必须指向真正的 Node 运行时而不是 Electron 的 `process.execPath`。

## <a id="handle-invalid-config-by-exit-code"></a> 通过退出代码处理无效配置

网关启动使用退出代码 `78` （`EX_CONFIG`） 来表示配置类启动失败，包括无效的配置。在退出代码上分支，而不是抓取人类可读的 stderr：

1. 针对与子网关相同的配置和状态环境运行 `openclaw doctor --fix --yes --non-interactive`。
2. doctor 成功退出后重试一次网关启动。
3. 如果子进程再次退出 `78`，则停止修复循环并向用户显示配置失败。

保留 stderr 用于诊断，但不要根据其措辞做出生命周期决策。

成功启动后，无效的实时配置编辑的破坏性较小。配置观察程序记录重新加载被跳过并继续提供最后接受的内存中配置。修复文件，然后让观察者接受下一个有效快照。

## <a id="wait-for-protocol-readiness"></a> 等待协议准备就绪

使用 WebSocket 信号代替日志子字符串：

1. 打开网关WebSocket。
2. 等待`connect.challenge`事件。这证明监听者接受了WebSocket并且挑战握手可以开始。
3. 发送带有质询绑定设备签名的`connect`。
4. 将 `hello-ok` 视为经过身份验证的 RPC 的应用程序准备就绪。

挑战故意早于完全初始化。如果启动 sidecar 仍待处理，则 `connect` 返回可重试的 `UNAVAILABLE` 错误，其中包含 `details.reason: "startup-sidecars"`（有界 `retryAfterMs`），然后以代码 `1013` 和原因 `gateway starting` 关闭。使用 `@openclaw/gateway-protocol/startup-unavailable` 中的 `resolveGatewayStartupRetryAfterMs` 或参考客户端的内置策略，然后重新连接。

## <a id="interpret-restart-and-shutdown"></a> 解释重启和关机

在有序关闭之前，网关会广播 `shutdown` 事件以及 `reason` 和可选的 `restartExpectedMs`。数字 `restartExpectedMs` 表示预计会进行进程内或受监督的重新启动；缺失值或空值表示终端关闭。

对于这两种情况，后续的 WebSocket 关闭代码都是 `1012`。在这两种情况下，普通客户端关闭原因也是 `service restart`，因此关闭代码和原因都无法区分重新启动和关闭。当前面的 `shutdown` 负载到达时，保留它，并将其与主机自己的停止意图和子进程退出状态结合起来。如果连接在没有发生事件的情况下消失，请使用正常的有界重新连接和子监督策略。

接受的代理响应会在命令和清理完成之前确认请求。关闭通过取消和最终清理保留该工作。如果关闭或启动失败清理无法完成，子进程将失败退出，而不是在同一进程中启动另一个网关生成。等待孩子退出后再更换。

## <a id="use-rpc-instead-of-state-files"></a> 使用RPC代替状态文件

保持网关作为 OpenClaw 状态的唯一所有者。常见的嵌入操作已经有 RPC 方法：

| 任务                          | RPC方法                                          |
| ----------------------------- | ---------------------------------------------------- |
| 会话目录和生命周期 | `sessions.list`, `sessions.patch`, `sessions.delete` |
| 成绩单展示            | `chat.history`                                       |
| 成本和使用报告        | `usage.cost`, `sessions.usage`                       |
| 模型凭证状态       | `models.authStatus`                                  |
| 配置                 | `config.get`, `config.patch`                         |

`config.get` 在返回快照之前编辑敏感值和 SecretRef 标识符。写入方法还返回经过编辑的配置。客户端必须将编辑哨兵视为不透明并使用记录的配置写入合约；它绝不能期望网关返回明文秘密。

请勿读取或更改 `~/.openclaw` 下的文件、SQLite 表、转录文件或缓存目录来实现应用程序功能。这些布局是私有运行时实现细节，可以在没有协议兼容性的情况下移动或更改。

## <a id="install%3B-do-not-flatten"></a><a id="install-do-not-flatten"></a> 安装；不要压平

根 `openclaw` 包不是单文件供应商目标。 `dist/extensions` 下的捆绑运行时文件保留裸露的自导入，例如 `openclaw/plugin-sdk/*`，而 npm 包有意排除每个扩展的 `node_modules` 树。

通过 npm、pnpm 或其他正常的 Node 软件包安装来安装 OpenClaw，以便 Node 可以解析软件包导出和根依赖关系树。生成已安装的 `openclaw` 可执行文件。请勿仅复制 `dist`、将包平铺到应用程序包或供应商选择的扩展文件中。

## <a id="related"></a> 相关内容

- [构建网关客户端](/gateway/clients)
- [网关协议](/gateway/protocol)
- [网关 CLI](/cli/gateway)
- [外部应用程序的网关集成](/gateway/external-apps)
