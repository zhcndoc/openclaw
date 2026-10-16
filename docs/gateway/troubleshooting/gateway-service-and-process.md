---
summary: "托管网关服务未运行、macOS launchd故障、高内存退出"
title: "网关服务及流程"
sidebarTitle: "网关服务及流程"
read_when:
  - "网关服务未运行或不会保持运行状态"
  - "macOS 网关会停止运行，直到您触摸仪表板，或者重复的 LaunchAgents 互相争斗"
  - "网关在高内存使用情况下退出，您需要堆大小调整指导"
---

## <a id="gateway-service-not-running"></a> Gateway 服务未运行

当服务已安装但进程无法持续运行时使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

查看以下内容：

- `Runtime: stopped` 并带有退出提示。
- 服务配置不匹配（`Config (cli)` vs `Config (service)`）。
- Port/listener 冲突。
- 使用 `--deep` 时额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 的清理提示。

<AccordionGroup>
  <Accordion id="common-signatures" title="通用签名">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本地网关模式未启用，或者配置文件被破坏并丢失 `gateway.mode`。修复：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新标记预期的本地模式配置。如果您通过 Podman 运行 OpenClaw，则默认配置路径为 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在没有有效 gateway 认证路径（token/password，或已配置的 trusted-proxy）的情况下进行非 loopback 绑定。
    - `another gateway instance is already listening` ／ `EADDRINUSE` → 端口冲突。
    - `Other gateway-like services detected (best effort)` → 存在陈旧或并行 launchd/systemd/schtasks 单元。大多数设置应该为每台机器保留一个网关；如果您确实需要多个端口，请隔离端口 + config/state/workspace. 请参阅 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。
    - 来自 doctor 的 `System-level OpenClaw gateway service detected` → 存在系统级 systemd 单元，而用户级服务缺失。请在允许 doctor 安装用户服务之前移除或禁用重复项，或者如果系统单元才是预期的监管者，则设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安装的监督进程仍然固定在旧的 `--port`。运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然后重启 gateway 服务。

  </Accordion>
</AccordionGroup>

相关：

- [后台执行和进程工具](/gateway/background-process)
- [配置](/gateway/configuration)
- [诊断工具](/gateway/doctor)

## <a id="macos-gateway-silently-stops-responding%2C-then-resumes-when-you-touch-the-dashboard"></a><a id="macos-gateway-silently-stops-responding-then-resumes-when-you-touch-the-dashboard"></a> macOS 网关静默停止响应，然后在你触碰控制面板时恢复

当 macOS 主机上的通道（Telegram、WhatsApp 等）一次安静几分钟到几小时，并且在您打开 Control UI、SSH 或以其他方式与主机交互时网关似乎恢复时使用。 `openclaw status` 通常没有明显的症状，因为当您查看时，网关再次处于活动状态。

```bash
ls ~/.openclaw/logs/stability/ | tail -5
openclaw gateway stability --bundle latest
pmset -g log | grep -iE "sleep|wake|maintenance" | tail -50
launchctl print gui/$UID/ai.openclaw.gateway | grep -E "state|last exit|runs"
```

查看以下内容：

- `~/.openclaw/logs/stability/` 中的一个或多个 `*-uncaught_exception.json` 捆绑包，其中 `error.code` 设置为临时网络代码，例如 `ENETDOWN`、`ENETUNREACH`、`EHOSTUNREACH` 或 `ECONNREFUSED`。
- `pmset -g log` 中有类似 `Entering Sleep state due to 'Maintenance Sleep'` 或 `en0 driver is slow (msg: WillChangeState to 0)` 的行，并且与崩溃时间戳对齐。Power Nap / Maintenance Sleep 会短暂将 Wi-Fi 驱动置于 state 0；在该窗口内发生的任何出站 `connect()` 都可能返回 `ENETDOWN`，即使主机其他方面具有完整的网络连接。
- `launchctl print` 输出显示 `state = not running` 以及多个最近的 `runs` 和退出代码，特别是当崩溃与下一次启动之间的间隔约为一小时而不是几秒时。 macOS launchd 在崩溃爆发后应用未记录的重生保护门，可以停止尊重 `KeepAlive=true`，直到外部触发（例如交互式登录、仪表板连接或 `launchctl kickstart` 重新启动）为止。

常见特征：

- 一个 `error.code` 为 `ENETDOWN` 或同类代码的稳定性包，调用栈指向 Node `net` 的 `lookupAndConnect` / `Socket.connect`。OpenClaw `2026.5.26` 及更新版本会将这些视为良性的瞬态网络错误，因此不再将其传播到顶层未捕获处理器；如果你使用的是更早版本，请先升级。
- 漫长的静默期在你连接 Control UI 或通过 SSH 登录主机的瞬间结束：用户可见的活动是在重新为 launchd 的 respawn 门控上弦，而不是控制面板对网关做了什么。
- `runs` 计数在一天中递增，但 `~/Library/Logs/openclaw/gateway.log` 中没有相应的 `received SIG*; shutting down` 行：干净关闭记录信号；短暂的崩溃则不然。

