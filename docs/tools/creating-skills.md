---
doc-schema-version: 1
title: "创建技能"
sidebarTitle: "创建技能"
summary: "在共享网关上构建、测试和发布自定义 SKILL.md 工作区技能或个人技能。"
read_when:
  - "你正在创建一个新的自定义技能"
  - "您需要一个快速入门工作流程来掌握 SKILL.md-based 技能"
  - "您希望客服人员通过技能工坊为您保存或更新技能"
---

技能会教会 agent 何时以及如何使用工具。每个技能都是一个目录，包含一个带有 YAML frontmatter 和 markdown 说明的 `SKILL.md` 文件。OpenClaw 会从多个根目录按定义的 [优先级顺序](/tools/skills#loading-order) 加载技能。

## <a id="create-your-first-skill"></a> 创建你的第一个技能

<Steps>
  <Step id="create-the-skill-directory" title="创建技能目录">
    技能位于你的工作区 `skills/` 文件夹中：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    你可以为了组织管理把技能分到子文件夹中——技能仍然由 `SKILL.md` frontmatter 中的内容命名，而不是由文件夹路径命名：

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    # skill name is still "hello-world", invoked as /hello-world
    ```

  </Step>

  <Step id="write-skill-md" title="写入SKILL.md">
    frontmatter 定义元数据；正文为 agent 提供指令。

    ````markdown
    ---
    name: hello-world
    description: A simple skill that prints a greeting.
    ---

    # Hello World

    When the user asks for a greeting, use the `exec` tool to run:

    ```bash
    echo "Hello from your custom skill!"
    ```
    ````

    命名规则：
    - 使用小写字母、数字和连字符表示 `name`。
    - 保持目录名和frontmatter `name`对齐。
    - `description` 向代理显示并在斜杠命令发现中 —​​ 使其保持一行且少于 160 个字符。

  </Step>

  <Step id="verify-the-skill-loaded" title="验证加载的技能">
    ```bash
    openclaw skills list
    ```

    默认情况下，OpenClaw 会监视 skills 根目录下的 `SKILL.md` 文件。如果监视器被禁用，或者你正在继续一个已有会话，请新建一个会话，以便 agent 接收到刷新后的列表：

    ```bash
    # From chat — archive current session and start fresh
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step id="test-it" title="测试一下">
    ```bash
    openclaw agent --message "give me a greeting"
    ```

    或者打开聊天并直接向 agent 提问。使用 `/skill hello-world` 可以按名称显式调用它。

  </Step>
</Steps>

## <a id="create-a-personal-skill-on-a-shared-gateway"></a> 在共享网关上创建个人技能

对于应遵循您登录的个人资料而不是属于代理工作区的技能，请使用 **插件 → 技能 → 我的技能**。在那里创建或导入 `SKILL.md` 捆绑包，然后查看保存的修订和激活结果。您不需要主机 shell 访问权限或编辑共享网关设置的权限。

您还可以要求智能体创造或提高个人技能。其`skill_workshop`工具使用了Gateway的授权库服务；它不直接写入托管修订目录。结果命名已发布的修订版本并解释会话何时可以使用它。明确要求在当前会话中使用新修订版或与团队共享。

单管理员默认设置仍然是上面的工作区工作流程。同一操作员的额外通道身份不会将个人安装转变为团队安装。有关所有权、共享、存储和会话行为，请参阅 [ 个人技能和修订](/tools/skills#personal-skills-on-a-shared-gateway)。

## <a id="skill.md-reference"></a><a id="skill-md-reference"></a> SKILL.md 参考

### <a id="required-fields"></a> 必需字段

| 字段         | 描述                                                     |
| ------------- | --------------------------------------------------------------- |
| `name`        | 使用小写字母、数字和连字符的唯一 slug        |
| `description` | 显示给智能体和发现输出的一行描述 |

### <a id="optional-frontmatter-keys"></a> 可选前面板按键

| 字段                      | 默认值 | 描述                                                                      |
| -------------------------- | ------- | -------------------------------------------------------------------------------- |
| `user-invocable`           | `true`  | 将该技能暴露为用户斜杠命令                                         |
| `disable-model-invocation` | `false` | 将该技能排除在智能体的系统提示之外（仍可通过 `/skill` 运行）        |
| `command-dispatch`         | —       | 设置为 `tool` 可将斜杠命令直接路由到工具，绕过模型 |
| `command-tool`             | —       | 当设置了 `command-dispatch: tool` 时要调用的工具名称                         |
| `command-arg-mode`         | `raw`   | 对于工具分发，将原始参数字符串转发给工具                      |
| `homepage`                 | —       | 在 macOS 技能 UI 中显示为“网站”的 URL                                    |

对于门控字段（`requires.bins`、`requires.env` 等），请参阅 [Skills — Gating](/tools/skills#gating)。

### <a id="using-%7Bbasedir%7D"></a> 使用 `{baseDir}`

在技能目录内引用文件时，无需硬编码路径——智能体会将 `{baseDir}` 解析为技能自身目录：

```markdown
Run the helper script at `{baseDir}/scripts/run.sh`.
```

## <a id="adding-conditional-activation"></a> 添加条件激活

对你的技能进行门控，使其只在依赖可用时加载：

```markdown
---
name: gemini-search
description: Search using Gemini CLI.
metadata: { "openclaw": { "requires": { "bins": ["gemini"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<AccordionGroup>
  <Accordion id="gating-options" title="门控选项">
    | 键 | 描述 |
    | --- | --- |
    | `requires.bins` | 所有二进制文件都必须存在于 `PATH` 中 |
    | `requires.anyBins` | 至少一个二进制文件必须存在于 `PATH` 中 |
    | `requires.env` | 每个环境变量都必须存在于进程或配置中 |
    | `requires.config` | 每个 `openclaw.json` 路径都必须为真值 |
    | `os` | 平台过滤器：`["darwin"]`（或`["macos"]`）、`["linux"]`、`["win32"]` |
    | `always` | 即使 `requires.*` 检查失败，也包含在兼容的 OS 上 |

    完整参考：[Skills — Gating](/tools/skills#gating)。

  </Accordion>
  <Accordion id="environment-and-api-keys" title="环境和 API 密钥">
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

    该密钥只会在该 agent 回合期间注入到宿主进程中。 它不会进入沙箱——参见 [沙箱化环境变量](/tools/skills-config#sandboxed-skills-and-env-vars)。

  </Accordion>
</AccordionGroup>

## <a id="learned-skills-(skill-workshop)"></a><a id="learned-skills-skill-workshop"></a> 学到的技能（技能工坊）

特工也通过[Skill Workshop](/tools/skill-workshop)编写自己的技能。这些学到的技能会立即应用并保留以前的版本，因此任何更改都可以撤消。从 CLI 检查和管理它们：

```bash
openclaw skills workshop list
openclaw skills workshop changes
openclaw skills workshop show hello-world
openclaw skills workshop archive hello-world --reason "Replaced by greeting"
openclaw skills workshop restore hello-world
```

有关每个选项，请参见 [`openclaw skills workshop`](/cli/skills#skill-workshop)。

## <a id="publishing-to-clawhub"></a> 发布到 ClawHub

所有者是 ClawHub 发布者句柄，例如 `@alice` 或 `@your-org`。您的帐户有个人所有者。组织所有者可以拥有具有 `owner`、`admin` 或 `publisher` 角色的成员；所有三个角色都可以发布。选择您的个人所有者或您拥有发布者访问权限的组织。

<Steps>
  <Step id="complete-your-skill-md" title="完成您的 SKILL.md">
    <a id="ensure-your-skillmd-is-complete" />
    确保已设置 `name`、`description` 以及任何 `metadata.openclaw` 门控字段。如果你有项目页面，也可以添加 `homepage` URL。
  </Step>
  <Step id="install-the-standalone-clawhub-cli-and-log-in" title="安装独立版 ClawHub CLI 并登录">
    ```bash
    npm i -g clawhub
    clawhub login
    ```
  </Step>
  <Step id="publish" title="发布">
    ```bash
    clawhub skill publish ./path/to/hello-world
    ```

    添加 `--version <version>` 或 `--owner <owner>` 以覆盖推断的版本或在特定所有者下发布。请参阅 [ClawHub — Publishing](/clawhub/publishing) 和 [ClawHub CLI](/clawhub/cli) 了解完整流程、所有者范围和其他维护命令（`clawhub sync`、`clawhub skill rename`，...）。

  </Step>
</Steps>

## <a id="best-practices"></a> 最佳实践

<Tip>
  - **简洁**— 指示模型*什么*去做，而不是如何成为一个AI。
  - **安全第一** - 如果您的技能使用`exec`，请编写不允许来自不受信任的输入的任意命令注入的提示。
  - **本地测试** —— 分享前使用 `openclaw agent --message "..."` 进行测试。
  - **使用 ClawHub** —— 在从头构建之前，先在 [clawhub.ai](https://clawhub.ai) 浏览社区技能。
</Tip>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="技能参考" href="/tools/skills" icon="puzzle-piece">
    加载顺序、门控、允许列表和 SKILL.md 格式。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    您的代理会自行保存和更新技能，并可撤消。
  </Card>
  <Card title="技能配置" href="/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置模式。
  </Card>
  <Card title="ClawHub" href="/clawhub" icon="cloud">
    在公共注册表上浏览和发布技能。
  </Card>
  <Card title="构建插件" href="/plugins/building-plugins" icon="plug">
    插件可以将技能与它们记录的工具一起传递。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    如何调用和门控技能注册的命令。
  </Card>
</CardGroup>
