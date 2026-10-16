---
title: "技能配置"
sidebarTitle: "技能配置"
summary: "skills.* 配置模式、代理白名单、工作坊设置以及沙箱环境变量处理的完整参考。"
read_when:
  - "配置技能加载、安装或门控行为"
  - "设置按代理划分的技能可见性"
  - "调整技能工坊学习模式或规模限制"
---

大多数技能配置位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。特定于代理的可见性位于 `agents.defaults.skills` 和 `agents.entries.*.skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/path/to/agent-scripts/skills"],
      allowSymlinkTargets: ["~/path/to/skills"],
      watch: true,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: { mode: "auto" },
      maxSkillBytes: 40000,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<Note>
  对于内置图像生成，请使用 `agents.defaults.mediaModels.image` 加上核心的 `image_generate` 工具，而不是 `skills.entries`。技能条目仅用于自定义或第三方技能工作流。
</Note>

## <a id="loading-(skills.load)"></a><a id="loading-skills-load"></a> 加载（`skills.load`）

<ParamField path="skills.load.extraDirs" type="string[]">
  要扫描的额外 skill 目录，优先级最低（低于内置和插件 skill）。路径会展开，并支持 `~`。
</ParamField>

<ParamField path="skills.load.allowSymlinkTargets" type="string[]">
  即使符号链接位于配置的根目录之外，符号链接的技能文件夹也可能解析为受信任的真实目标目录。将此用于有意的同级存储库布局，例如 `<workspace>/skills/manager -> ~/path/to/skills`。保持这个列表的范围窄——不要指向像 `~` 或整个项目目录这样广泛的根。
</ParamField>

<ParamField path="skills.load.watch" type="boolean" default="true">
  启用被动自动技能发现。一名后台工作人员大约每分钟检查一次本地技能根，包括分组根下的嵌套文件。设置为 `false` 以禁用被动重新扫描。显式 OpenClaw 技能更改、相关配置更改和网关启动仍请求立即重新扫描。现有会话在下一个代理轮次时使用更改的快照。
</ParamField>

## <a id="install-(skills.install)"></a><a id="install-skills-install"></a> 安装（`skills.install`）

<ParamField path="skills.install.preferBrew" type="boolean" default="true">
  在 `brew` 可用时优先使用 Homebrew 安装器。
</ParamField>

<ParamField path="skills.install.nodeManager" type='"npm" | "pnpm" | "yarn" | "bun"' default='"npm"'>
  Node 技能安装的软件包管理器首选项。这仅影响技能安装。 Node 仍然是主要和推荐的 OpenClaw 运行时；支持 Bun 1.4.3+ 和 WAL- 重置安全 `node:sqlite` 作为显式运行时选择加入。 `openclaw setup --node-manager` 和 `openclaw onboard --node-manager` 接受 `npm`、`pnpm` 或 `bun`；直接在配置中设置 `"yarn"` 以进行 Yarn 支持的技能安装。除非您传递 `--node-manager`，否则安装程序将保留此首选项；新配置默认为 `npm`。
</ParamField>

<ParamField path="skills.install.allowUploadedArchives" type="boolean" default="false">
  允许受信任的 `operator.admin` Gateway 客户端安装通过 `skills.upload.*` 暂存的私有 zip 压缩包。正常的 ClawHub 安装不需要此设置。
</ParamField>

## <a id="operator-install-policy-(security.installpolicy)"></a><a id="operator-install-policy-security-installpolicy"></a> 操作员安装策略（`security.installPolicy`）

当操作员需要受信任的本地命令来批准或阻止具有特定于主机的策略的技能和插件安装时，请使用 `security.installPolicy`。该策略在 OpenClaw 暂存源材料之后、安装或更新继续之前运行。它适用于 ClawHub 技能、上传的技能、Git/local 技能、技能依赖项安装程序和插件 install/update 源。

```json5
{
  security: {
    installPolicy: {
      enabled: true,
      // Omit targets to cover every supported target.
      targets: ["skill", "plugin"],
      exec: {
        source: "exec",
        command: "/usr/local/bin/openclaw-install-policy",
        args: ["--json"],
        timeoutMs: 10000,
        noOutputTimeoutMs: 10000,
        maxOutputBytes: 1048576,
        passEnv: ["OPENCLAW_STATE_DIR", "PATH"],
        env: { POLICY_MODE: "strict" },
        trustedDirs: ["/usr/local/bin"],
      },
    },
  },
}
```

<ParamField path="security.installPolicy.enabled" type="boolean" default="false">
  启用运营商拥有的安装策略。如果在没有有效的 `exec` 命令的情况下启用，安装将被阻止。
</ParamField>

<ParamField path="security.installPolicy.targets" type='("skill" | "plugin")[]'>
  可选的目标过滤器。省略时，策略将应用于每个受支持的目标，因此新的安装不会意外地“失败开放”。
</ParamField>

<ParamField path="security.installPolicy.exec.command" type="string">
  受信任策略可执行文件的绝对路径。OpenClaw 会在无 shell 的情况下运行它，并在使用前验证该路径。
</ParamField>

<ParamField path="security.installPolicy.exec.args" type="string[]">
  在 `command` 之后传递的静态参数。
</ParamField>

<ParamField path="security.installPolicy.exec.timeoutMs" type="number" default="10000">
  单次策略决策的最大墙钟运行时间。
</ParamField>

<ParamField path="security.installPolicy.exec.noOutputTimeoutMs" type="number" default="timeoutMs">
  策略阻止安装之前没有 stdout 或 stderr 输出的最长时间。
</ParamField>

<ParamField path="security.installPolicy.exec.maxOutputBytes" type="number" default="1048576">
  策略进程可接受的 stdout 和 stderr 合计最大字节数。
</ParamField>

<ParamField path="security.installPolicy.exec.env" type="Record<string, string>">
  提供给策略进程的字面环境变量。
</ParamField>

<ParamField path="security.installPolicy.exec.passEnv" type="string[]">
  从 OpenClaw 进程复制到策略进程的环境变量名称。仅传递命名的变量。
</ParamField>

<ParamField path="security.installPolicy.exec.trustedDirs" type="string[]">
  可选的目录白名单，策略可执行文件可以位于其中。
</ParamField>

策略命令和解释器脚本参数必须是具有受信任所有权、受限权限且其父目录可验证的直接常规文件。符号链接和不安全路径将被拒绝。

该策略在标准输入上接收一个 JSON 对象，其中包含 `protocolVersion: 1`、`openclawVersion`、`targetType`、`targetName`、`sourcePath`、`sourcePathKind`，可选结构化 `source`，结构化`origin` 和 `request`。它必须使用 `allow`、`warn` 或 `block` 决策在 stdout 上写入一个 JSON 对象。 `warn` 和 `block` 需要非空 `reason`；每个决策都可能包含一个 `findings` 数组。每个结果都需要非空字符串 `ruleId` 和 `message` 字段以及 `info`、`warn` 或 `critical` 的 `severity`。可选的 `file` 和 `evidence` 值必须是非空字符串；有限数值 `line` 向下舍入并限制在从 1 到 `Number.MAX_SAFE_INTEGER` 的安全整数范围内。格式错误的查找条目将被忽略，无效的可选字段将被忽略。非数组 `findings` 值被视为不存在。面向操作员的原因和查找文本限制为 1,000 个字符。 OpenClaw 最多保留 100 个标准化结果以供显示。仅具有超过 100 个有效结果的 `warn` 响应会阻止安装且无法得到确认； `allow` 和 `block` 保留前 100 个。提交之前会出现警告停止安装。 `warn` 审查的完整通知（包括其标题、目标、经过清理的原因和调查结果以及恢复指南）超出了 4,000 个字符的聚合显示限制，在不提供部分审查的情况下阻止安装。超预算的 `block` 仍然处于有限否认状态，而 `allow` 的超预算结果则总结在有限的诊断输出中。交互式 CLI 插件和技能命令要求操作员使用与可疑 ClawHub 版本相同的 `install anyway` 或 `update anyway` 副本键入目标名称，然后在继续之前再次运行策略。在审查该命令调用中的每个警告后，直接 CLI 上的拒绝和非交互式命令可以使用 `--acknowledge-install-policy-warning` 作为明确批准；每个批准的警告在继续之前都会重新评估。 Control UI可以审查和批准其插件安装请求的警告；该批准涵盖了调用中的每个警告，并且每个警告仍会被重新评估。其他网关支持的自动安装在没有操作员确认流程时仍会被阻止。使用等效的直接插件或技能命令来查看和批准警告（如果存在）。否则，更改 `security.installPolicy` 以针对已审核的请求返回 `allow`，然后重试受管流。 `--force` 不批准策略警告。 `block`、非零退出、超时、无效 JSON、非对象响应、协议版本或决策缺失或无效、或者 `warn`/`block` 缺失或空的原因始终会阻止安装。

OpenClaw 在正常网关启动期间不执行安装策略。当策略已启用但不可用时，安装和更新将被阻止。 `openclaw doctor`进行静态验证； `openclaw doctor --deep` 针对配置的命令执行综合安装检查。

批量更新会按目标分别应用策略：被阻止的技能或插件更新只会使该目标失败，而不会禁用策略，也不会在批处理中跳过后续目标。

输入示例：

```json
{
  "protocolVersion": 1,
  "openclawVersion": "2026.6.1",
  "targetType": "skill",
  "targetName": "weather",
  "sourcePath": "/var/folders/.../openclaw-skill-clawhub/root",
  "sourcePathKind": "directory",
  "source": {
    "kind": "clawhub",
    "authority": "openclaw",
    "mutable": false,
    "network": true
  },
  "origin": {
    "type": "clawhub",
    "registry": "https://clawhub.openclaw.ai",
    "slug": "weather",
    "version": "1.0.0"
  },
  "request": {
    "kind": "skill-install",
    "mode": "install",
    "requestedSpecifier": "clawhub:weather@1.0.0"
  },
  "skill": {
    "installId": "clawhub"
  }
}
```

最小策略命令：

```js
#!/usr/bin/env node

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const request = JSON.parse(input);
  if (request.targetType === "plugin" && request.source?.kind === "local-path") {
    process.stdout.write(
      JSON.stringify({
        protocolVersion: 1,
        decision: "block",
        reason: "local plugin paths are not approved on this host",
      }),
    );
    return;
  }
  process.stdout.write(JSON.stringify({ protocolVersion: 1, decision: "allow" }));
});
```

## <a id="bundled-skill-allowlist"></a> 捆绑技能白名单

<ParamField path="skills.allowBundled" type="string[]">
  仅适用于 **捆绑** 技能的可选允许列表。设置后，只有列表中的捆绑技能才具备资格。托管、代理级别和工作区技能不受影响。
</ParamField>

## <a id="per-skill-entries-(skills.entries)"></a><a id="per-skill-entries-skills-entries"></a> 按技能的条目（`skills.entries`）

`entries` 下的键默认与技能的 `name` 匹配。如果某个技能定义了 `metadata.openclaw.skillKey`，则改用该键。带连字符的名称需要加引号（JSON5 允许带引号的键）。

<ParamField path="skills.entries.<key>.enabled" 类型 = "布尔">
  即使捆绑或安装，`false` 也会禁用该技能。 `coding-agent` 捆绑技能是可选的 — 将其设置为 `true` 并检查 `claude`、`codex`、`opencode` 或另一个受支持的 CLI 之一是否已安装并经过身份验证。
</ParamField>

<ParamField path="skills.entries.<key>.apiKey" type='字符串 | { source, provider, id }'>
  适用于声明了 `metadata.openclaw.primaryEnv` 的技能的便捷字段。支持明文字符串或 SecretRef：`{ source: "env", provider: "default", id: "VAR_NAME" }`。
</ParamField>

<ParamField path="skills.entries.<key>.env" 类型 = "Record<string, string>">
  为代理运行注入的环境变量。仅当变量尚未在进程中设置时才注入。
</ParamField>

<ParamField path="skills.entries.<key>.config" 类型="对象">
  用于自定义每技能配置字段的可选包。
</ParamField>

## <a id="agent-allowlists-(agents)"></a><a id="agent-allowlists-agents"></a> 代理允许列表（`agents`）

当您需要相同的 machine/workspace 技能根但每个代理具有不同的可见技能集时，请使用代理配置。

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      skills: ["github", "weather"], // shared baseline
      heartbeat: { agentId: "writer" },
      systemAgent: { agentId: "writer" },
      authInheritance: { agentId: "writer" },
    },
    entries: {
      writer: { workspace: "~/.openclaw/workspace" }, // inherits github, weather
      docs: { skills: ["docs-search"] }, // replaces defaults entirely
      "locked-down": { skills: [] }, // no skills
    },
  },
  talk: { agentId: "writer" },
}
```

