---
summary: "YOLO 和监护人批准预设，以及沙盒本机执行路径"
read_when:
  - "您正在 YOLO 和监护人批准之间进行选择"
  - "您正在 OpenClaw 沙箱内运行 Codex 本机执行"
  - "您正在将 Codex 执行放在节点或云工作线程上"
title: "Codex 审批和沙箱模式"
sidebarTitle: "批准和沙箱"
---

Codex 轮次的批准和沙箱状态，以及本机执行的运行位置。 [Codex harness参考 ](/plugins/codex-harness-reference) 的一部分； [ 每个部分移动的位置](/plugins/codex-harness-reference#where-each-section-moved) 列出每个部分。

对于本机 plugin/app 工具，还遵循 [app 审批决策顺序 ](/plugins/codex-native-plugins#approval-decision-order)。应用程序准入、工具启用、每个工具审批模式和 OpenClaw 的诱导响应与下面的常规预设是分开的。

## <a id="approval-and-sandbox-modes"></a> 审批和沙箱模式

本地 stdio app-server 会话默认使用 YOLO 模式： `approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及 `sandbox: "danger-full-access"`。这种受信任的本地操作员姿态使得无人值守的 OpenClaw turn 和心跳能够继续推进，而不会出现没人可回应的原生审批提示。

如果 Codex 的本地系统要求文件禁止隐式的 YOLO 审批、 reviewer 或 sandbox 值，OpenClaw 会将隐式默认值改为 guardian， 并选择允许的 guardian 权限。`tools.exec.mode: "auto"` 同样会强制使用经 guardian 审核的 Codex 审批，并且不会保留不安全的旧版 `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖； 将 `tools.exec.mode: "full"` 设为有意的不审批姿态。 同一 requirements 文件中的按主机名匹配的 `[[remote_sandbox_config]]` 条目也会被遵守，用于沙箱默认决策。

将 `appServer.mode: "guardian"` 设置为 Codex guardian 审核审批：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

`guardian` 预设在这些值被允许时会展开为 `approvalPolicy: "on-request"`、 `approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。单独的策略字段会覆盖 `mode`。较旧的 `guardian_subagent` reviewer 值仍然被接受作为兼容别名，但新配置应使用 `auto_review`。

当 OpenClaw 沙箱处于活动状态时，本地 Codex app-server 进程仍然运行在 Gateway 主机上。因此，OpenClaw 会为该轮次禁用 Codex 原生 Code Mode、用户 MCP 服务器以及由 app 支持的插件执行，而不是将 Codex 主机侧沙箱视为与 OpenClaw 沙箱后端等效。Shell 访问通过 OpenClaw 沙箱支持的动态工具暴露，例如在正常的 exec/process 工具可用时使用 `sandbox_exec` 和 `sandbox_process`。

<Note>
在 Docker- 支持的 OpenClaw 沙箱主机（`agents.defaults.sandbox.mode` 设置为 Docker 后端）上，独立 `openclaw doctor` 使用 `unshare` 检查用户命名空间。在 `openclaw update` 期间省略了这些 Codex bwrap 检查；更新后运行`openclaw doctor`。当禁用 Docker 沙箱网络出口并配置本地 Codex 运行时时，它还会运行已配置的 Codex 二进制文件自己的 `workspace-write` 沙箱（禁用网络访问），从而执行 Bubblewrap 的环回设置。无法识别的检查失败将报告为未经验证，而不是命名空间诊断。命名空间故障通常在 Ubuntu/AppArmor 主机上表现为 `bwrap: setting up uid map: Permission denied` 或 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`。修复OpenClaw服务用户上报的主机命名空间策略，并重启网关；与主机范围的 `kernel.apparmor_restrict_unprivileged_userns=0` 后备相比，更喜欢服务进程的范围 AppArmor 配置文件，并且不要仅仅为了满足嵌套的 `bwrap` 而授予更广泛的 Docker 容器权限。
</Note>

## <a id="sandboxed-native-execution"></a> 沙箱化原生执行

默认阻止不支持的执行：活动的 OpenClaw 沙箱会禁用本机 Codex 执行表面，否则这些执行表面将从 Codex 应用程序服务器主机运行。仅当您想通过 OpenClaw 的沙箱后端尝试 Codex 的远程环境支持时，才使用 `appServer.experimental.sandboxExecServer: true`。此预览路径使用固定的 Codex `0.162.0` 应用程序服务器。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            experimental: {
              sandboxExecServer: true,
            },
          },
        },
      },
    },
  },
}
```

当该标志打开并且当前 OpenClaw 会话处于沙箱中时，OpenClaw 启动由活动沙箱支持的本地环回执行服务器，将其注册到 Codex 应用程序服务器，并启动 Codex 线程并使用该 OpenClaw- 拥有的环境。如果应用程序服务器无法注册环境，则运行会因错误而停止，而不是默默地回退到主机执行。

沙箱化进程的输出会以有序的 stdout、stderr 或 PTY 通知流式传输。OpenClaw 仅保留一个有界的近期输出缓冲区，用于轮询和重放，因此长时间运行的进程不会无限增长 app-server 桥接的资源占用。进程退出和清理仍与沙箱拥有的进程绑定。

此预览路径仅支持本地环境。远程 WebSocket app-server 无法访问回环 exec-server，除非二者运行在同一主机上，因此 OpenClaw 会拒绝这种组合。

配对设备或注册的 Crabbox 云工作线程上的 Node- 支持的 `remote-exec` 放置是单独的、放置拥有的执行路径，不需要 `appServer.experimental.sandboxExecServer`。网关将 Codex 应用程序服务器和提供商身份验证保留在本地，而授权节点则通过其现有双工连接运行托管、固定的 Codex 执行服务器。它需要对 `codex.exec-server.stdio.v1` 进行明确的 `gateway.nodes.commands.allow` 授权、批准的配对表面以及每次尝试的启动授权。故意选择的会话 **完全访问** 权限只能在确切承认的轮次和放置保持最新且节点本地 `tools.exec` 和执行批准层都允许 full/off 执行时替换关键的允许一次提示。普通和原始呼叫者仍然需要人工批准。本地拒绝阻止任一启动；完全访问权限无法绕过本地询问和白名单策略。在安装过程中更改本地策略会拒绝启动。网关和节点必须都支持该授权路径；缺少节点策略支持会阻止启动。该节点接收全新的私人住宅和经过消毒的环境，而不是网关提供商、云或 GitHub 凭证。丢失的节点连接会终止尝试和进程，而不是恢复它。每个节点支持的尝试都使用自己的网关应用程序服务器客户端，因为 Codex 可以注册远程环境，但无法从正在运行的应用程序服务器中删除远程环境。节点执行服务器不消耗 OpenClaw 工作槽。包含身份验证、cookie、API 密钥或其他凭证承载标头的 HTTP 请求在到达节点之前会被拒绝；请改用网关拥有的经过身份验证的请求或无凭据端点。支持正常的 Codex 回合，但 `/btw` 附带问题在绑定到活动展示位置之前不可用。托管放置工作区不是 OS 沙箱：批准的进程和文件具有节点帐户的完全访问权限。当需要隔离时，使用单独的最低权限节点帐户。请参阅 [ 在配对设备上运行 Codex](/plugins/codex-harness/placement#run-codex-on-a-paired-device) 和 [ 在云工作线程 ](/plugins/codex-harness/placement#run-codex-on-a-cloud-worker) 上运行 Codex。
