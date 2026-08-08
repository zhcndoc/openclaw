---
title: "技能配置"
sidebarTitle: "技能配置"
summary: "skills.* 配置模式、代理白名单、工作坊设置以及沙箱环境变量处理的完整参考。"
read_when:
  - 配置技能加载、安装或门控行为
  - 设置按代理划分的技能可见性
  - 调整技能工作坊限制或审批策略
---

大多数技能配置位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。按代理划分的可见性位于 `agents.defaults.skills` 和 `agents.entries.*.skills` 中。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: { mode: "auto" },
      allowSymlinkTargetWrites: false,
      approvalPolicy: "auto",
      maxPending: 50,
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
  对于内置图像生成，请使用 `agents.defaults.mediaModels.image`
  加上核心的 `image_generate` 工具，而不是 `skills.entries`。技能条目
  仅用于自定义或第三方技能工作流。
</Note>

## 加载（`skills.load`）

<ParamField path="skills.load.extraDirs" type="string[]">
  要扫描的额外 skill 目录，优先级最低（低于内置和插件 skill）。路径会展开，并支持 `~`。
</ParamField>

<ParamField path="skills.load.allowSymlinkTargets" type="string[]">
  受信任的真实目标目录，符号链接的 skill 文件夹可以解析到这些目录中，即使符号链接位于配置的根目录之外。用于有意采用的兄弟仓库布局，例如
  `<workspace>/skills/manager -> ~/Projects/manager/skills`。请将此列表保持得尽量精简——不要指向像 `~` 或 `~/Projects` 这样过于宽泛的根目录。
</ParamField>

<ParamField path="skills.load.watch" type="boolean" default="true">
  监视 skill 文件夹，并在 `SKILL.md` 文件变更时刷新 skills 快照。覆盖分组 skill 根目录下的嵌套文件。
</ParamField>

## 安装 (`skills.install`)

<ParamField path="skills.install.preferBrew" type="boolean" default="true">
  在 `brew` 可用时优先使用 Homebrew 安装器。
</ParamField>

<ParamField path="skills.install.nodeManager" type='"npm" | "pnpm" | "yarn" | "bun"' default='"npm"'>
  技能安装的 Node 包管理器偏好。此设置仅影响技能安装——OpenClaw CLI 和 Gateway 运行时需要 Node，因为规范状态存储使用 `node:sqlite`。`openclaw setup --node-manager` 和 `openclaw onboard --node-manager` 接受 `npm`、`pnpm` 或 `bun`；如果要使用基于 Yarn 的技能安装，请直接在配置中设置 `"yarn"`。
</ParamField>

<ParamField path="skills.install.allowUploadedArchives" type="boolean" default="false">
  允许受信任的 `operator.admin` Gateway 客户端安装通过 `skills.upload.*` 暂存的私有 zip 压缩包。正常的 ClawHub 安装不需要此设置。
</ParamField>

## 操作员安装策略（`security.installPolicy`）

当操作员需要一个受信任的本地命令，依据主机特定策略来批准或阻止技能和插件安装时，请使用 `security.installPolicy`。该策略在 OpenClaw 完成源材料暂存之后、安装或更新继续之前运行。它适用于 ClawHub 技能、上传的技能、Git/本地技能、技能依赖安装器，以及插件安装/更新源。

```json5
{
  security: {
    installPolicy: {
      enabled: true,
      // 省略 targets 可覆盖所有支持的目标。
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
  启用操作员拥有的安装策略。启用但没有有效 `exec` 命令时，安装将失败并关闭。
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
  在没有 stdout 或 stderr 输出的情况下，策略失败并关闭之前的最长时间。
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

策略会在 stdin 上接收一个 JSON 对象，其中包含 `protocolVersion: 1`、`openclawVersion`、`targetType`、`targetName`、`sourcePath`、`sourcePathKind`、可选的结构化 `source`、结构化 `origin` 和 `request`。它必须在 stdout 上写入一个 JSON 对象：`{ "protocolVersion": 1, "decision": "allow" }` 或 `{ "protocolVersion": 1, "decision": "block", "reason": "..." }`。非零退出、超时、JSON 格式错误、缺失字段或不支持的协议版本都会导致失败并关闭。

OpenClaw 在正常 Gateway 启动期间不会执行安装策略。当启用策略但策略不可用时，安装和更新会失败并关闭。  
`openclaw doctor` 会执行静态验证；`openclaw doctor --deep` 会针对配置的命令执行一个合成安装探测。

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
        reason: "本地主机上的插件路径未获批准",
      }),
    );
    return;
  }
  process.stdout.write(JSON.stringify({ protocolVersion: 1, decision: "allow" }));
});
```