<ParamField path="agents.defaults.skills" type="string[]">
  被未指定 `agents.entries.*.skills` 的代理继承的共享基线允许列表。完全省略则默认不限制技能。
</ParamField>

<ParamField path="agents.entries.*.skills" type="string[]">
  该代理的显式最终技能集。显式列表会**替换**继承的默认值——不会合并。设置为 `[]` 可为该代理暴露零个技能。
</ParamField>

<Warning>
  代理技能白名单是 OpenClaw 技能发现、提示、斜杠命令发现、沙箱同步和技能快照的可见性和加载过滤器。它们不是 shell 时间授权边界。如果代理可以运行主机 `exec`，则该 shell 仍然可以运行外部客户端或读取执行用户可见的主机文件，包括 MCP 客户端注册表，例如 `~/.openclaw/skills/config/mcporter.json`。对于每个代理 MCP 隔离，将技能允许列表与 sandbox/OS-user 隔离相结合，拒绝或严格允许主机执行，并首选 MCP 服务器上的每个代理凭据。
</Warning>

## <a id="workshop-(skills.workshop)"></a><a id="workshop-skills-workshop"></a> 工作坊 (`skills.workshop`)

<ParamField path="skills.workshop.autonomous.mode" type='"off" | "auto"' default='"auto"'>
  `auto` 允许代理保存和更新创意工坊技能：在大量工作后运行背景审查，并存档 30 天未使用的学到的技能。审阅更改在 Control UI 聊天中显示为 **Learned** 行，并且每个更改都可以撤消。 `off` 禁用后台审核和未使用的技能清理。用户提示的技能创建、`/learn` 和手动学习会话在两种模式下均有效。
