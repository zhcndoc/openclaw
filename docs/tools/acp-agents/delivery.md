---
summary: "如何为交互式会话和家长拥有的会话以及沙箱边界提供 ACP 输出"
title: "ACP 代理发货模型"
read_when:
  - "对 ACP 完成交付或代理到代理循环进行故障排除"
  - "您正在恢复现有的 ACP 会话"
  - "您需要 ACP 沙箱安全边界"
---

## <a id="delivery-model"></a> 发货模型

ACP 会话既可以是交互式工作区，也可以是父级拥有的后台工作。投递路径取决于这种形态。

<AccordionGroup>
  <Accordion id="interactive-acp-sessions" title="交互式 ACP 会话">
    交互式会话旨在在可见聊天界面上持续对话：

    - `/acp spawn ... --bind here` 会将当前对话绑定到 ACP 会话。
    - `/acp spawn ... --thread ...` 将通道 thread/topic 绑定到 ACP 会话。
    - 持久配置的 `bindings[].type="acp"` 会将匹配的对话路由到同一个 ACP 会话。

    绑定对话中的后续消息直接路由到 ACP 会话，并且 ACP 输出将传递回同一 channel/thread/topic.

    一旦准备好的 ACP 回合被接受提交，通道的五分钟入口启动超时将不再适用。该回合保持其配置的执行超时，并且仍然可以显式停止；缓慢的回复不会导致触发消息再次发送。

    当 ACP 代理在交付轮次期间请求结构化输入时，OpenClaw 将支持的表单字段呈现为最多三个批次的瞬态网关问题。单选和多选字段最多支持四个选择。 URL 请求显示文字 HTTP（S） URL，并具有显式的“继续”和“拒绝”选择； OpenClaw 无法获取或打开它。明确的秘密字段使用警告、短暂的文本回复提示，并且永远不会存储在网关问题记录中。格式错误或不受支持的请求会产生可见的解释并被拒绝，而不是返回空答案。

    OpenClaw 向 harness 发送的内容：

    - 正常绑定的后续内容将作为提示文本发送，仅当 harness/backend 支持时才会添加附件。
    - `/acp` 管理命令和本地 Gateway 命令会在 ACP 派发前被拦截。
    - 运行时生成的完成事件会按目标具现化。OpenClaw agent 会收到 OpenClaw 内部的运行时上下文信封；外部 ACP harness 会收到一个只包含子结果和指令的纯提示词。原始的 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` 信封绝不应发送给外部 harness，也不应作为 ACP 用户对话文本持久化。
    - ACP 转录条目使用面向用户的触发文本或纯完成提示词。内部事件元数据会尽可能保持为 OpenClaw 中的结构化内容，不会被视为用户撰写的聊天内容。

  </Accordion>
  <Accordion id="parent-owned-one-shot-acp-sessions" title="家长拥有的一次性 ACP 会话">
    由另一个 agent 运行触发的一次性 ACP 会话是后台子任务，类似于子代理：

    - 父通过 `sessions_spawn({ runtime: "acp", mode: "run" })` 请求工作。
    - 子在其自己的 ACP harness 会话中运行。
    - 子回合运行在原生子代理 spawn 所使用的同一后台线路上，因此缓慢的 ACP harness 不会阻塞无关的主会话工作。
    - Completion 通过任务完成通知路径返回报告。 OpenClaw 在将内部完成元数据发送到外部harness之前将其转换为普通的 ACP 提示，因此harness看不到 OpenClaw-only 运行时上下文标记。
    - 如果需要面向用户的回复，父会用正常的助手语气改写子结果。

    **not** 是否将此路径视为父子之间的点对点聊天。子进程已经有一个返回父进程的完成通道。

  </Accordion>
  <Accordion id="sessions-send-and-a2a-delivery" title="sessions_send 和 A2A 发货">
    `sessions_send` 在 spawn 之后可以定向到另一个会话。对于普通的同级会话，OpenClaw 在注入消息后会使用 agent-to-agent（A2A）后续路径：

    - 等待目标会话回复。
    - 可选地让请求者和目标交换有限数量的后续回合。
    - 要求目标生成一条通知消息。
    - 将该通知投递到可见频道或线程。

    当发送者需要可见后续时，这条 A2A 路径是同级发送的后备方案。当一个无关会话能够看到并向 ACP 目标发送消息时，它会保持启用，例如在宽泛的 `tools.sessions.visibility` 设置下。

    仅当请求者是其自己的父级拥有的一次性 ACP 子级的父级时，OpenClaw 才会跳过 A2A 后续操作。在这种情况下，在任务完成后运行 A2A 可以用子级的结果唤醒父级，将父级的回复转发回子级，并创建 parent/child 回显循环。已接受的`sessions_send`成绩报告目标录取与公告传送分开：`targetDisposition`是`queued`或`steered`，而`delivery.status`是`pending`或`skipped`。对于这种拥有子项的情况，`delivery.status="skipped"`，因为完成路径已经对结果负责。

  </Accordion>
  <Accordion id="resume-an-existing-session" title="恢复现有会话">
    使用 `resumeSessionId` 继续之前的 ACP 会话，而不是重新开始。agent 会通过 `session/load` 回放其对话历史，因此它会带着之前完整的上下文继续。

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    常见用例：

    - 将一个 Codex 会话从你的笔记本电脑接手到手机上 - 让你的 agent 继续你离开的地方。
    - 继续你曾在 CLI 中交互式开始的编码会话，现在通过 agent 无头继续。
    - 接手因网关重启或空闲超时而中断的工作。

    注意：

    - `resumeSessionId`仅适用于`runtime: "acp"`；默认子代理运行时会忽略此 ACP-only 字段。
    - `streamTo`仅适用于`runtime: "acp"`；默认子代理运行时会忽略此 ACP-only 字段。
    - `resumeSessionId` 是主机本地的 ACP/harness 恢复 id，不是 OpenClaw 频道会话 key；OpenClaw 在派发前仍会检查 ACP spawn 策略和目标 agent 策略，而 ACP 后端或 harness 负责对该上游 id 的加载授权。
    - `resumeSessionId` 会恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然按常规应用到你正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
    - 目标 agent 必须支持 `session/load`（Codex 和 Claude Code 都支持）。
    - 如果找不到该会话 id，spawn 会以清晰错误失败 - 不会静默回退到新会话。

  </Accordion>
  <Accordion id="post-deploy-smoke-test" title="部署后冒烟测试">
    在网关部署后，请运行一次实时的端到端检查，而不要依赖单元测试：

    1. 验证目标主机上部署的网关版本和提交。
    2. 打开一个到在线 agent 的临时 ACPX bridge 会话。
    3. 让该 agent 调用 `sessions_spawn`，并设置 `runtime: "acp"`、`agentId: "codex"`、`mode: "run"`，任务为 `Reply with exactly LIVE-ACP-SPAWN-OK`。
    4. 验证 `accepted=yes`、真实的 `childSessionKey`，且没有 validator 错误。
    5. 清理临时 bridge 会话。

    保持门禁为 `mode: "run"`，并跳过 `streamTo: "parent"` - 线程绑定的 `mode: "session"` 和流转发路径是单独更丰富的集成测试。

  </Accordion>
</AccordionGroup>

## <a id="sandbox-compatibility"></a> 沙箱兼容性

ACP 会话当前运行在主机运行时中，**不**运行在 OpenClaw 沙箱内部。

<Warning>
**安全边界：**

- 外部harness可以根据自身的CLI权限和选择的`cwd`来read/write。
- OpenClaw 的沙箱策略**不会**包裹 ACP harness 执行。
- OpenClaw 仍然会强制执行 ACP 功能开关、允许的 agent、会话所有权、频道绑定和 Gateway 投递策略。
- 使用 `runtime: "subagent"` 进行沙箱强制 OpenClaw-native 工作。

</Warning>

当前限制：

- 如果请求者会话已沙箱化，则 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 的 ACP 生成都会被阻止。
- `sessions_spawn` 和 `runtime: "acp"` 不支持 `sandbox: "require"`。
