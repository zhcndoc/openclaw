---
summary: "重构计划：执行主机路由、节点审批和无头运行器"
read_when:
  - 设计执行主机路由或执行审批时
  - 实现节点运行器 + UI IPC 时
  - 添加执行主机安全模式和斜杠命令时
title: "执行主机重构"
---

# 执行主机重构计划

## 目标

- 添加 `exec.host` + `exec.security` 用于跨 **sandbox**、**gateway** 和 **node** 路由执行。
- 保持默认设置 **安全**：除非显式启用，否则不允许跨主机执行。
- 将执行拆分为带有可选 UI（macOS 应用）的 **无头运行器服务** 通过本地 IPC 通信。
- 提供 **每个代理** 的策略、允许列表、询问模式及节点绑定。
- 支持与允许列表 _配合使用_ 或 _不使用_ 的 **询问模式**。
- 跨平台支持：Unix 套接字 + 令牌认证（macOS/Linux/Windows 兼容）。

## 非目标

- 不支持旧版允许列表迁移或旧版配置模式。
- 节点执行不支持 PTY/流式输出（仅聚合输出）。
- 不新增除现有 Bridge + Gateway 之外的网络层。

## 决策（已锁定）

- **配置键**：`exec.host` + `exec.security`（允许每代理覆盖）。
- **提权**：保留 `/elevated` 作为 gateway 完全访问的别名。
- **询问默认**：`on-miss`（仅未匹配时询问）。
- **审批存储**：`~/.openclaw/exec-approvals.json` （JSON 格式，不支持旧版迁移）。
- **运行器**：无头系统服务；UI 应用托管 Unix 套接字用于审批。
- **节点身份**：使用现有的 `nodeId`。
- **套接字认证**：Unix 套接字 + 令牌（跨平台）；若需要，后续可拆分。
- **节点主机状态**：`~/.openclaw/node.json`（节点 ID + 配对令牌）。
- **macOS 执行主机**：在 macOS 应用内运行 `system.run`；节点主机服务通过本地 IPC 转发请求。
- **无 XPC 辅助进程**：坚持使用 Unix 套接字 + 令牌 + 同伴检查。

## 关键概念

### 主机

- `sandbox`：Docker 执行（当前行为）。
- `gateway`：在网关主机上执行。
- `node`：通过 Bridge 上的节点运行器执行（`system.run`）。

### 安全模式

- `deny`：总是拒绝。
- `allowlist`：仅允许匹配项。
- `full`：允许所有（等价于提权）。

### 询问模式

- `off`：从不询问。
- `on-miss`：仅当允许列表未匹配时询问。
- `always`：每次都询问。

询问模式 **独立于** 允许列表；允许列表可与 `always` 或 `on-miss` 一起使用。

### 策略解析（每次执行）

1. 解析 `exec.host`（工具参数→代理覆盖→全局默认）。
2. 解析 `exec.security` 和 `exec.ask`（同级优先级）。
3. 若主机为 `sandbox`，则执行本地沙箱执行。
4. 若主机为 `gateway` 或 `node`，则在该主机应用安全 + 询问策略。

## 默认安全性

- 默认 `exec.host = sandbox`。
- `gateway` 和 `node` 默认 `exec.security = deny`。
- 默认 `exec.ask = on-miss`（仅安全允许时相关）。
- 未设置节点绑定时，**代理可定位任意节点**，但仅限策略允许。

## 配置面

### 工具参数

- `exec.host`（可选）：`sandbox | gateway | node`。
- `exec.security`（可选）：`deny | allowlist | full`。
- `exec.ask`（可选）：`off | on-miss | always`。
- `exec.node`（可选）：使用 `host=node` 时指定的节点 ID/名称。