</ParamField>

<ParamField path="skills.workshop.autonomous.channelNotices" type="boolean" default="false">
  当 `true` 时，通过 **Undo** 按钮将后台审核通知发布到频道对话（Slack 除外）； Control UI 以纯文本形式显示该消息。当 `false` 时，它们仅在 Control UI 聊天中显示为 **Learned** 行。无论哪种方式，说“撤消”都有效。
</ParamField>

请参阅 [自学](/tools/self-learning) 了解资格、隐私、成本和故障排除。

<ParamField path="skills.workshop.maxSkillBytes" type="number" default="40000">
  创意工坊技能的最大 `SKILL.md` 大小（以字节为单位）（允许范围：1024-200000）。技能描述单独限制为1024字节；将它们保持在 160 字节左右，因为它们出现在发现和列表输出中。
</ParamField>

`openclaw doctor --fix` 从已删除的提案流中迁移配置：它将 `autonomous.mode: "propose"` 更改为 `"off"` 并删除 `skills.workshop.approvalPolicy` 和 `skills.workshop.maxPending`。运行 `openclaw config set skills.workshop.autonomous.mode auto` 以重新打开自动学习。

有关技能生命周期、CLI 命令、代理工具参数和此配置控制的网关方法，请参阅 [Skill Workshop](/tools/skill-workshop)。

