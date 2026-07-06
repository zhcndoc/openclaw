---
title: "创建技能"
sidebarTitle: "创建技能"
summary: "为你的 OpenClaw agents 构建、测试并发布自定义的 SKILL.md 工作区技能。"
read_when:
  - 你正在创建一个新的自定义技能
  - 你需要一个基于 SKILL.md 技能的快速入门工作流
  - 你想使用 Skill Workshop 提议一个供 agent 审核的技能
---

技能会教会 agent 何时以及如何使用工具。每个技能都是一个目录，包含一个带有 YAML frontmatter 和 markdown 说明的 `SKILL.md` 文件。OpenClaw 会从多个根目录按定义的 [优先级顺序](/tools/skills#loading-order) 加载技能。

## 创建你的第一个技能

<Steps>
  <Step title="创建技能目录">
    技能位于你的工作区 `skills/` 文件夹中：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    你可以为了组织管理把技能分到子文件夹中——技能仍然由 `SKILL.md` frontmatter 中的内容命名，而不是由文件夹路径命名：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    # 技能名称仍然是 "hello-world"，调用方式为 /hello-world
    ```

  </Step>

  <Step title="编写 SKILL.md">
    frontmatter 定义元数据；正文为 agent 提供指令。

    ```markdown
    ---
    name: hello-world
    description: 一个会打印问候语的简单技能。
    ---

    # Hello World

    当用户请求问候语时，使用 `exec` 工具运行：

    ```bash
    echo "来自你的自定义技能的问候！"
    ```
    ```

    命名规则：
    - `name` 只能使用小写字母、数字和连字符。
    - 保持目录名与 frontmatter 中的 `name` 一致。
    - `description` 会展示给 agent，并用于斜杠命令发现——请保持为单行且少于 160 个字符。

  </Step>

  <Step title="验证技能已加载">
    ```bash
    openclaw skills list
    ```

    默认情况下，OpenClaw 会监视 skills 根目录下的 `SKILL.md` 文件。如果监视器被禁用，或者你正在继续一个已有会话，请新建一个会话，以便 agent 接收到刷新后的列表：

    ```bash
    # 来自聊天 — 归档当前会话并重新开始
    /new

    # 或重启网关
    openclaw gateway restart
    ```

  </Step>

  <Step title="测试它">
    ```bash
    openclaw agent --message "给我一个问候"
    ```

    或者打开聊天并直接向 agent 提问。使用 `/skill hello-world` 可以按名称显式调用它。

  </Step>
</Steps>

## SKILL.md 参考

### 必需字段

| 字段         | 描述                                                     |
| ------------- | --------------------------------------------------------------- |
| `name`        | 使用小写字母、数字和连字符的唯一 slug        |
| `description` | 显示给 agent 和发现输出的一行描述 |

### 可选 frontmatter 键

| 字段                      | 默认值 | 描述                                                                      |
| -------------------------- | ------- | -------------------------------------------------------------------------------- |
| `user-invocable`           | `true`  | 将该技能暴露为用户斜杠命令                                         |
| `disable-model-invocation` | `false` | 将该技能排除在 agent 的系统提示之外（仍可通过 `/skill` 运行）        |
| `command-dispatch`         | —       | 设置为 `tool` 可将斜杠命令直接路由到工具，绕过模型 |
| `command-tool`             | —       | 当设置了 `command-dispatch: tool` 时要调用的工具名称                         |
| `command-arg-mode`         | `raw`   | 对于工具分发，将原始参数字符串转发给工具                      |
| `homepage`                 | —       | 在 macOS Skills UI 中显示为“网站”的 URL                                    |

关于门控字段（`requires.bins`、`requires.env` 等），请参见
[Skills — 门控](/tools/skills#gating)。

### 使用 `{baseDir}`

在技能目录内引用文件时，无需硬编码路径——agent 会将 `{baseDir}` 解析为技能自身目录：

```markdown
在 `{baseDir}/scripts/run.sh` 运行 helper 脚本。
```

## 添加条件激活

对你的技能进行门控，使其只在依赖可用时加载：

```markdown
---
name: gemini-search
description: 使用 Gemini CLI 进行搜索。
metadata: { "openclaw": { "requires": { "bins": ["gemini"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<AccordionGroup>
  <Accordion title="门控选项">
    | 键 | 描述 |
    | --- | --- |
    | `requires.bins` | 所有二进制文件都必须存在于 `PATH` 中 |
    | `requires.anyBins` | 至少一个二进制文件必须存在于 `PATH` 中 |
    | `requires.env` | 每个环境变量都必须存在于进程或配置中 |
    | `requires.config` | 每个 `openclaw.json` 路径都必须为真值 |
    | `os` | 平台过滤器：`["darwin"]`、`["linux"]`、`["win32"]` |
    | `always` | 设为 `true` 可跳过所有门控并始终包含该技能 |

    完整参考：[Skills — 门控](/tools/skills#gating)。

  </Accordion>
  <Accordion title="环境和 API 密钥">
    在 `openclaw.json` 中为某个技能条目绑定 API 密钥：

    ```json5
    {
      skills: {
        entries: {
          "gemini-search": {
            enabled: true,
            apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
          },
        },
      },
    }
    ```

    该密钥只会在该 agent 回合期间注入到宿主进程中。
    它不会进入沙箱——参见
    [沙箱化环境变量](/tools/skills-config#sandboxed-skills-and-env-vars)。

  </Accordion>
</AccordionGroup>

## 通过 Skill Workshop 提议

对于由 agent 起草的技能，或者当你希望在技能上线前进行运营审核时，请使用 [Skill Workshop](/tools/skill-workshop) 提案，而不是直接编写 `SKILL.md`。

```bash
# 提议一个全新的技能
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "一个会打印问候语的简单技能。" \
  --proposal ./PROPOSAL.md

# 提议更新一个已有技能
openclaw skills workshop propose-update hello-world \
  --proposal ./PROPOSAL.md \
  --description "更新后的问候技能"
```

如果提案包含支持文件，请使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "一个会打印问候语的简单技能。" \
  --proposal-dir ./hello-world-proposal/
```

该目录必须在其根目录下包含 `PROPOSAL.md`。支持文件应放在
`assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。

审核之后：

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

完整提案流程请参见 [Skill Workshop](/tools/skill-workshop)。

## 发布到 ClawHub

<Steps>
  <Step title="确保你的 SKILL.md 完整">
    确保已设置 `name`、`description` 以及任何 `metadata.openclaw` 门控字段。如果你有项目页面，也可以添加 `homepage` URL。
  </Step>
  <Step title="安装独立的 ClawHub CLI 并登录">
    ```bash
    npm i -g clawhub
    clawhub login
    ```
  </Step>
  <Step title="发布">
    ```bash
    clawhub skill publish ./path/to/hello-world
    ```

    添加 `--version <version>` 或 `--owner <owner>` 以覆盖推断出的
    版本，或以特定所有者身份发布。请参阅
    [ClawHub — 发布](/clawhub/publishing) 和
    [ClawHub CLI](/clawhub/cli) 以了解完整流程、所有者作用域以及其他
    维护命令（`clawhub sync`、`clawhub skill rename`、...）。

  </Step>
</Steps>

## 最佳实践

<Tip>
  - **保持简洁** —— 指示模型“做什么”，而不是如何表现得像一个 AI。
  - **安全第一** —— 如果你的技能使用 `exec`，请确保提示词不会允许来自不受信任输入的任意命令注入。
  - **本地测试** —— 分享前使用 `openclaw agent --message "..."` 进行测试。
  - **使用 ClawHub** —— 在从头构建之前，先在 [clawhub.ai](https://clawhub.ai) 浏览社区技能。
</Tip>

## 相关内容

<CardGroup cols={2}>
  <Card title="技能参考" href="/tools/skills" icon="puzzle-piece">
    加载顺序、门控、允许列表和 SKILL.md 格式。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    供 agent 起草技能使用的提案队列。
  </Card>
  <Card title="技能配置" href="/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置 schema。
  </Card>
  <Card title="ClawHub" href="/clawhub" icon="cloud">
    浏览并在公共注册表中发布技能。
  </Card>
  <Card title="构建插件" href="/plugins/building-plugins" icon="plug">
    插件可以将技能与它们所文档化的工具一起发布。
  </Card>
</CardGroup>