### 全局配置键

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node` （默认节点绑定）

### 每代理配置键

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 别名

- `/elevated on` = 为该代理会话设置 `tools.exec.host=gateway`，`tools.exec.security=full`。
- `/elevated off` = 恢复该代理会话之前的执行设置。

## 审批存储（JSON）

路径：`~/.openclaw/exec-approvals.json`

用途：

- 本地策略 + 允许列表（执行主机：gateway 或节点运行器）。
- 无 UI 可用时的询问回退。
- UI 客户端的 IPC 凭证。

建议模式（v1）：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64-opaque-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny"
  },
  "agents": {
    "agent-id-1": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        {
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 0,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

说明：

- 不支持旧版允许列表格式。
- `askFallback` 仅在需要询问且无 UI 可达时生效。
- 文件权限：`0600`。

## 运行器服务（无头）

### 角色

- 本地强制 `exec.security` + `exec.ask`。
- 执行系统命令并返回输出。
- 发送 Bridge 事件标记执行生命周期（可选，推荐）。

### 服务生命周期

- macOS 使用 launchd/守护进程；Linux/Windows 使用系统服务。
- 审批 JSON 位于执行主机本地。
- UI 托管本地 Unix 套接字；运行器按需连接。

## UI 集成（macOS 应用）

### IPC

- Unix 套接字路径 `~/.openclaw/exec-approvals.sock` （权限 0600）。
- 令牌存储于 `exec-approvals.json`（权限 0600）。
- 同伴检查：仅同 UID 可连接。
- 挑战/响应机制：使用 nonce + HMAC（token, request-hash）防重放攻击。
- 短 TTL（例如 10 秒）+ 最大负载 + 速率限制。

### 询问流程（macOS 应用执行主机）

1. 节点服务从网关收到 `system.run` 调用。
2. 节点服务连接本地套接字并发送提示/执行请求。
3. 应用验证同伴 + 令牌 + HMAC + TTL，必要时显示对话框。
4. 应用在 UI 环境中执行命令并返回输出。
5. 节点服务将输出返回给网关。

若无 UI：

- 应用 `askFallback`（`deny|allowlist|full`）。

### 流程图（SCI）

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## 节点身份 + 绑定

- 使用 Bridge 配对中已有的 `nodeId`。
- 绑定模型：
  - `tools.exec.node` 限制代理访问特定节点。
  - 未设置时，代理可选任意节点（策略仍生效）。
- 节点选择解析：
  - 精确匹配 `nodeId`。
  - `displayName`（标准化匹配）。
  - `remoteIp`。
  - `nodeId` 前缀（>= 6 字符）。

## 事件

### 谁能看到事件

- 系统事件为 **每会话** ，于下次代理提示时显示。
- 存储于网关内存队列（`enqueueSystemEvent`）。

### 事件文本

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 可选输出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 传输

方案 A（推荐）：

- 运行器发送 Bridge `event` 帧：`exec.started` / `exec.finished`。
- 网关通过 `handleBridgeEvent` 转换为 `enqueueSystemEvent`。

方案 B：

- 网关中 `exec` 工具同步处理生命周期。

## 执行流程

### 沙箱主机

- 现有 `exec` 行为（Docker 或非沙箱环境）。
- 仅非沙箱模式支持 PTY。

### 网关主机

- 网关进程在自身机器执行。
- 强制执行本地 `exec-approvals.json`（安全/询问/允许列表）。

### 节点主机

- 网关调用带 `system.run` 的 `node.invoke`。
- 运行器强制执行本地审批。
- 运行器返回聚合的 stdout/stderr。
- 可选发送 Bridge 启动/完成/拒绝事件。

## 输出限制

- stdout+stderr 总合最大 **200k**，事件保留 **末尾 20k**。
- 超出截断，明确后缀（例如 `"… (truncated)"`）。

## 斜杠命令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 支持每代理、每会话覆盖；非持久，除非通过配置保存。
- `/elevated on|off|ask|full` 仍为快捷方式，等价于 `host=gateway security=full`（`full` 无需审批）。

## 跨平台方案

- 运行器服务为可移植执行目标。
- UI 可选；缺失时应用 `askFallback`。
- Windows/Linux 支持相同的审批 JSON + 套接字协议。

## 实现阶段

### 阶段 1：配置 + 执行路由

- 添加 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 配置模式。
- 更新工具链以支持 `exec.host`。
- 添加 `/exec` 斜杠命令，保留 `/elevated` 别名。

### 阶段 2：审批存储 + 网关强制

- 实现 `exec-approvals.json` 读写。
- 为 `gateway` 主机强制允许列表 + 询问模式。
- 增加输出限制。

### 阶段 3：节点运行器强制

- 更新节点运行器以支持允许列表 + 询问。
- 添加 macOS 应用 UI 的 Unix 套接字提示桥接。
- 连接 `askFallback`。

### 阶段 4：事件

- 添加节点 → 网关的 Bridge 执行生命周期事件。
- 转换为 `enqueueSystemEvent` 用于代理提示。

### 阶段 5：UI 打磨

- macOS 应用：允许列表编辑器、每代理切换器、询问策略 UI。
- 节点绑定控制（可选）。

## 测试计划

- 单元测试：允许列表匹配（glob 模式 + 大小写不敏感）。
- 单元测试：策略解析优先级（工具参数 → 代理覆盖 → 全局）。
- 集成测试：节点运行器拒绝/允许/询问流程。
- Bridge 事件测试：节点事件 → 系统事件路由。

## 潜在风险

- UI 不可用：确保尊重 `askFallback`。
- 长时间运行命令：依赖超时 + 输出限制。
- 多节点歧义：除非绑定节点或指定节点参数，否则报错。

## 相关文档

- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)
- [节点](/nodes)
- [提权模式](/tools/elevated)