## <a id="symlinked-skill-roots"></a> 符号链接的技能根目录

默认情况下，workspace、project-agent、extra-dir 和 bundled 的技能根目录都属于内容边界。位于 `<workspace>/skills` 下、但解析后指向根目录之外的符号链接技能文件夹， 会被跳过并记录日志。

若要允许有意使用符号链接布局，请声明受信任目标：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/path/to/skills"],
      allowSymlinkTargets: ["~/path/to/skills"],
    },
  },
}
```

通过此配置，`<workspace>/skills/manager -> ~/path/to/skills` 在实际路径解析后被接受。 `extraDirs` 直接扫描兄弟仓库； `allowSymlinkTargets` 保留现有布局的符号链接路径。

技能工坊使用每个特工的 `<state-dir>/agents/<agentId>/agent/workshop-skills` 收容边界。它不使用 `allowSymlinkTargets`，并且拒绝在该目录之外解析的符号链接技能。

受管理的 `~/.openclaw/skills` 和个人 `~/.agents/skills` 目录已经无条件接受技能目录符号链接（但每个技能的 `SKILL.md` 内容边界仍然适用）—— `allowSymlinkTargets` 仅在 workspace、extra-dir 和 project-agent (`<workspace>/.agents/skills`) 根目录中需要。

## <a id="sandboxed-skills-and-env-vars"></a> 沙箱化技能与环境变量

<Warning>
  `skills.entries.<skill>.env` 和 `apiKey` 仅适用于 **宿主机** 运行。 在沙箱中，它们不起作用——依赖 `GEMINI_API_KEY` 的技能会失败，并提示 `apiKey not configured`，除非为沙箱单独提供该变量。
</Warning>

将密钥传入 Docker 沙箱：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          env: { GEMINI_API_KEY: "your-key-here" },
        },
      },
    },
  },
}
```

<Note>
  拥有 Docker 守护进程访问权限的用户可以通过 Docker 元数据检查 `sandbox.docker.env` 的值。 如果无法接受这种暴露方式，请使用挂载的密钥文件、自定义镜像或其他传递路径。
</Note>

## <a id="loading-order-reminder"></a> 加载顺序提醒

请参阅 [ 加载顺序 ](/tools/skills#loading-order) 了解源优先级，包括每个代理创意工坊层，以及 [ 快照和刷新 ](/tools/skills#snapshots-and-refresh) 了解更改何时可见。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="技能参考" href="/tools/skills" icon="puzzle-piece">
    什么技能，加载顺序，门控，SKILL.md格式。
  </Card>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    编写自定义工作区技能。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    代理学习的技能、更改历史记录和撤消。
  </Card>
  <Card title="自学习" href="/tools/self-learning" icon="brain">
    从已完成的工作中自动、不可撤销地学习技能。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    原生斜杠命令目录和聊天指令。
  </Card>
</CardGroup>
