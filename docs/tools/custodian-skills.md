---
title: "保管技能"
sidebarTitle: "保管技能"
summary: "只有配置的 Custodian 代理才能发现和使用的发布版本操作技能。"
read_when:
  - "配置或扩展 Custodian 代理"
  - "检查仅代理的技能加载"
  - "规划操作技能覆盖范围"
---

托管技能是 OpenClaw 附带的发布版本操作手册。它们位于包中的 `custodian-skills/` 下。它们在捆绑技能优先层加载，但仅适用于由 `agents.defaults.systemAgent.agentId` 解析的代理。

当该设置不存在时，OpenClaw 将回退到保留的旧默认所有者、唯一配置的代理，或者在不存在显式代理名册时使用旧 `main`。如果在没有系统代理或保留旧所有者的情况下配置了多个代理，则没有代理会接收该库。对于其他所有代理，发现、快照、斜线命令目录、沙箱同步和面向模型的技能提示中都没有托管技能。

正常的技能控制仍然适用。 `skills.entries.<name>.enabled: false` 禁用单个监护人技能，而特工技能允许列表可以缩小最终集合的范围。请参阅 [ 技能配置](/tools/skills-config)。

## <a id="workflow-contract"></a> 工作流程合同

每个已发布的保管人技能都按此顺序使用相同的五个部分：

1. **Gather** 读取编辑后的当前配置并检查实时状态。
2. **Mutate** 使用经过验证的非交互式写入，而不是直接文件编辑。这些写入是来自受信任 shell 的 `openclaw config set` / `openclaw config patch` 或策略允许的会话内托管工具操作。
3. **Repair** 诊断为 `openclaw doctor --lint`。只有明确批准的维修才使用 `openclaw doctor --fix --non-interactive`。只读 `diagnose-gateway` 技能建议单独的步骤，但从不运行它。
4. **Prove** 练习一个实时的端到端结果。
5. **Report** 记录更改的内容、观察到的内容以及保留的内容。

所有由五部分组成的剧本都将秘密值保留在提示、日志和文件之外。凭证使用 SecretRefs 或凭证存储。如果没有证明结果，工作流程永远不会声称成功。当实时证据不可用时，它会报告确切的阻止者。

Lint 退出代码 `1` 表示发现结果，而不是失败的诊断命令：阅读报告并继续其余检查。普通`doctor`，包括`--non-interactive`，可以复制旧配置并迁移状态，而无需`--fix`。它不是只读替代品。只读诊断不包括 config/service 修复和状态迁移，也不包括附带日志或缓存簿记。请参见 [Doctor](/cli/doctor#lint-mode)。

## <a id="first-wave"></a> 第一波

| 技能                | 结果                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `configure-channel`  | 通过 Discord、Slack、Telegram 或 WhatsApp 等通道系列配置并发送确认的测试消息。 |
| `add-model-provider` | 配置 API-key 或 subscription/OAuth 提供程序访问并运行一个实时网关推理。                         |
| `diagnose-gateway`   | 执行只读网关、配置、SecretRef、通道验证、日志和端口分类。                                   |
| `cloud-image-bake`   | 烘焙 Cloud Worker 映像，通过定时调度证明它，并安全地淘汰被取代的快照。               |

## <a id="roadmap-catalog"></a> 路线图目录

以下目录文档适用于更高层。这些名称是路线图条目，而不是捆绑的技能或当前行为的承诺。

### <a id="tier-2%3A-common-operations"></a><a id="tier-2-common-operations"></a> Tier 2：常见操作

- `configure-search`：配置并实时验证搜索提供程序。
- `create-agent`：创建一个代理，验证其工作区，并证明一轮。
- `manage-plugin`：安装、配置、验证或删除已批准的插件。
- `rotate-credential`：通过其所属的存储轮换一个受支持的凭证并向用户进行验证。
- `upgrade-openclaw`：暂存升级、运行运行状况检查并验证回滚准备情况。

### <a id="tier-3%3A-advanced-operations"></a><a id="tier-3-advanced-operations"></a> Tier 3：高级操作

- `fleet-rollout`：跨托管网关推出一项经过验证的配置或版本。
- `incident-response`：收集经过编辑的证据、遏制事件并验证恢复情况。
- `migrate-gateway`：移动网关，同时保留显式状态和身份合约。
- `release-validation`：运行发布跟踪包、安装和实时行为证明。
- `restore-backup`：恢复到隔离目标、验证状态并有意切换。

## <a id="add-an-operator-skill"></a> 添加操作员技能

将本地添加内容放在已配置的 Custodian 代理的工作区中，而不是放在版本拥有的包目录中：

```text
<custodian-workspace>/skills/<skill-name>/SKILL.md
```

工作区技能已经比捆绑层具有更高的优先级，并且范围仅限于该代理的工作区。遵循相同的收集→变异→修复→证明→报告合同。保持描述简短。更改技能后开始新的会话。完整格式请参见[创作技巧](/tools/creating-skills)。

## <a id="related"></a> 相关内容

- [技能](/tools/skills)
- [技能配置](/tools/skills-config)
- [云 Workers](/gateway/cloud-workers)
- [网关故障排查](/gateway/troubleshooting)