## 捆绑技能白名单

<ParamField path="skills.allowBundled" type="string[]">
  仅适用于 **捆绑** 技能的可选允许列表。设置后，只有列表中的捆绑
  技能才具备资格。托管、代理级别和工作区
  技能不受影响。
</ParamField>

## 按技能的条目（`skills.entries`）

`entries` 下的键默认与技能的 `name` 匹配。如果某个技能定义了 `metadata.openclaw.skillKey`，则改用该键。带连字符的名称需要加引号（JSON5 允许带引号的键）。

<ParamField path="skills.entries.<key>.enabled" type="boolean">
  `false` 会在技能即使已捆绑或已安装时也将其禁用。`coding-agent` 捆绑的技能默认不启用——将其设为 `true`，并确保已安装且已认证 `claude`、`codex`、`opencode` 或其他受支持的 CLI 之一。
</ParamField>

<ParamField path="skills.entries.<key>.apiKey" type='string | { source, provider, id }'>
  适用于声明了 `metadata.openclaw.primaryEnv` 的技能的便捷字段。支持明文字符串或 SecretRef：`{ source: "env", provider: "default", id: "VAR_NAME" }`。
</ParamField>

<ParamField path="skills.entries.<key>.env" type="Record<string, string>">
  为代理运行注入的环境变量。仅在该变量尚未在进程中设置时才会注入。
</ParamField>

<ParamField path="skills.entries.<key>.config" type="object">
  自定义按技能配置字段的可选对象。
</ParamField>

## 代理允许列表（`agents`）

