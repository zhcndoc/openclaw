---
summary: "Chrome 扩展：让 OpenClaw 驱动你现有的 Chrome 标签页"
read_when:
  - 你想让 agent 驱动现有的 Chrome 标签页（工具栏按钮）
  - 你需要通过 Tailscale 实现远程 Gateway + 本地浏览器自动化
  - 你想了解浏览器接管的安全影响
title: "Chrome 扩展"
---

# Chrome 扩展（浏览器中继）

OpenClaw Chrome 扩展允许 agent 控制你**现有的 Chrome 标签页**（你正常使用的 Chrome 窗口），而不是启动一个由 openclaw 管理的单独 Chrome 配置文件。

附加/分离通过**单个 Chrome 工具栏按钮**完成。

## 它是什么（概念）

包含三部分：

- **浏览器控制服务**（Gateway 或节点）：agent/工具调用的 API（通过 Gateway）
- **本地中继服务器**（loopback CDP）：在控制服务器和扩展之间桥接（默认地址 `http://127.0.0.1:18792`）
- **Chrome MV3 扩展**：使用 `chrome.debugger` 附加到活动标签页，并将 CDP 消息传输到中继

然后 OpenClaw 通过普通的 `browser` 工具接口控制附加的标签页（选择正确的配置文件）。

## 安装 / 加载（未打包）

1. 将扩展安装到一个稳定的本地路径：

```bash
openclaw browser extension install
```

2. 打印已安装的扩展目录路径：

```bash
openclaw browser extension path
```

3. Chrome → `chrome://extensions`

- 启用“开发者模式”
- 点击“加载已解压的扩展程序” → 选择上一步打印的目录

4. 固定扩展按钮。

## 更新（无需构建步骤）

扩展作为静态文件包含在 OpenClaw 版本（npm 包）中，没有单独的“构建”步骤。

升级 OpenClaw 后：

- 重新运行 `openclaw browser extension install`，刷新安装在 OpenClaw 状态目录下的文件。
- Chrome → `chrome://extensions` → 点击扩展的“重新加载”。

## 使用方法（设置 Gateway Token 一次）

OpenClaw 自带一个名为 `chrome` 的内置浏览器配置文件，目标是默认端口上的扩展中继。

首次附加前，打开扩展选项并设置：

- `端口`（默认 `18792`）
- `Gateway token`（必须与 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 匹配）

使用示例：

- CLI：`openclaw browser --browser-profile chrome tabs`
- Agent 工具：`browser`，参数 `profile="chrome"`

若想用不同名称或不同中继端口，可以创建自己的配置文件：

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

### 自定义 Gateway 端口

如果使用自定义 Gateway 端口，中继端口自动计算：

**扩展中继端口 = Gateway 端口 + 3**

例如：若 `gateway.port: 19001`，则：

- 扩展中继端口为：`19004`（Gateway 端口 + 3）

在扩展选项中配置该自动派生的中继端口。

## 附加 / 分离（工具栏按钮）

- 打开你想让 OpenClaw 控制的标签页。
- 点击扩展图标。
  - 附加时徽章显示 `ON`。
- 再次点击即可分离。

## 它控制哪个标签页？

- 它**不会**自动控制“你当前看的标签页”。
- 它只控制你通过点击工具栏按钮**明确附加的标签页**。
- 要切换控制标签页：打开另一个标签页并点击扩展图标。

## 徽章与常见错误

- `ON`：已附加，OpenClaw 可驱动该标签页。
- `…`：正在连接本地中继。
- `!`：中继不可达或未认证（最常见原因：中继服务器未运行，或者缺少/错误的 Gateway token）。

出现 `!` 时：

- 确保 Gateway 正在本地运行（默认配置），或者如果 Gateway 在其他机器，需在本机运行一个节点主机。
- 打开扩展选项页面，会自动验证中继可达性和 Gateway token 认证。

## 远程 Gateway（使用节点主机）

### 本地 Gateway（与 Chrome 同一台机器）— 通常**无需额外步骤**

如果 Gateway 与 Chrome 在同一台机器，它会在回环地址启动浏览器控制服务并自动启动中继服务器。扩展连接本地中继，CLI/工具请求发送到 Gateway。

### 远程 Gateway（Gateway 在其他机器）— **需启动节点主机**

如果 Gateway 在另一台机器，需在运行 Chrome 的机器上启动一个节点主机。Gateway 会将浏览器操作代理到该节点；扩展和中继保持在浏览器机器本地。

若有多个节点连接，可通过 `gateway.nodes.browser.node` 固定其中一个，或设置 `gateway.nodes.browser.mode`。

## 沙箱（工具容器）

如果你的 agent 会话处于沙箱环境（`agents.defaults.sandbox.mode != "off"`），`browser` 工具可能会受限：

- 默认情况下，沙箱会话通常针对**沙箱浏览器**（`target="sandbox"`），而非宿主机的 Chrome。
- Chrome 扩展中继接管需控制**宿主机**的浏览器控制服务。

选项：

- 最简单：从**非沙箱**会话/agent 使用扩展。
- 或允许沙箱会话控制宿主浏览器：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

然后确保工具策略未禁止，且（如有需要）调用 `browser` 时用 `target="host"`。

调试命令：`openclaw sandbox explain`

## 远程访问提示

- 保持 Gateway 和节点主机在同一 tailnet 内，避免将中继端口暴露给局域网或公共互联网。
- 有意对节点配对；若不希望远程控制可禁用浏览器代理路由（`gateway.nodes.browser.mode="off"`）。

## “扩展路径”工作原理

`openclaw browser extension path` 打印**已安装**的扩展文件所在磁盘目录。

CLI 故意不打印 `node_modules` 目录路径。始终先运行 `openclaw browser extension install`，将扩展复制到 OpenClaw 状态目录中的稳定位置。

若移动或删除此安装目录，Chrome 会将扩展视为损坏，直到从有效路径重新加载。

## 安全影响（必读）

该功能强大且风险较高。请视为赋予模型“在你浏览器里动手操作”的权限。

- 扩展使用 Chrome 调试 API (`chrome.debugger`)。附加后，模型可以：
  - 点击/输入/导航该标签页
  - 读取页面内容
  - 访问该标签页登录的任意会话权限
- **这不是隔离环境**，不像单独 openclaw 管理的专用配置文件。
  - 若附加到你的日常使用配置文件/标签页，即等于授权访问该账户状态。

建议：

- 优先使用专用的 Chrome 配置文件（与个人浏览隔离）来使用扩展中继。
- 保持 Gateway 和节点主机仅限 tailnet 内访问，依赖 Gateway 认证和节点配对。
- 避免在局域网（`0.0.0.0`）或公共（Funnel）暴露中继端口。
- 中继阻止非扩展来源访问，且 `/cdp` 和 `/extension` 均需 Gateway token 验证。

相关内容：

- 浏览器工具概述：[Browser](/tools/browser)
- 安全审计：[Security](/gateway/security)
- Tailscale 设置：[Tailscale](/gateway/tailscale)
