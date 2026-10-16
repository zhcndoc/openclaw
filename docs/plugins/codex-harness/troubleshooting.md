---
summary: "Codex harness选择、应用程序服务器和内存问题的症状和修复"
read_when:
  - "当您期望时，Codex 没有被选中"
  - "Codex 应用程序服务器无法启动或连接"
  - "Codex 本机工具被阻止或使用过多内存"
title: "Codexharness故障排除"
sidebarTitle: "故障排查"
---

Codex 应用程序服务器harness的症状、原因和修复。 [Codex harness](/plugins/codex-harness) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness#where-each-section-moved) 列出每个部分。

## <a id="troubleshooting"></a> 故障排查

**Codex 不会作为普通的 `/model` 提供方出现：** 对于新配置来说这是预期行为。请选择 `openai/gpt-*` 模型，启用 `plugins.entries.codex.enabled`，并检查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用内置harness而不是 Codex：** 确认有效路由是确切的官方 HTTPS 平台响应或 ChatGPT 响应路由，没有编写的提供程序请求覆盖，并且 Codex 插件是安装并启用。肯定推理支持和本机推理工作元数据不计为请求覆盖。标头、请求参数、超时和有效负载兼容性开关仍然有效：Codex 声明 OpenClaw 后备，保留确切的请求，包括显式运行时选择。其他不受支持的 routes/authentication 和缺少显式harness会停止执行并出现错误。 `openai/gpt-*` 前缀和 `agentRuntime.id: "codex"` 本身并不是执行证明；检查完成结果中的实际harness。请参见[运行时选择](/concepts/agent-runtimes#runtime-selection)。

**OpenAI Codex runtime 回退到 API-key 路径：** 收集一段已脱敏的 gateway 摘录，展示 model、runtime、所选 provider 和失败信息。请受影响的协作者在其 OpenClaw 主机上运行以下只读命令：

```bash
(
  pattern='openai/gpt-5\.[45]|openai[-]codex|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|legacy OpenAI Codex prefix|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

有用的摘录通常包括 `openai/gpt-6-astra` 或 `openai/gpt-5.6-luna`、`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、`candidateProvider: "openai"` 以及 `401`、`Incorrect API key` 或`No API key` 结果。更正后的运行应显示 OpenAI OAuth 路径，而不是普通的 OpenAI API-key 故障。

**旧版 Codex 模型引用配置仍然存在：** 运行 `openclaw doctor --fix`。Doctor 会将旧版模型引用重写为 `openai/*`，移除过期的会话和整 agent runtime 固定配置，并保留现有的 auth-profile 覆盖。

**应用程序服务器被拒绝：** 使用 Codex `0.149.0` 或更新版本。较旧的、格式错误的和未版本化的服务器将被拒绝。较新的语义版本继续针对 Codex 版本 OpenClaw 提供兼容性警告和正常运行时验证。更新或删除选择其他版本的自定义、远程或桌面二进制覆盖。

**`/codex status` 无法连接：** 检查 `codex` 插件是否已启用；如果配置了 allowlist，检查 `plugins.allow` 是否包含它；并确认任何自定义的 `appServer.command`、`url`、`authToken` 或 headers 都有效。

**无法解析应用程序服务器消息：** OpenClaw 在其他有效的 JSON 字符串中恢复原始换行符。无效的转义或未转义的控制字符会产生经过编辑的警告，然后在 Node 和 Bun 上继续解码并显示下一条消息。这些无效片段不会消耗后续的有效消息。

**驻留目录报告生成失败：** 缺少可执行文件 （`ENOENT`）、缺少执行权限 （`EACCES`） 或不兼容的 CPU （`EBADARCH`，有时显示为 macOS errno `-86`） 停止该目录的自动重试并记录一个建议。这包括 Node 和 Bun 上的本机启动错误，这些错误的诊断是在注册或初始化期间托管启动器退出后到达的。修复安装，然后重新启动网关以重试。不相关的配置重新加载不会重试失败的可执行文件。通过配置重新加载禁用插件会终止其目录刷新循环。

托管被动目录使用插件安装的 Codex 包，并且不会回退到 macOS 桌面应用程序包。 OpenClaw 使用网关的解释器运行其启动器，因此 Codex 选择与该解释器架构匹配的平台包，而无需 `node` PATH 查找。在调试或跟踪日志级别，`Codex app-server spawn` 记录可执行文件、启动程序和解析的本机二进制路径，无需参数或凭据。在 macOS 上使用 `file <path>` 来检查失败的可执行文件的体系结构。使用 `openclaw doctor --lint --only codex/managed-app-server --json` 检查托管本机二进制文件，包括仅为其会话目录启用 Codex 时。

名为 `openclaw-model-catalog-*` 的目录包含 OpenClaw 插件源捕获，而不是本机 Codex 会话。目前的捕获量受到工人世代的限制，并与工人一起退休。医生通过离线清理命令报告称，较年长的捕获物处于托管监管之外；它不会自动删除那些旧目录。

**Codex app-server 使用过多内存：** 首先区分这两个进程。 OpenClaw 将本地 Codex app-server 作为独立的 Rust 子进程运行。 `NODE_OPTIONS=--max-old-space-size=...` 只会改变 Gateway 的 Node.js V8 堆大小；它不会限制或扩大 Codex 的内存。受管控的 Gateway 安装已经会选择自适应的 V8 堆大小， 增大该值反而可能为 Codex 留下更少的主机内存。对于 Gateway 内存压力，请使用 [Gateway 内存故障排查](/gateway/troubleshooting#gateway-exits-during-high-memory-use)， 并检查主机或容器为 Codex 子进程分配的内存。

大型目录回复使用网关中的解码器工作人员。完成回复后，OpenClaw 一分钟后释放该工作人员，无需进一步工作人员解码。本机应用程序-服务器连接及其温暖对话线程保持连接。稍后的大型回复会启动新的解码器，因此其第一次响应可能需要更长的时间；小回复不需要工人。不完整的回复将保留其解码器，直到恢复完成或连接关闭。

**“无法检查Codex流程”：**此错误来自模型推理之前的本地流程检查。对于截止时间错误，请在主机响应恢复后重试。对于权限错误，请检查对 Linux 上的 `/proc` 或 macOS 上的 `ps` 的访问。

**网关重新启动后清理过程中新一轮失败：** OpenClaw 在开始替换之前检查已注册的 Codex 进程。已退出的进程或PID已被重用的进程的注册将被自动删除，而无需扫描不相关的进程。启动清理和新连接会串行化恢复，因此它们无法同时停止或恢复同一孤立连接。在替换工作开始之前，实时孤立进程仍然需要经过验证的后代清理。如果清理仍然受阻，请检查网关日志和主机进程检查访问；不要删除进程注册来绕过恢复。

捆绑的 Codex 没有堆或 RSS 限制，也没有可配置的空闲卸载延迟。在最后一个客户端取消订阅后， 非活跃线程最多可以保持加载 30 分钟。OpenClaw 会在每个 Codex app-server 上独立保持最多 64 个空闲会话线程的订阅， 在它们最后一次活动后的 30 分钟内持续如此。当多个会话交替使用时，这可以保留热会话和会话范围的审批。 活跃轮次以及拥有未完成原生子 agent 的父线程会受到保护，不会被空闲回收；会话重置或删除会立即释放其自身线程。 达到空闲上限后，会取消订阅最近最少使用的会话；随后 Codex 会应用其独立的卸载延迟， 之后恢复的会话可能需要再次进行审批。

在资源受限的主机上，请先减少原生 Codex 子 agent 的扇出，再增加 Gateway 堆大小：

```json5
{
  plugins: {
    entries: {
      codex: {
        config: {
          appServer: {
            args: ["-c", "agents.max_threads=3", "app-server", "--listen", "stdio://"],
          },
        },
      },
    },
  },
}
```

该设置限制捆绑的 Codex 默认多代理后端的本机子线程。如果您显式启用 Codex 多代理 v2，请改用 `features.multi_agent_v2.max_concurrent_threads_per_session=3`； v2 限制包括根线程，不能与 `agents.max_threads` 组合。要获得更多 Codex 余量，请增加主机、容器或 cgroup 内存分配。 OS 硬限制可以终止 Codex 而不是对其进行反压。

**模型发现速度慢：** 检查应用程序服务器与其模型目录端点的连接。默认 `plugins.entries.codex.config.discovery.timeoutMs` 为 10 秒，因此 Codex 可以完成其本机刷新或回退。较短的覆盖可能会中断回退并使本机模型不可用。请参阅 [Codex harness参考 ](/plugins/codex-harness-reference#model-discovery)。

**Codex 插件状态已达到其行限制：** 运行 `openclaw doctor` 以检查已删除或过期的 OpenClaw 会话留下的绑定。停止网关，然后运行 ​​`openclaw doctor --fix` 以在会话修复后删除经过验证的孤立会话绑定。 Doctor 保留受监督的绑定、有效租约、不明确的所有权以及无法读取会话存储的绑定。此清理不会删除本机 Codex 线程历史记录或托管线程咨询记录。

**WebSocket 传输立即失败：** 检查 `appServer.url`、 `authToken`、headers，并确认远程 app-server 使用相同的 Codex app-server 协议版本。Codex WebSocket 传输仍处于实验阶段且不受支持； 优先使用受管控的 stdio 或本地 Unix 控制套接字。

**原生 shell 或 patch 工具被 `Native hook relay unavailable` 阻止：** Codex 线程仍在尝试使用 OpenClaw 已不再注册的原生 hook relay id。这是原生 Codex hook 传输问题，不是 ACP 后端、provider、GitHub 或 shell 命令失败。请在受影响的聊天中使用 `/new` 或 `/reset` 开启全新会话， 然后重试一个无害命令。如果这次能成功，但下一次原生工具调用又失败， 则将 `/new` 仅视为临时解决方案：在重启 Codex app-server 或 OpenClaw Gateway 之后，将提示复制到新会话中，以便旧线程被丢弃并重新创建原生 hook 注册。

**Codex 工具调用创建了太多短期挂钩进程：** 设置 `plugins.entries.codex.config.appServer.loopDetectionPreToolUseRelay: false` 并重新启动网关。这仅禁用用于 OpenClaw 循环检测的 Codex `PreToolUse` 子进程及其无策略标记。所需的 `before_tool_call` 和可信工具策略中继保持启用状态。

**非 Codex 模型使用内置 harness：** 除非 provider 或 model runtime policy 将其路由到其他 harness，否则这是预期行为。 普通的非 OpenAI provider 引用在 `auto` 模式下仍会使用其正常的 provider 路径。

**Computer Use 已安装但工具无法运行：** 在新的会话中检查 `/codex computer-use status`。如果某个工具报告 `Native hook relay unavailable`， 请使用上面的原生 hook relay 恢复方法。 参见 [Codex Computer Use](/plugins/codex-computer-use#troubleshooting)。