当你希望使用相同的机器/工作区技能根目录，但为每个代理提供不同的可见技能集时，请使用代理配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // 共享基线
    },
    list: [
      { id: "writer" }, // 继承 github、weather
      { id: "docs", skills: ["docs-search"] }, // 完全替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

<ParamField path="agents.defaults.skills" type="string[]">
被未指定 `agents.entries.*.skills` 的代理继承的共享基线允许列表。完全省略则默认不限制技能。
</ParamField>

<ParamField path="agents.entries.*.skills" type="string[]">
该代理的显式最终技能集。显式列表会**替换**继承的默认值——不会合并。设置为 `[]` 可为该代理暴露零个技能。
</ParamField>

<Warning>
代理技能允许列表是 OpenClaw 技能发现、提示词、斜杠命令发现、沙箱同步和技能快照的可见性与加载过滤器。它们不是 shell 运行时的授权边界。如果某个代理可以运行主机 `exec`，那么该 shell 仍然可以运行外部客户端，或读取执行用户可见的主机文件，包括诸如 `~/.openclaw/skills/config/mcporter.json` 之类的 MCP 客户端注册表。对于按代理隔离 MCP，请将技能允许列表与沙箱/OS 用户隔离结合使用，禁止或严格允许主机 `exec`，并优先在 MCP 服务器端为每个代理使用凭据。
</Warning>

## 工作坊 (`skills.workshop`)

<ParamField path="skills.workshop.autonomous.mode" type='"off" | "propose" | "auto"' default='"auto"'>
  `off` 禁用自主捕获，但保留持久指令建议提示。`propose` 根据更正和已完成的重要工作创建待处理提案。`auto` 通过由扫描器控制的常规工作坊应用路径发送相同的捕获内容。用户提示的技能创建、`/learn` 和手动历史记录扫描在所有模式下均可继续使用。
</ParamField>

请参见 [自学习](/tools/self-learning) 了解资格、隐私、成本、仅提案权限以及故障排除。

<ParamField path="skills.workshop.approvalPolicy" type='"pending" | "auto"' default='"auto"'>
  `auto` 允许代理发起应用、拒绝或隔离操作，无需额外的审批提示。`pending` 需要操作员批准。
</ParamField>

<ParamField path="skills.workshop.allowSymlinkTargetWrites" type="boolean" default="false">
  允许技能工作坊应用通过工作区技能符号链接写入，其真实目标已被 `skills.load.allowSymlinkTargets` 视为受信任。
  除非生成的提案应用应该修改该共享技能根目录，否则请保持禁用。
</ParamField>

<ParamField path="skills.workshop.maxPending" type="number" default="50">
  每个工作区保留的待处理和已隔离提案的最大数量（允许范围：1-200）。
</ParamField>

<ParamField path="skills.workshop.maxSkillBytes" type="number" default="40000">
  提案正文的最大字节数（允许范围：1024-200000）。提案描述单独硬性限制为 160 字节，因为它们会出现在发现和列表输出中。
</ParamField>

有关该配置控制的提案生命周期、CLI
命令、代理工具参数以及网关方法，请参见 [技能工作坊](/tools/skill-workshop)。

## 符号链接的技能根目录

默认情况下，workspace、project-agent、extra-dir 和 bundled 的技能根目录都属于
内容边界。位于 `<workspace>/skills` 下、但解析后指向根目录之外的符号链接技能文件夹，
会被跳过并记录日志。

若要允许有意使用符号链接布局，请声明受信任目标：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

使用此配置后，`<workspace>/skills/manager -> ~/Projects/manager/skills`
在 realpath 解析后会被接受。`extraDirs` 会直接扫描兄弟仓库；
`allowSymlinkTargets` 会为现有布局保留符号链接路径。

默认情况下，Skill Workshop apply 不会通过这些符号链接写入。若要让 Workshop apply 修改已受信任的符号链接目标下的技能，请单独启用：

```json5
{
  skills: {
    load: {
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
    workshop: {
      allowSymlinkTargetWrites: true,
    },
  },
}
```

受管理的 `~/.openclaw/skills` 和个人 `~/.agents/skills` 目录
已经无条件接受技能目录符号链接（但每个技能的 `SKILL.md` 内容边界仍然适用）——
`allowSymlinkTargets` 仅在 workspace、extra-dir 和 project-agent
(`<workspace>/.agents/skills`) 根目录中需要。

## 沙箱化技能与环境变量

<Warning>
  `skills.entries.<skill>.env` 和 `apiKey` 仅适用于 **宿主机** 运行。
  在沙箱中，它们不起作用——依赖 `GEMINI_API_KEY` 的技能会失败，并提示 `apiKey not configured`，除非为沙箱单独提供该变量。
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
  拥有 Docker 守护进程访问权限的用户可以通过 Docker 元数据检查 `sandbox.docker.env` 的值。
  如果无法接受这种暴露方式，请使用挂载的密钥文件、自定义镜像或其他传递路径。
</Note>

## 加载顺序提醒

```text
workspace/skills      (最高)
workspace/.agents/skills
~/.agents/skills
~/.openclaw/skills
bundled skills
skills.load.extraDirs (最低)
```

对技能和配置的更改会在下一个新会话中生效（当 watcher 启用时），或者在 watcher 检测到更改后的下一个 agent 回合中生效。

## 相关内容

<CardGroup cols={2}>
  <Card title="技能参考" href="/tools/skills" icon="puzzle-piece">
    技能是什么、加载顺序、门控以及 `SKILL.md` 格式。
  </Card>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    编写自定义工作区技能。
  </Card>
  <Card title="技能工作坊" href="/tools/skill-workshop" icon="flask">
    代理草拟技能的提案队列。
  </Card>
  <Card title="自学习" href="/tools/self-learning" icon="brain">
    来自已完成工作的保守、可选择加入的提案。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    原生斜杠命令目录和聊天指令。
  </Card>
</CardGroup>
