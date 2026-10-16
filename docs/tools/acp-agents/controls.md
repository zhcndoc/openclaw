---
summary: "会话目标解析以及完整的 /acp 命令和运行时选项参考"
title: "ACP代理控制"
read_when:
  - "在聊天中操作 /acp 命令"
  - "您需要 /acp 命令参考"
  - "您需要后端的运行时选项映射"
---

## <a id="session-target-resolution"></a> 会话目标解析

大多数 `/acp` 操作都接受一个可选的会话目标（`session-key`、 `session-id` 或 `session-label`）。

**解析顺序：**

1. 显式目标参数（或 `--session` 对于 `/acp steer`）
   - 先尝试 key
   - 然后UUID-形状的会话id
   - 最后尝试 label
2. 当前线程绑定（如果此 conversation/thread 绑定到 ACP 会话）。
3. 当前请求者会话回退。

当前会话绑定和线程绑定都会参与步骤 2。

如果无法解析目标，OpenClaw 会返回明确的错误 （`Unable to resolve session target: ...`）。

### <a id="session-owner-and-harness"></a> 会话所有者和利用

拥有会话的 OpenClaw 代理与 ACP 选择的外部harness是分开的。例如，`work` 拥有的会话可以运行 `claude` 工具。所有者感知管理器调用携带 `agentId`； `agent` 保留harness名称。配置的绑定独立使用其 OpenClaw 代理所有者及其配置的 ACP harness。 `sessions_spawn` 使用请求者作为原始harness的所有者，并将配置的代理作为 ACP 别名的所有者。 `/acp spawn` 还在请求的 OpenClaw 代理下保留原始harness会话；本身就是配置代理的harness会保留其配置的命名空间。会话密钥、参与者历史记录和记录使用该所有者，而 ACP 元数据记录所选harness。现有的harness命名空间会话和绑定保留其原始密钥和存储；绑定轮次使用已检查的通道所有者进行网关调度。生成不会迁移现有会话。

当所有权明确时，诸如 `global` 之类的裸密钥需要明确的所有者。 ACP 保持`shared-project` 等任意逻辑键不变； ACPX 按所有者确定后端资源名称的范围。即使代理限定的主别名解析为 `global`，它也会保留其所有者。冲突的 owner/key 对明显失败。无法隔离裸会话的后端必须先升级，然后这些会话才能运行。

## <a id="acp-controls"></a> ACP 控制

| 命令              | 它的作用                                              | 示例                                                       |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选择当前绑定或线程绑定。 | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话正在进行中的回合。                 | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 将指令排队以在飞行中转弯后运行。     | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程目标绑定。                  | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、能力。 | `/acp status`                                                 |
| `/acp set-mode`      | 为目标会话设置运行模式。                      | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置项写入。                      | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                   | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置审批策略配置文件。                              | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                            | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                               | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                  | `/acp reset-options`                                          |
| `/acp sessions`      | 从存储中列出最近的 ACP 会话。                      | `/acp sessions`                                               |
| `/acp doctor`        | 显示后端健康状态、能力和可执行修复。           | `/acp doctor`                                                 |
| `/acp install`       | 打印安装和启用步骤。                       | `/acp install`                                                |

运行时控制（`spawn`、`cancel`、`steer`、`close`、`status`、`set-mode`、 `set`、`cwd`、`permissions`、`timeout`、`model` 和 `reset-options`）需要来自外部通道的所有者身份，以及来自内部 Gateway 客户端的 `operator.admin`。 经授权但非所有者的发送者仍可使用 `sessions`、`doctor`、`install` 和 `help`。 对于非所有者发送者，`/acp sessions` 只列出当前绑定会话或请求者会话； 所有者身份和 `operator.admin` 客户端可看到所有最近的会话。

`/acp steer` 对后续进行排队；它无法将输入添加到正在运行的 ACP 回合。该指令等待该回合完成，然后在相同的会话和上下文中运行。后续完成后命令回复。要重定向正在进行的工作，请先运行 `/acp cancel`，然后发送新指令。

`/acp status` 会显示生效的运行时选项，以及运行时级别和后端级别的会话标识。如果后端缺少某项能力，系统会清晰地显示不支持控制的错误。 接受目标令牌（`session-key`、`session-id` 或 `session-label`）的命令会通过网关会话发现来解析它们，包括每个代理自定义的 `session.store` 根目录。 `/acp sessions` 不接受目标令牌。

### <a id="runtime-options-mapping"></a> 运行时选项映射

`/acp` 提供便捷命令和通用设置器。等价操作如下：

| 命令                      | 映射到                             | 笔记                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/acp model <id>`            | 运行时配置键 `model`          | 对于 Codex ACP，OpenClaw 会将 `openai/<model>` 规范化为适配器模型 id，并将诸如 `openai/gpt-5.4/high` 之类带斜杠的推理后缀映射到 `reasoning_effort`。                                         |
| `/acp set thinking <level>`  | OpenClaw 选项 `thinking`          | OpenClaw 会在后端公开对应项时发送其等价配置，优先使用 `thinking`，然后是 `effort`、`reasoning_effort` 或 `thought_level`。对于 Codex ACP，适配器会将值映射到 `reasoning_effort`。 |
| `/acp permissions <profile>` | OpenClaw 选项 `permissionProfile` | OpenClaw 会在后端公开对应项时发送其等价配置，例如 `approval_policy`、`permission_profile`、`permissions` 或 `permission_mode`。                                                       |
| `/acp timeout <seconds>`     | OpenClaw 选项 `timeoutSeconds`    | OpenClaw 会在后端公开对应项时发送其等价配置，例如 `timeout` 或 `timeout_seconds`。                                                                                                     |
| `/acp cwd <path>`            | 运行时工作目录覆盖                | 应用于下一个运行时操作，该操作在替换之前关闭前一个句柄。                                                                                                               |
| `/acp set <key> <value>`     | 通用                             | `key=cwd` 使用 cwd 覆盖路径。                                                                                                                                                                      |
| `/acp reset-options`         | 清除所有运行时覆盖        | 关闭保留的运行时而不启动新的后端。                                                                                                                                                  |

当后端返回其接受的控制时，OpenClaw 使已选择的思维级别与该响应保持同步。模型切换可能会降低水平或消除思维支撑；随后的回合和重新连接使用接受的选择，而不是重播旧的级别。后端默认值不会成为新的会话覆盖，并且模型引用保留其 OpenClaw 提供程序前缀。

使用 Cursor，模型请求可以使用精确的广告 ID、具有一个广告变体的选择器或 OpenClaw `provider/model` 对两者的引用。未知或不明确的请求明显失败。包含 `/` 的确切广告 ID 优先于将其解释为提供者合格的参考。

模型覆盖在提示提交之前（包括重新连接之后）进行验证。在新会话初始化期间删除的不受支持的继承默认值不会保存为覆盖。

当旧的工作目录或模型覆盖阻止后端启动时，`/acp reset-options` 也可以在重新启动后工作。如果关闭保留的运行时失败，选项仍可用于重试。
