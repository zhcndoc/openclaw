---
summary: "使用主机模式 devcontainer 文件声明云项目设置和生命周期命令"
title: "云环境文件"
read_when: "您需要存储库定义的云会话设置或启动命令。"
doc-schema-version: 1
---

提交 `.devcontainer/devcontainer.json` 以自定义存储库准备和启动。 OpenClaw 支持 Dev Container 规范的主机模式子集：命令在准备好的工作空间中以工作用户身份直接在云计算机上运行。它不会启动容器。

## <a id="recipe-precedence"></a> 配方优先级

OpenClaw 从已承认的 Git 提交中选择一个配方，按以下顺序：

1. `.devcontainer/devcontainer.json`.
2. `.devcontainer.json` 位于存储库根目录。
3. 可执行文件`.openclaw/worktree-setup.sh`。
4. 内置JavaScript锁定文件检测。

Devcontainer 文件接受 JSONC 注释和尾随逗号。即使声明的文件不包含命令，它也会获胜；无效文件会报告错误而不是回退。未提交的配方不会进入共享快照。存储库命令需要管理员授权设置；显式跳过安装使用单独的快照标识。本地托管工作树保留其现有的设置行为。

## <a id="lifecycle-and-snapshots"></a> 生命周期和快照

| 属性               | 运行时间                                                | 被俘虏了？          |
| ---------------------- | ----------------------------------------------------------- | ------------------ |
| `onCreateCommand`      | 初始结帐准备，`updateContentCommand` 之前 | 文件系统结果 |
| `updateContentCommand` | 新提交的初始准备和就地刷新    | 文件系统结果 |
| `postCreateCommand`    | 注册后，第一个会话绑定到每个工作人员      | No                 |
| `postStartCommand`     | 绑定时，`postCreateCommand`（如果存在）之后          | No                 |

在同一提交中经过验证的签出会跳过准备命令。在提交刷新时，仅 `updateContentCommand` 重新运行；后备脚本和检测到的安装程序重新运行以进行自己的刷新。绑定后命令在首次打开冷机和快照分叉之前运行。唤醒空闲回收的会话会配置另一个工作线程并再次运行它们。没有用于任意外部重新启动的钩子。

每个命令接受一个 shell 字符串、一个可执行文件和参数数组或一个其命名命令并行运行的对象。一个阶段中的所有命令都必须成功。使声明的命令具有幂等性，因为中断的首次绑定可以重试它们。

`containerEnv` 和 `remoteEnv` 为生命周期命令提供文字、非秘密字符串。 `remoteEnv` 覆盖匹配的 `containerEnv` 密钥； `null` 远程值删除变量。这些值扩展了最小设置环境，并且不会传播到会话进程。不支持变量替换。

## <a id="minimal-example"></a> 最小示例

```jsonc
{
  "updateContentCommand": ["npm", "ci"],
  "postCreateCommand": "npm run build",
  "postStartCommand": "npm run dev > /tmp/project-dev.log 2>&1 &",
  "remoteEnv": { "NODE_ENV": "development" },
}
```

依赖安装在快照中是可重用的。构建和服务器在绑定后启动，因此它们可以看到会话内容。将进程启动放在 `postStartCommand` 中：快照保留文件系统状态，而不是正在运行的进程。

## <a id="ignored-properties"></a> 忽略的属性

录制的注释将忽略不支持的属性。其中包括 `image`、`build`、`dockerComposeFile`、`runArgs`、`mounts`、`remoteUser`、`features`、`hostRequirements` 和 `customizations`。 OpenClaw 不安装开发容器功能。请参阅上面的 [ 支持的字段 ](/gateway/cloud-workers/environment-file#lifecycle-and-snapshots) 和下面的 setup-secret 请求，而不是假设完整的 [Dev 容器规范 ](https://containers.dev/implementors/json_reference/) 适用。

## <a id="built-in-detection"></a> 内置检测

如果没有 devcontainer 文件，可执行文件 `.openclaw/worktree-setup.sh` 在捕获之前运行。两者都没有，OpenClaw 使用第一个匹配的锁定文件：

| 锁文件                  | 准备                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm-lock.yaml`          | 启用用户可写的 Corepack 垫片，然后 `pnpm install --frozen-lockfile`                                        |
| `yarn.lock`               | 启用用户可写的 Corepack 垫片，然后启用 Berry 的 `yarn install --immutable` 或 Classic 的 `--frozen-lockfile` |
| `package-lock.json`       | `npm ci`                                                                                                          |
| `bun.lock` or `bun.lockb` | `bun install --frozen-lockfile`，或者当 Bun 不存在时跳过并注释                                           |

Yarn的`packageManager`专业选择Berry（2+）或Classic；如果没有它，`.yarnrc.yml` 选择 Berry。没有可识别的锁定文件意味着没有依赖项设置。检测本身不安装Node或Bun； Linux [工具链引导程序](/gateway/cloud-workers/setup-and-bundle-installation#automatic-linux-node-toolchains)单独提供Node。

检测到 pnpm 和 Yarn 安装会抑制 Corepack 的下载提示，并且不会在 `package.json` 中自动固定 `packageManager`。

检测到失败的安装会记录原因和有限的输出，跳过该运行的捕获，并让会话冷启动。声明失败的命令或后备脚本会停止调度。更改配方会改变快照兼容性；参见[温馨图片](/gateway/cloud-workers/warm-images)。

## <a id="setup-secrets"></a> 设置秘密

devcontainer `secrets` 映射最多可以请求 16 个 POSIX 环境名称，以及可选的 `description` 和 `documentationUrl` 元数据。例如，`"secrets": { "NPM_TOKEN": { "description": "Private registry access" } }` 从所选配置文件的运营商批准的 `settings.setupSecrets` 地图中请求 `NPM_TOKEN`。存储库无法选择存储条目、值或目标；未映射的名称在命令运行之前会失败。

[在网关上配置设置机密](/gateway/config-cloud-workers#setup-secrets)。配置文件设置、存储库准备和 create/start 后命令接收不透明占位符。受保护的出口仅替换每个机密的绑定 HTTPS 主机的凭证。批准的秘密和代理设置会覆盖文字配方环境值。

这需要协调器拥有的 Linux 租约、用于受保护存储库准备的已知机器类以及 Crabbox 的本机出口助手。不可用的支持明显失败，没有明文回退。当生命周期命令完成时访问结束，因此分离的服务器无法保留它。秘密不会禁用快照。
