---
summary: "从 macOS 应用程序的仪表板管理网关技能"
read_when:
  - "通过 macOS 应用程序管理技能"
  - "更改 skills 的 gating 或安装行为时"
title: "技能（macOS）"
---

打开 **Dashboard → Skills** 以检查和管理已连接网关的技能。 macOS应用程序使用与常规浏览器相同的Control UI；没有单独的本机技能窗格。在安装或配置技能之前选择所需的网关。

## <a id="data-source"></a> 数据源

- `skills.status`（gateway）返回所有技能以及资格和缺失的要求，包括捆绑技能的允许名单阻止。
- 要求来自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## <a id="install-actions"></a> 安装操作

- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv/download）。
- 仪表板调用 `skills.install` 在网关主机上运行安装程序。
- 要为此 Mac 的本地网关安装，请先连接到它。使用 **Connection… → Connection** 选择本地模式，或从 **Gateways** 中选择其保存的配置文件。
- 运营商拥有的 `security.installPolicy`（`enabled`、`targets`、`exec`）在安装程序元数据之前运行。 `block` 结果和策略失败会停止安装。 `warn` 结果还会停止网关支持的请求：使用匹配的直接 CLI（如果存在）对其进行审核，或者更改策略以允许审核的请求，然后重试。
- 如果所有安装选项都是 `download`，网关会展示所有下载选项。
- 否则，网关会使用当前安装偏好（`skills.install.preferBrew`、`skills.install.nodeManager`）和主机二进制程序选择一个首选安装器：当启用 `preferBrew` 且存在 `brew` 时，先选择 Homebrew，然后是 `uv`，再是配置的 node manager，然后如果可用则再次选择 Homebrew（即使未启用 `preferBrew`），接着是 `go`，最后是 `download`。
- Node 安装标签会反映所配置的 node manager，包括 `yarn`。

## <a id="browse-clawhub"></a> 浏览 ClawHub

从 **Dashboard → Skills** 搜索 ClawHub 并打开结果以在安装之前检查其元数据、发布者和发布版本。网关在安装过程中拥有预下载安全检查。官方 ClawHub 发布者和软件包会跳过安全判决获取，如 [ClawHub 发布 trust](/cli/skills#release-trust) 中所述。

ClawHub **Review** 审核结果允许安装并在结果警告中返回审核文本。 **Blocked** 或不可用的安全检查会停止安装。这些审核结果不会覆盖上述运营商拥有的安装策略。

仅安装搜索结果提供 **Install**，而不是详细审查。仪表板发送准确的源参考，无需版本选择器，并标记未扫描的源。安装后，它会在同一网关路由上读取 `skills.status`，以确认审阅的版本或记录的仅安装参考。

## <a id="env%2Fapi-keys"></a><a id="env/api-keys"></a> Env/API 按键

- Skill 配置属于其配置中 `skills.entries.<skillKey>` 下的网关，而不属于此 Mac 的设备首选项。
- `skills.update` 会补丁更新 `enabled`、`apiKey` 和 `env`。

## <a id="remote-mode"></a> 远程模式

- 安装和配置更新发生在网关主机上，而不是本地 Mac 上。
- 当技能文件、配置、Mac 节点连接、其目录或其可执行清单发生更改时，网关会在其权威快照失效后发出 `skills.changed`。使用仪表板技能页面上的 **Refresh** 加载最新的 `skills.status` 报告。

## <a id="related"></a> 相关内容

- [技能](/tools/skills)
- [macOS 应用](/platforms/macos)
