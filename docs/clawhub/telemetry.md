---
summary: "安装 ClawHub CLI 收集的遥测数据以及如何选择退出。"
read_when:
  - "致力于遥测/隐私控制"
  - "有关收集哪些数据的问题"
---

# <a id="telemetry"></a> 遥测

ClawHub 使用最少的 CLI 遥测来计算聚合技能和插件安装计数。

## <a id="when-telemetry-is-collected"></a> 遥测采集时

仅在以下情况下发送遥测数据：

- 您已登录CLI。
- 您完成 `clawhub install <skill>`，这是通过 `clawhub update` 替换 skills.sh 目录技能的更新，或经过身份验证的 `openclaw plugins install clawhub:<package>` 安装。
- 遥测是**未禁用**（请参阅下面的“如何禁用”）。

如果您未登录，则不会报告任何内容。

## <a id="what-we-collect"></a> 我们收集什么

安装技能或插件并保留其本地安装记录后，CLI 会发送一个尽力而为安装事件。

该活动包括：

- 安装的技能slug或规范插件包名称。
- `version`：已知的已安装版本。
- Skill 事件还可能包括发布者句柄、源引用和种类、存储库、存储库相对源路径、源 URL、规范引用、扫描状态和信任标签（如果可用）。

### <a id="what-we-do-not-collect"></a> 我们不收集什么

- 没有本地文件系统路径或从本地文件夹路径派生的标识符。存储库相对源路径标识其源存储库中的技能。
- 无文件内容。
- 无每次运行日志、提示或其他 CLI 输出。

## <a id="install-counts"></a> 安装计数

对于技能，ClawHub 维持：

- `installsAllTime`：已报告至少安装了一次 CLI 技能的唯一用户。
- `installsCurrent`：已报告安装且尚未删除其遥测数据的唯一用户。

安装事件记录存在，而不是您已安装技能的快照。卸载不会发送遥测或递减计数，并且 `clawhub sync` 不会协调删除。旧版快照报告也仅添加报告的安装；省略的技能不会从计数中删除。

服务器丢弃skills.sh安装事件；它们不会增加本机 ClawHub 技能计数器。

对于插件，ClawHub 计算每个用户和包报告的第一次成功安装。重复安装和更新会刷新记录的版本，而不会增加聚合安装计数。

## <a id="transparency-%2B-user-controls"></a><a id="transparency-+-user-controls"></a> 透明度+用户控件

每个人都只看到**聚合安装计数器**。

删除您的帐户还会删除您的遥测数据并从安装计数器中删除其贡献。

## <a id="how-to-disable-telemetry"></a> 如何禁用遥测

设置环境变量：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

使用此设置，CLI 将不会发送安装遥测数据。
