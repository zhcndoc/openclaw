---
summary: "使用一条粘贴的命令将机器连接到 OpenClaw Gateway"
read_when:
  - "将新的无头节点与 Gateway 配对"
  - "使用加入 URL 或设置代码安装节点主机"
title: "连接"
---

# `openclaw connect`

将当前机器作为无头节点连接到 OpenClaw Gateway。该命令会兑换一个短期有效的引导凭据，将 Gateway 端点保存到现有的节点主机状态中，并运行与 [`openclaw node run`](/cli/node) 相同的运行时。

## <a id="create-a-join-command"></a> 创建加入命令

在 Gateway 主机上，使用管理员凭据生成一次性加入 URL：

```bash
openclaw devices join-code
```

该命令打印 URL 和一个可粘贴的命令，该命令安装后台节点服务并使其能够运行代理会话：

```bash
npx -y openclaw@<gateway-version> connect https://gateway.example/j/<shortcode> --service --session-host
```

仅在您信任作为共享网关基础设施的计算机上使用会话托管。打印的命令通过 `--session-host` 明确表示同意；节点运行时的默认设置仍然是非托管。请参阅 [ 会话托管 ](/nodes/session-hosting)。对于仅命令节点，省略 `--session-host` 并保留 `--service`。 `-y` 标志跳过 npm 的软件包安装确认，而不是 OpenClaw 配对或会话托管同意。

即使您从不同的 CLI 版本运行 `devices join-code`，网关也会选择自己发布的 npm 版本。源签出和未发布的构建使用可解析的匹配发布通道标签（如果可用），否则取消固定 `openclaw`，并附注使用匹配的网关构建。注册表检查的时间限制为两秒；不可用的注册表还会显示匹配的构建注释。

已经安装了 OpenClaw 吗？运行：`openclaw connect <join-url> --service --session-host`。这使用您安装的版本而不是 npx；确保它与网关匹配。

该短代码具有 128 位熵，会在设置凭据约 10 分钟后过期，并且只能获取一次。如果代码已过期或已经使用，请生成另一个代码。

## <a id="connect-in-the-foreground"></a> 在前台连接

要在不安装服务的情况下进行连接，请省略 `--service` 和 `--session-host`：

```bash
npx openclaw connect https://gateway.example/j/<shortcode>
```

需要时，在注册期间设置设备名称：

```bash
npx openclaw connect https://gateway.example/j/<shortcode> --display-name "Build Node"
```

节点会一直在前台运行，直到你将其停止。

要仅公开选定的命令，请传递精确命令 ID 的逗号分隔列表。对于 [Session Share](/plugins/session-share) 节点：

```bash
openclaw connect <join-url> \
  --commands openclaw.sessions.list.v1,openclaw.sessions.read.v1
```

该标志是可重复的。白名单是持久节点状态，在安装 `--service` 后也适用；省略它会保留已保存的列表。它过滤可用的命令及其所需的功能，并禁用计算机使用、技能、插件工具发布、MCP 服务器和工作人员托管。当没有请求的命令可用时启动失败。网关配对批准显示结果声明的命令。

要恢复完整的默认表面，请对前台节点使用 `openclaw node run --all-commands`，对已安装的服务使用 `openclaw node install --force --all-commands`。再次注册时，使用`openclaw connect <join-url> --all-commands`（为服务添加`--service`）。这会忘记保存的白名单； `--all-commands` 不能与 `--commands` 组合使用。

要让该前台进程托管完整的工作会话，请通过 `--session-host` 给予明确的本地同意：

```bash
npx openclaw connect https://gateway.example/j/<shortcode> --session-host
```

前台同意仅适用于该进程。它不会更改 `openclaw.json`，因此下一次正常的节点主机启动仍然是非托管。

## <a id="reconnect-a-paired-node"></a> 重新连接配对节点

加入 URL 和设置代码是一次性的，因此在节点停止后重新运行原始 `openclaw connect <join-url>` 命令会报告未找到加入代码或已过期。节点将其配对的设备令牌和网关端点保持在节点-主机状态。重新连接 [`openclaw node run`](/cli/node)，重复任何进程范围的标志：

```bash
openclaw node run --session-host
```

在没有目标的情况下运行 `openclaw connect` 无法连接。当节点主机状态具有已保存的网关端点和节点设备令牌时，它会退出并显示错误，该错误将打印与您传递的标志相匹配的 `openclaw node run` 命令（如果该配对仍然是当前的则使用），否则打印 `openclaw connect` 命令与新加入 URL 一起使用。对于 `--service`，它会打印 `openclaw node install --force`，当您还传递了 `--session-host` 时，前面会打印 `openclaw config set nodeHost.workerRuns.enabled true`。如果第一次注册从未完成，则仅指向新加入 URL。设备令牌不绑定到一个端点：在不同网关注册失败后，重新连接命令可能会失败，因此请重新注册。要再次注册机器，请创建一个新的加入 URL 和 `openclaw devices join-code`。

## <a id="environment-managed-cloud-nodes"></a> 环境管理的云节点

Worker提供商使用`--ephemeral`作为一次性云机器：

```bash
npx openclaw connect <setup-code> --ephemeral
```

即使机器的持久节点配置禁用了工作程序托管，此进程也会托管工作程序会话。它不安装服务，不能与 `--service` 或 `--session-host` 组合。网关拥有设置身份和配对节点生命周期：在使用一次性设置凭证后，提供程序重播会恢复持久的设备令牌，并且环境拆卸会在释放云租约后删除节点角色。