该怎么办：

1. **如果你运行的是 `2026.5.26` 之前的版本，请升级网关**。升级后，未来的 `ENETDOWN` 错误会以 warning 的形式记录，而不会终止进程。
2. **降低面向始终在线服务器的 Mac mini / 桌面主机上的维护性睡眠活动**：

   ```bash
   sudo pmset -a sleep 0 disksleep 0 standby 0 powernap 0
   ```

   这会显著降低底层驱动抖动，但不能完全消除。系统仍可能为了 TCP keepalive 和 mDNS 维护而执行某些维护性睡眠，无论这些标志如何设置。

3. **添加一个存活监控**，以便在未来由 launchd 暂停的崩溃风暴能被迅速捕获：

   ```bash
   # Example launchd-aware liveness check, suitable for a 5-minute cron or LaunchAgent
   state=$(launchctl print gui/$UID/ai.openclaw.gateway 2>/dev/null | awk -F'= ' '/state =/ {print $2; exit}')
   if [ "$state" != "running" ]; then
     launchctl kickstart -k gui/$UID/ai.openclaw.gateway
   fi
   ```

   关键在于从外部重新为 respawn 门控上弦；仅靠 `KeepAlive=true` 在 macOS 崩溃风暴后并不充分。

相关：

- [macOS 平台说明](/platforms/macos)
- [日志](/logging)
- [诊断工具](/gateway/doctor)

## <a id="macos-launchd-supervisor-loop-with-duplicate-gateway%2Fnode-launchagents"></a><a id="macos-launchd-supervisor-loop-with-duplicate-gateway/node-launchagents"></a> macOS launchd 监督循环，重复的 gateway/node LaunchAgents

当 macOS 安装每隔几秒就不断重启、`openclaw` 健康检查在 healthy 和 unavailable 之间来回波动，并且即使服务看起来正在运行，channel 分发仍然停滞时，请使用此方法。

当 `ai.openclaw.gateway` 和 `ai.openclaw.node` LaunchAgents 均处于活动状态且各自注入 `OPENCLAW_LAUNCHD_LABEL` 时，会发生这种情况。在该状态下，OpenClaw 可以检测到 launchd 监督，尝试手动重新启动回 launchd，并陷入快速 `EADDRINUSE`/respawn 循环而不是稳定的网关进程。

```bash
for i in 1 2 3 4; do
  ps aux | grep 'openclaw.*index.js' | grep -v grep | awk '{print $2}'
  sleep 10
done

openclaw gateway status --deep
openclaw node status
launchctl print gui/$UID/ai.openclaw.gateway | grep -E 'state|last exit|runs'
tail -n 80 ~/Library/Logs/openclaw/gateway.log
```

查看以下内容：

- 在 30 秒采样期间出现多个 gateway PID，而不是一个稳定的进程。
- `EADDRINUSE`、`another gateway instance is already listening` 或 `gateway.log` 中重复的 restart/handoff 行。
- 在一台本应只运行一个受管 gateway 服务的主机上，`~/Library/LaunchAgents/ai.openclaw.gateway.plist` 和 `~/Library/LaunchAgents/ai.openclaw.node.plist` 两者同时被加载。

该怎么办：

1. 如果这台主机只应该运行 Gateway 服务，请通过 OpenClaw 移除受管的 node 服务。**如果你确实依赖 node 服务提供远程 node 功能，请跳过此步骤**；卸载它会停止这台主机上的这些功能：

   ```bash
   openclaw node uninstall
   ```

2. 安装持久性网关包装器，该包装器在启动 OpenClaw 之前清除继承的 launchd 标记。使用支持的`--wrapper`选项；不要编辑 `~/.openclaw/service-env/` 下生成的文件，因为服务重新安装、更新和医生修复会重新生成该文件：

   ```bash
   mkdir -p ~/.local/bin
   cat >~/.local/bin/openclaw-launchd-workaround <<'EOF'
   #!/bin/sh
   set -eu
   unset OPENCLAW_LAUNCHD_LABEL LAUNCH_JOB_LABEL LAUNCH_JOB_NAME XPC_SERVICE_NAME || true
   exec openclaw "$@"
   EOF
   chmod 700 ~/.local/bin/openclaw-launchd-workaround

   openclaw gateway install \
     --wrapper ~/.local/bin/openclaw-launchd-workaround \
     --force
   ```

   `gateway install` 会在强制重装、更新和 doctor 修复之间保留 wrapper 路径。

