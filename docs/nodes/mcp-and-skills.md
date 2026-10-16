---
summary: "从配对节点发布 MCP 服务器、技能和本地模型推理"
read_when:
  - "在节点而不是网关上运行 MCP 服务器"
  - "从节点机器发布技能"
  - "从节点公开本地 Ollama 模型"
title: "Node-托管 MCP 服务器和技能"
sidebarTitle: "MCP和技能"
---

## <a id="node-hosted-mcp-servers"></a> Node-托管 MCP 服务器

请在节点机器上的 `openclaw.json` 中配置 MCP 服务器，而不是在 Gateway 上配置：

```json5
{
  nodeHost: {
    mcp: {
      servers: {
        localDocs: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/srv/docs"],
          toolFilter: {
            include: ["read_*", "search"],
          },
        },
        internalApi: {
          url: "https://mcp.internal.example/mcp",
          transport: "streamable-http",
          headers: {
            Authorization: "Bearer ${INTERNAL_MCP_TOKEN}",
          },
        },
      },
    },
  },
}
```

无头节点主机会启动这些服务器，列出它们的工具，并在连接后发布描述信息。工具调用会通过 `mcp.tools.call.v1` 返回到该节点；Gateway 不需要匹配的 MCP 配置或 JS 插件。不支持在此节点托管的 v1 路径中使用 OAuth MCP 服务器。

当前的节点主机在初始配对期间会声明内置的 `mcp.tools.call.v1` 命令家族， 即使没有配置任何 MCP 服务器也是如此。使用较旧 OpenClaw 版本配对的节点在节点主机更新后，可能会请求一次性的命令面升级。之后添加、移除或过滤服务器都不需要重新配对，因为已批准的命令家族没有变化。要应用节点 MCP 配置更改， 请重启 `openclaw node run` 或 `openclaw node restart`；节点主机不会监视此配置。

服务器通告的工具列表更改实时应用并替换已发布的节点目录。如果 MCP 传输关闭或 SSE 或有状态 Streamable HTTP 会话过期，则节点将撤回该服务器的过时工具并以有界退避重新连接。检测到会话过期的失败调用不会重放；稍后的调用可以在重新发布其工具后使用替换连接。

Gateway 运营者可以通过 `gateway.nodes.pluginTools.enabled: false` 忽略所有由已配对节点发布、对代理可见的工具，包括节点托管的 MCP 工具。像 `gateway.nodes.commands.deny: ["mcp.tools.call.v1"]` 这样的精确命令拒绝也会阻止执行。

## <a id="node-hosted-skills"></a> Node-托管技能

将技能安装在节点机器当前激活的 OpenClaw 技能目录下，默认是 `~/.openclaw/skills`。`OPENCLAW_HOME`、`OPENCLAW_STATE_DIR` 和 `OPENCLAW_CONFIG_PATH` 会移动该活动配置文件。对于技能而言，`OPENCLAW_STATE_DIR` 具有优先级；否则，`skills/` 位于 `openclaw config file` 打印出的路径旁边。无头节点主机在连接后会发布有效的 `SKILL.md` 文件，而 Gateway 仅在该节点保持连接期间将它们添加到代理技能快照中。每个技能目录名称必须与 `name` frontmatter 字段匹配，这样抽象节点定位器就能映射到一个条目，而无需再添加另一个协议字段。

初始的节点角色配对会批准技能发布。添加、移除或更改技能不需要再次配对或修改 Gateway 配置。 更改节点技能文件后，请重启 `openclaw node run` 或 `openclaw node restart`；节点主机不会监视技能目录。

Node-托管技能条目标识其节点并携带其执行位置。技能文件、引用的相对路径和二进制文件保留在该节点上。代理使用普通的 `read` 工具读取通告的 `node://.../SKILL.md` 位置。 `file_fetch` 接受运营商批准的绝对节点路径，而不是节点技能定位器；没有正常读取工具的运行时可以通过 `exec host=node node=<node-id>` 运行 `cat SKILL.md`，并将公布的 `node://.../skills/<name>` 目录作为 `workdir`。引用的文件和二进制文件使用相同的 exec 目标和工作目录。节点主机根据其活动的 OpenClaw 状态目录解析该定位器，因此相对路径在节点而不是网关计算机上解析。发布节点必须已批准`system.run`，并且代理的执行策略必须允许`host=node`；否则该技能将不会出现在该代理的快照中。

在节点上设置`nodeHost.skills.enabled: false`以停止发布。网关操作员可以忽略每个与 `gateway.nodes.allowSkills: false` 配对的节点的技能。

## <a id="local-model-inference"></a> 局部模型推理

桌面或服务器 node 可以从运行在该 node 上的 Ollama 服务器暴露支持聊天的模型。代理使用 Ollama 插件的 `node_inference` 工具来发现已安装的模型，并远程运行一个有边界的提示；Gateway 无需直接访问 Ollama 网络。有关设置、模型过滤和直接验证命令，请参见 [Ollama 节点本地推理](/providers/ollama#node-local-inference)。
