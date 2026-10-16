---
summary: "本机 Codex 会话发现和面向座席的监管设置"
read_when:
  - "您正在启用或禁用本机 Codex 会话发现"
  - "您需要监督配置字段和端点字段"
  - "您正在注册其他本地 Codex 房屋"
title: "Codex 会话目录和监督"
sidebarTitle: "监督"
---

侧边栏的本机会话发现和面向代理的监管策略。 [Codex harness参考 ](/plugins/codex-harness-reference) 的一部分； [ 每个部分移动的位置](/plugins/codex-harness-reference#where-each-section-moved) 列出每个部分。

## <a id="supervision"></a> 监管

原生会话发现默认会列出来自 Gateway 计算机以及已选择加入的配对节点中的未归档 Codex 会话。仅通过以下方式禁用该目录：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          sessionCatalog: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

发现自动覆盖网关进程 Codex 主目录（`CODEX_HOME` 或 `~/.codex`）以及每个已配置的 OpenClaw 代理的 Codex 主目录。仅当会话位于 OpenClaw 尚不知道的家庭中时，才注册其他本地 Codex 存储，例如在 OpenClaw 外部使用自定义 `CODEX_HOME` 创建的存储：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          sessionCatalog: {
            homes: [
              "/path/to/additional-codex-home",
              { path: "/path/to/review-codex-home", label: "Review sessions" },
            ],
          },
        },
      },
    },
  },
}
```

配置的存储与自动发现的存储一起显示在侧栏中，标记为 `Local Codex · <label>` 并按每个会话的工作目录分组。不带 `label` 的字符串条目和对象使用已解析主目录的基本名称；显式的 `label` 会覆盖该默认值。这些存储中的会话支持相同的查看、继续和归档操作，并且所选的 OpenClaw 代理仍然拥有生成的连接； `homes` 仅添加目录源。

Discovery 会为每个代理和 Codex 主目录分别缓存本机页面 32 秒，因此列出一个商店不会逐出另一商店的页面。过期页面在后台刷新期间仍然可见。

新的本机终端会话使用主要本地配置文件（显示为 `Local Codex`）或符合条件的配对节点。其他本地家庭是会话发现和恢复源，而不是单独的新开始目标。选定的工作目录控制 Codex 的项目配置，而无需更改其主目录或登录名。请参阅 [Native CLI 开始 ](/web/control-ui/sessions-and-sidebar#start-a-native-coding-cli)。

仅包含现有目录。针对自动 home 解析等效路径并进行重复数据删除，并且自动 home 在 100 个源目录上限下保持优先级。配置更改会以默认的混合重新加载模式刷新目录主目录；无需重新启动网关。 `sessionCatalog.homes` 需要默认的托管 stdio 应用程序服务器传输； Unix 和 WebSocket 传输拒绝它并出现可见错误，因为它们无法为每个家庭启动源绑定的应用程序服务器。

`supervision` 单独控制面向代理的工具：

| 字段                 | 默认值                 | 含义                                                                                                                                                                                                                                   |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`             | `false`                 | 启用面向代理的 Codex 监管工具。这不控制已认证的操作员会话目录。                                                                                                                            |
| `endpoints`           | 内置本地端点 | 为保留的 Codex 监管代理和独立 MCP 工具提供兼容性和高级端点目标。人类目录和分支流会忽略这些目标，并使用从 `appServer` 解析得到的监管 App Server。       |
| `allowRawTranscripts` | `false`                 | 在启用监管的情况下，允许自主代理或独立 MCP 读取完整转录，以及基于转录派生的列表字段。`codex_threads` 的仅元数据读取仍然可用。不会控制已认证的 Control UI 续接。     |
| `allowWriteControls`  | `false`                 | 在启用监管的情况下，允许自主的 `codex_threads` 分叉、重命名、归档和取消归档变更，以及独立 MCP 的发送、引导和中断操作。不会绕过其他绑定、主机、状态或确认检查。 |

端点条目接受以下字段：

| 字段          | 适用于    | 含义                                                               |
| -------------- | ------------- | --------------------------------------------------------------------- |
| `id`           | 全部           | 稳定的端点 id。                                                   |
| `label`        | 全部           | 可选显示标签。                                               |
| `transport`    | 全部           | `"stdio-proxy"` 或 `"websocket"`。                                     |
| `command`      | `stdio-proxy` | 可选的 App Server 命令。                                          |
| `args`         | `stdio-proxy` | 可选的命令参数。                                           |
| `cwd`          | `stdio-proxy` | 可选的子进程工作目录。                             |
| `url`          | `websocket`   | 必需的 WebSocket 或受支持的本地 socket URL。                     |
| `authTokenEnv` | `websocket`   | 可选的环境变量，其值用于认证该端点。 |

**Codex Sessions** 页面使用插件的监督应用程序服务器，并且仅显示非存档会话。如果没有明确的 `appServer` 连接设置，该连接将由用户主目录托管 stdio 管理。存储或空闲的本地行可以通过最后一个终端持久源轮流创建与有限用户和助理历史记录的模型锁定聊天。它的私有绑定保留快照分支、主 `appServer`-source 分支、历史记录注入，并在稍后打开该连接。第一个主线程启动使用 fork 返回的对。稍后恢复忽略 OpenClaw 模型和提供程序覆盖，以便 Codex 恢复主线程的持久对；单独的本机更改可以更新该对，但外部模型和后备链永远不会取代它。存储和空闲行可以在没有其他运行程序确认后存档，除非另一个活动的 OpenClaw 绑定拥有确切的目标或其非存档的衍生后代之一。 OpenClaw 遵循 Codex 的后代分页，并拒绝对枚举错误、循环或安全限制耗尽进行归档。确认仍然涵盖未知的本机客户端和状态到存档竞赛。受监督的模型锁定聊天在保护本机绑定时无法删除。活动源无法创建分支或存档，但仍可以打开现有的受监督聊天。配对节点延续需要 `operator.admin`、一个存储的或空闲的交互线程，以及一个通告并允许目录列表、副本读取和 `codex.cli.session.resume` 命令的连接节点。它将 Chat 绑定到该节点上的本机 CLI 简历，而不是本地分支流或流应用程序服务器harness。其他配对节点行仍然可读，并且配对节点归档不可用。请参阅 [ 配对节点限制 ](/plugins/codex-supervision#understand-paired-node-limits)。

`appServer.homeScope: "user"` 单独更改了受管理harness流程使用的 Codex 主目录；它不发布机队目录。启用监督不会更改harness默认值。相反，当不存在显式 `appServer` 连接设置时，单独的监督连接默认为托管用户主目录 stdio。该连接遵循显式设置。待处理和已提交的受监督绑定在每个回合都会保留该连接；禁用的监督或 connection/lifecycle 漂移会阻止执行，而不是退回到代理主页harness。默认连接与本机 Codex 客户端共享存储的会话，而不是其进程本地活动状态。

旧版 `plugins.entries.codex-supervisor` 设置已停用。运行 `openclaw doctor --fix` 将旧条目、端点定义、策略标志和插件 allow/deny 引用迁移到此块中。显式当前 `codex.config.supervision` 值赢得冲突。
