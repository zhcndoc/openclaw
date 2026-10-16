---
summary: "共享操作员管理的指令，无需重写代理工作区文件"
read_when:
  - "维护选定代理的共享指令"
  - "配置代理指导插件"
title: "代理指导"
---

# <a id="agent-guidance"></a> 代理指导

座席指导在选定的座席之间共享说明文件。 OpenClaw 将其文本直接添加到发送到模型的提示中，在其正常指令之前或之后。该插件不会编辑 `AGENTS.md`、`SOUL.md` 或其他工作区文件。每个代理都有自己的指令、个性和记忆。

## <a id="when-to-use-it"></a> 何时使用它

| 你需要什么                                                    | 用途                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 一名智能体的说明                                       | 该代理的工作空间 `AGENTS.md`                                        |
| 工作区中其他已识别的上下文文件           | [bootstrap-extra-files 钩子](/automation/hooks#bootstrap-extra-files) |
| 为多个代理单独维护的一组指令 | 代理指导                                                            |
| 依赖于自定义运行时逻辑的指令                 | 使用 [prompt hooks](/plugins/hooks/prompt-and-session) 的插件          |

如果没有此插件，您可以将共享指令复制到每个代理的工作区文件中并保持副本同步，或者使用现有的 `before_prompt_build` 挂钩编写插件。 Agent Guidance 打包了共享文件方法，因此您无需编写代码即可对其进行配置。它没有添加新的插件 SDK 挂钩。

## <a id="example%3A-two-agents%2C-one-shared-file"></a><a id="example-two-agents-one-shared-file"></a> 示例：两个代理，一个共享文件

假设 `main` 回答日常问题，而 `research` 深入研究主题。两者都应该引用来源，但每个人都应该保持自己的工作风格。

|                      | 前                                                          | 有代理指导                              |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| `main` 工作区     | 它自己的说明加上引文指南的副本       | 它自己的指令                             |
| `research` 工作区 | 它自己的说明加上引文指南的另一份副本 | 它自己的指令                             |
| 共享指导      | 当指南发生变化时更新两个副本                    | 编辑一个`instructions.md`并重新加载插件 |

下面的配置将相同的共享文本添加到两个代理的提示中。未在 `agents` 中列出的代理不会收到任何信息。现有工作区文件保持不变；迁移时自行删除任何旧的重复指南。

## <a id="configure"></a> 配置

该插件默认处于禁用状态。在代理可写工作区之外创建一个操作员控制的目录，使用文件系统权限保护其文件和祖先目录，然后将一个条目添加到您的配置中：

```json
{
  "plugins": {
    "entries": {
      "agent-guidance": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true,
          "allowPromptInjection": true
        },
        "config": {
          "directory": "/srv/agent-guidance",
          "agents": ["main", "research"],
          "append": ["instructions.md"]
        }
      }
    }
  }
}
```

如果您使用 `plugins.allow`，还应将 `agent-guidance` 包含在该列表中。在 Windows 上，使用绝对 Windows 目录。本机 `before_prompt_build` 挂钩需要上述两种权限，尽管此插件会忽略事件内容。

示例 `instructions.md`：

```text
Cite sources when doing research.
Distinguish observations from assumptions.
```

`agents` 包含准确、区分大小写的代理 ID，而不是发件人身份。使用您现有的代理 ID；此配置不会创建代理。未选择的代理和没有代理 ID 的挂钩不会收到任何贡献。指令被发送到配置的模型：永远不要在其中放入秘密。

## <a id="files-and-placement"></a> 文件和放置

- `directory`：必需的绝对路径。没有环境扩展或工作区默认值。
- `agents`：1 到 64 个不同的显式代理 ID。
- `prepend`：通过 `prependSystemContext` 放置在正常系统提示符之前的有序相对文件名。
- `append`：通过`appendSystemContext`放置在正常系统提示符之后的有序相对文件名。

放置控制文本顺序，而不是工具权限或保证的指令优先级。除非您需要前缀，否则请像示例中那样使用 `append`。

在两个位置配置 1 到 8 个文件。每个必须是非空 UTF-8 常规文件，最多 16 个 KiB；合并贡献仅限于 64 KiB，包括每个布局中文件之间的两个换行符。过大的内容会被拒绝，而不是被截断。该模型的上下文限制仍然适用。

文件名使用正斜杠、字母、数字、点、下划线和连字符。遍历、重复名称、symbolic/hard 链接、链接祖先目录、非常规文件、格式​​错误的 UTF-8 和 NUL 均被拒绝。这些检查不会取代操作员管理的权限，也不是文件系统沙箱。

## <a id="update-and-disable"></a> 更新并禁用

文件在插件注册时读取一次。单独编辑文件不会更改活动快照。编辑完成后，使用native reload或者重启：

```sh
openclaw plugins reload agent-guidance
```

可以更新单独安装的指令文件，而无需重建插件或映像。烘焙到不可变图像中的指令仍然需要新图像。没有文件观察器、每轮读取或远程配置获取。

使用 `openclaw plugins disable agent-guidance` 禁用未来贡献；使用 `openclaw plugins enable agent-guidance` 重新启用。之前提交的提示无法撤回。现有对话可以在重新加载后看到新指令：此插件不会将指令版本固定到会话。当需要稳定的会话提示时，请在更新之前耗尽现有会话。

## <a id="failure-behavior"></a> 故障行为

文件加载错误导致整个贡献无法注册。诊断功能可识别文件的配置位置，而无需打印路径或内容。 OpenClaw 可以在没有失败插件的情况下继续：指导是 **，不是失败关闭的策略门**、工具授权或模型服从的保证。

重新加载失败并不能保证之前的指令保持活动状态。本机恢复恢复插件 code/configuration，而不是外部指令字节。将已知良好的副本置于操作员控制之下。错误编辑后，恢复有效文件，重新加载并验证插件，然后再恢复相关工作。

请参阅 [ 管理插件](/plugins/manage-plugins) 和 [ 插件架构](/plugins/architecture) 了解本机权限和生命周期。