`--ephemeral` 适用于一次性计算机上提供商管理的状态目录，而不是作为注册个人设备的快捷方式。

## <a id="install-as-a-service"></a> 安装为服务

传递 `--service` 以兑换引导凭据，并将节点主机安装为平台用户服务：

```bash
npx openclaw connect https://gateway.example/j/<shortcode> --service
```

OpenClaw 在安装服务之前完成第一次身份验证连接。短期引导令牌永远不会存储在服务命令或节点主机配置中；稍后开始使用持久配对设备令牌。针对该保存的端点重新启动时，环境中的环境网关凭据或位于同一位置的网关的配置不会覆盖配对。对于有意的共享凭证覆盖，请使用 `openclaw node run --auth-from-env` 或 `openclaw node install --auth-from-env --force`；请参见 [ 节点主机身份验证](/cli/node#gateway-auth-for-node-host)。使用 [`openclaw node status`](/cli/node#service-background) 检查已安装的服务。

当通过 `npx` 运行时，服务安装首先将选定的 OpenClaw 版本安装到节点状态目录下的 `npm` 中。该服务使用持久安装，而不是 npm 的临时 `_npx` 缓存。安装输出显示软件包版本、选择的运行时、服务命令和节点更新命令：

```bash
npx -y openclaw@latest node install --force
```

使用相同的配置文件和状态目录设置在节点计算机上运行它。它将选定的版本提升到相同的前缀并重写服务，而无需兑换另一个加入 URL。需要时使用 `openclaw@beta` 或精确版本代替 `openclaw@latest`。重新安装相同版本也会修复丢失的包文件。即使计算机上安装了单独的网关，这也会以节点为目标。

默认情况下，该服务不托管工作会话。要同意完整的工作会话托管，请添加 `--session-host`：

```bash
npx openclaw connect https://gateway.example/j/<shortcode> --service --session-host
```

一次性引导连接可验证并保存持久的设备身份，无需广告工作人员托管。仅当连接成功后，OpenClaw 才会保留 `nodeHost.workerRuns.enabled=true`，保留其余配置并安装服务。如果配置写入失败，服务安装不会启动。已安装的服务在启动时会根据此持久同意来宣传工作人员托管和确切容量。

## <a id="accepted-targets"></a> 接受的目标

| 选项                  | 用途                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--commands <ids>`      | 保存精确的逗号分隔节点命令白名单（可重复）。适用于前台运行和已安装的服务。 |
| `--all-commands`        | 公布完整的默认命令界面并忘记任何已保存的 `--commands` 白名单。与 `--commands` 冲突。  |
| `--display-name <name>` | 设置节点显示名称。                                                                                            |
| `--service`             | 首先配对，然后将节点安装为用户服务。                                                                  |
| `--session-host`        | 同意工人托管。显式命令白名单会禁用托管。                                            |
| `--ephemeral`           | 运行提供商管理的一次性工作节点。                                                                        |
| `--target-file <path>`  | 从文件中读取连接目标并在成功读取后消耗切换。                                       |

`openclaw connect <target>` 接受：

- `https://<gateway>/j/<shortcode>` 加入 URL；
- an `oc-pair://<setup-code>` URL;
- 裸 base64url 设置代码。

`--target-file <path>` 接受最多 64 个 KiB 的常规文件。它仅在读取非空目标后才删除路径。如果文件为空、太大、无法读取或不是常规文件，OpenClaw 会将其保留在原处。允许使用符号链接； OpenClaw 读取其目标，成功读取后删除符号链接，并保留备份文件。休眠安装程序包装器使用此切换来将一次性目标排除在子进程参数之外。

加入 URL 必须使用 HTTPS。仅环回网关 URL（例如 `http://127.0.0.1/j/<shortcode>`）接受普通 HTTP。直接设置代码可以携带网关 TLS 证书指纹，这使得节点主机在解码有效负载后可以固定自签名网关证书。

有效负载确定保存的主机、端口、TLS 模式、WebSocket 上下文路径和有序回退端点。普通和前台连接不添加`openclaw.json`键； `--service --session-host` 明确保留上述工作人员托管同意。

## <a id="revocation-behavior"></a> 撤销行为

加入代码和已配对设备具有独立的生命周期：

- 使用或使加入代码过期会阻止使用该代码进行另一次注册；
- 这不会断开或移除已经兑换该代码的节点；
- 要撤销正常注册的机器，请删除其与 [`openclaw devices remove <deviceId>`](/cli/devices#openclaw-devices-remove-%3Cdeviceid%3E) 配对的设备。
- 环境管理的`--ephemeral`节点在其所属的云环境被破坏时会自动删除。

## <a id="troubleshooting"></a> 故障排查

如果连接 URL 报告丢失或过期，请使用 `openclaw devices join-code` 创建一个新连接。使用过的代码有意返回与未知代码相同的结果。如果本机已经兑换过，则使用保存的配对重新连接；请参阅 [ 重新连接配对节点 ](#reconnect-a-paired-node)。

如果 HTTPS 加入 URL 使用的证书不受本地机器信任，请使用包含 TLS 固定信息的直接 `oc-pair://` 或裸设置代码形式。

请参阅 [Node](/cli/node)，了解服务管理、显式连接标志、节点状态和执行审批行为。