3. 验证 Gateway 是否稳定并且正在提供 RPC，而不仅仅是在监听：

   ```bash
   openclaw gateway status --deep --require-rpc

   for i in 1 2 3 4; do
     ps aux | grep 'openclaw.*index.js' | grep -v grep | awk '{print $2}'
     sleep 10
   done
   ```

   PID 示例应显示一个稳定的进程，而不是一组循环的 PID，并且入站通道调度应恢复。

4. 在升级到修复了底层双 LaunchAgent 循环的版本后，移除该 workaround，并重新安装正常的受管服务：

   ```bash
   OPENCLAW_WRAPPER= openclaw gateway install --force
   rm ~/.local/bin/openclaw-launchd-workaround
   ```

相关：

- [macOS 上的网关](/platforms/mac/bundled-gateway)
- [诊断工具](/gateway/doctor)
- [网关 CLI](/cli/gateway)

## <a id="native-aborts-on-linux-(sigabrt)"></a><a id="native-aborts-on-linux-sigabrt"></a> Native 在 Linux （SIGABRT） 上中止

`malloc(): invalid next->prev_inuse (unsorted)` 后跟 systemd `status=6/ABRT` 表示检测到的本机堆损坏。它无法识别损坏的代码，并且与内核 OOM 终止不同。 JavaScript 信号处理程序或稳定性捆绑包无法可靠地捕获本机 `abort()`。安排OS核心在**再次失败之前捕获**。

启动日志包括`native runtime`（PID，平台，架构，Node，V8，libuv，OpenSSL和SQLite版本）和`worker startup state`（通过脚本跟踪的Worker计数，starts/retirements，和共享计算准入计数器）。这些是启动事实，而不是失败时刻的快照。使用崩溃时间戳、日志、精确的 OpenClaw 版本和 Node 可执行文件保留它们。

对于 systemd 系统服务，请替换下面的已安装单元名称。对于用户业务，使用`systemctl --user`，不使用`sudo`；其硬核限制不能超过用户管理器继承的限制。

```bash
sudo systemctl edit openclaw-gateway.service
# Add this drop-in:
# [Service]
# LimitCORE=infinity

sudo systemctl daemon-reload
sudo systemctl show openclaw-gateway.service -p LimitCORE -p MainPID
sysctl kernel.core_pattern
```

在下次运营商协调的服务重新启动时应用该限制。然后检查`/proc/<gateway-pid>/limits`是否有正在运行的进程的`Max core file size`；更改单位不会更改已运行进程的限制。

选择 `kernel.core_pattern` 指示的捕获后端：

- **systemd-coredump：** 验证分发的处理程序是否已安装并启用。检查 `coredump.conf` 存储和大小限制；多千兆字节的网关需要足够的磁盘空间和 `ProcessSizeMax`/`ExternalSizeMax` 来保留其核心。崩溃后，使用 `sudo coredumpctl info <crashed-pid>` 和 `sudo coredumpctl debug <crashed-pid>`。
- **Appport：** 检查`/var/log/apport.log` 和`/var/crash`。同一 Node executable/user 的现有报告可以抑制稍后的报告。将确切的过时 `.crash` 报告存档在 `/var/crash` 之外的仅根目录中，然后根据发行版的 Appport 过程清除任何匹配的过时 sidecar。不要删除不相关的报告。验证 Appport 已启用并确实接受下一份报告；仅 `code=dumped` 并不能证明核心已被保存。
- **直接核心文件：** 如果安装的处理程序无法保留此崩溃，管理员可以暂时将其替换为私有绝对路径：

  ```bash
  # Record the old value so it can be restored after the investigation.
  sysctl kernel.core_pattern
  sudo install -d -m 0700 -o <gateway-user> -g <gateway-group> /var/lib/openclaw-cores
  sudo sysctl -w 'kernel.core_pattern=/var/lib/openclaw-cores/core.%e.%p.%t'
  ```

  `core_pattern` 是主机范围的：这也取代了其他进程的捕获。检查该目录是否可由网关服务用户写入并可在任何服务文件系统沙箱内访问。捕获后恢复之前的模式。此临时 `sysctl` 设置不会在重新启动后保留。

在同等服务限制和身份下使用一次性流程验证所选后端，而无需中止实时网关。使用 **matching** Node 二进制和调试符号（`gdb /path/to/node /path/to/core` 对于直接文件）打开捕获的内核，然后运行 ​​`thread apply all bt`。保留所有线程堆栈：中止线程可以检测其他地方造成的损坏。核心文件包含进程内存，包括凭证和消息内容；将其保密并仅共享经过审查和编辑的证据。

## <a id="gateway-exits-during-high-memory-use"></a> Gateway 在高内存使用期间退出

当网关在负载下消失、主管报告 OOM- 式重启或日志显示 `memory pressure: level=critical` 时使用。

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

