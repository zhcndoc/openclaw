---
summary: "使用 SKILL.md 构建和测试自定义工作区技能"
title: "创建技能"
read_when:
  - 你正在工作区中创建一个新的自定义技能
  - 你需要一个基于 SKILL.md 技能的快速入门工作流
---

技能教会代理如何以及何时使用工具。每个技能都是一个目录，
其中包含一个带有 YAML frontmatter 和 markdown 指令的 `SKILL.md` 文件。

有关技能如何加载和优先级排序，请参阅 [Skills](/tools/skills)。

## 创建你的第一个技能

<Steps>
  <Step title="创建技能目录">
    技能保存在你的工作区中。创建一个新文件夹：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="编写 SKILL.md">
    在该目录中创建 `SKILL.md`。frontmatter 定义元数据，
    markdown 正文包含给代理的指令。

    ```markdown
    ---
    name: hello-world
    description: 一个简单的技能，会说你好。
    ---

    # Hello World 技能

    当用户请求问候时，使用 `echo` 工具说
    “来自你的自定义技能的你好！”。
    ```

    技能 `name` 使用小写字母、数字和连字符的连字符命名法。保持文件夹名称和 frontmatter 中的 `name` 一致。

  </Step>

  <Step title="添加工具（可选）">
    你可以在 frontmatter 中定义自定义工具模式，或者指示代理
    使用现有的系统工具（如 `exec` 或 `browser`）。技能也可以
    与它们所文档化的工具一起随插件发布。

  </Step>

  <Step title="加载技能">
    开启一个新会话，让 OpenClaw 载入该技能：

    ```bash
    # 来自聊天
    /new

    # 或重启网关
    openclaw gateway restart
    ```

    验证技能是否已加载：

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="测试它">
    发送一条应该触发该技能的消息：

    ```bash
    openclaw agent --message "给我一个问候"
    ```

    或者直接与代理聊天并请求一个问候。

  </Step>
</Steps>

## 技能元数据参考

YAML frontmatter 支持以下字段：

| 字段                                | 必需 | 描述                                                   |
| ----------------------------------- | ---- | ------------------------------------------------------ |
| `name`                              | 是   | 使用小写字母、数字和连字符的唯一标识符                 |
| `description`                       | 是   | 显示给代理的一行描述                                    |
| `metadata.openclaw.os`              | 否   | 操作系统筛选器（`["darwin"]`、`["linux"]` 等）        |
| `metadata.openclaw.requires.bins`   | 否   | PATH 上必需的二进制文件                                 |
| `metadata.openclaw.requires.config` | 否   | 必需的配置键                                           |

## 最佳实践

- **保持简洁** — 指导模型要做什么，而不是如何成为一个 AI
- **安全第一** — 如果你的技能使用 `exec`，请确保提示不会允许来自不可信输入的任意命令注入
- **本地测试** — 在分享前使用 `openclaw agent --message "..."` 进行测试
- **使用 ClawHub** — 在 [ClawHub](https://clawhub.ai) 浏览并贡献技能

## 技能所在位置

| 位置                           | 优先级 | 范围                 |
| ------------------------------ | ------ | -------------------- |
| `\<workspace\>/skills/`        | 最高   | 每个代理              |
| `\<workspace\>/.agents/skills/` | 高     | 每个工作区代理        |
| `~/.agents/skills/`             | 中     | 共享代理配置文件      |
| `~/.openclaw/skills/`           | 中     | 共享（所有代理）      |
| Bundled (shipped with OpenClaw) | 低     | 全局                 |
| `skills.load.extraDirs`         | 最低   | 自定义共享文件夹      |

## 相关内容

- [Skills reference](/tools/skills) — 加载、优先级和门控规则
- [Skills config](/tools/skills-config) — `skills.*` 配置模式
- [ClawHub](/tools/clawhub) — 公共技能注册表
- [Building Plugins](/plugins/building-plugins) — 插件可以随附技能