查看以下内容：

- `memory pressure: level=critical` 与 `reason=rss_threshold`、`heap_threshold` 或 `rss_growth`。
- RSS、该日志行中的堆、阈值和增长值。
- 现有的稳定性捆绑包可防止致命退出、关闭超时或重新启动启动失败（如果可用）。

常见特征：

- `memory pressure: level=critical` 出现在 gateway 日志中 → OpenClaw 检测到严重内存压力，并记录了进程内可用的内存信息。
- `reason=heap_threshold` → 先降低prompt/session压力或减少并发工作。对于托管服务，将 `Gateway heap:` 和 `openclaw gateway status` 中配置的控件和安装时间建议与运行时测量进行比较。重新安装会保留现有的存储堆设置；它不会自动用当前建议替换旧值。
- `reason=rss_growth` → RSS 下限在连续的采样窗口中不断上升。检查最新日志以了解大量导入、失控的工具输出、重复重试或一批排队的代理工作。
- 日志中出现严重内存压力，但不存在捆绑包→在事件发生后捕获`openclaw gateway diagnostics export`以获取可用的操作证据。压力事件不会自动写入包。

管理员还可以在 Node 或 OpenClaw 的 Bun 运行时上使用 `openclaw gateway call diagnostics.heapProfile --timeout 30000` 进行 [ 样本分配 ](/gateway/diagnostics#sampling-heap-profile)。这捕获当前的分配活动，而不是过去的峰值或所有本机内存。较旧的捆绑包仍然可以通过 `openclaw gateway stability --bundle latest` 读取。

在将其附加到错误报告之前检查已清理的诊断导出；避免复制原始日志。

Node的自动堆上限在大型主机上大约可以是4个GiB。这是默认的大小决定，而不是一般的 64 位地址空间上限。 `--max-old-space-size`控制V8旧空间；测量的总 V8 堆上限还包括其他堆空间。 RSS还包括本机分配、缓冲区和其他进程内存。较高的堆上限不会预先分配上限，但在持续负载下仍然需要足够的实际容量和净空。

对于前台 Node 网关，请在 Node 启动之前设置本机堆标志，例如在具有足够容量的主机上：

```bash
NODE_OPTIONS="--max-old-space-size=16384" openclaw gateway run
```

对于自定义管理程序或 Docker 运行时命令，请将 `--max-old-space-size=16384` 紧接在 `node` 之后、OpenClaw 入口脚本之前，或者在该进程或容器的启动环境中设置 `NODE_OPTIONS`。 Docker 映像构建时堆选项不配置运行时网关。 Node 启动后加载的 OpenClaw 配置或 dotenv 值无法调整其堆大小。 `NODE_OPTIONS` 也可以到达生成的 Node 子级，因此当只有网关应该接收预算时，更喜欢直接 Node 参数。

对于托管 Node 服务，请使用 [ 托管网关堆策略 ](/cli/gateway#manage-the-gateway-service) 并在更改托管启动参数和操作员拥有的环境覆盖之前检查它们。 Native argv 覆盖 `NODE_OPTIONS` 中的相同选项；百分比旧空间大小优先于绝对旧空间大小。当操作员覆盖拥有 `NODE_OPTIONS` 时，重新生成会保留存储的 argv，但不会添加自动堆标志。安装程序 shell `NODE_OPTIONS` 不会成为服务覆盖。运行时压力诊断使用有效的 V8 堆上限和 physical/reported 约束余量；过大的显式堆设置不会将 RSS 警报阈值提高到物理容量之上。压力警告是诊断证据，而不是堆限制或自动重启触发器。

RSS 增长检测比较完整的五分钟窗口中的最小 RSS 值，需要两次连续增加。当这些楼层不断上升时，增长就会不断积累；平坦或下降的底部、超过十分钟的采样间隙或时钟回滚都会重置趋势。这会过滤普通的 GC 峰值，同时检测较小的持续增加。记录的 `rssGrowth` 和 `windowMs` 描述了累积楼层增量以及这些最小值之间经过的时间（可能超过十分钟）。

在 Node 上，增长警告和关键事件使用测得的 V8 堆上限和可用进程容量中较小者的 4% 和 8%，最小阈值为 512 MiB 和 1 GiB。流程容量使用由物理 RAM 限制的报告约束，或者在未报告约束时使用物理 RAM。如果有 16 个 GiB 堆和足够的 RAM，这些阈值约为 655 MiB 和 1.28 GiB。未知的堆限制和Bun保留512 MiB/1 GiB增长阈值； Bun 现有的绝对内存上限保持不变。绝对 RSS 和堆压检查仍在每个样品上运行。

相关：

- [网关健康状态](/gateway/health)
- [诊断导出](/gateway/diagnostics)
- [会话](/cli/sessions)
