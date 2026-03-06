---
summary: "计划：使用 CDP 将浏览器的 act:evaluate 从 Playwright 队列中隔离，配合端到端截止时间和更安全的 ref 解析"
read_when:
  - 处理浏览器 `act:evaluate` 的超时、中止或队列阻塞问题时
  - 计划基于 CDP 的隔离执行 evaluate
owner: "openclaw"
status: "draft"
last_updated: "2026-02-10"
title: "浏览器 Evaluate CDP 重构"
---

# 浏览器 Evaluate CDP 重构计划

## 背景

`act:evaluate` 用于在页面中执行用户提供的 JavaScript。当前它是通过 Playwright
（`page.evaluate` 或 `locator.evaluate`）来运行的。Playwright 会对每个页面的 CDP 命令进行序列化，因此一个卡住或长时间运行的 evaluate 会阻塞页面命令队列，导致后续在该标签页上的操作看起来像“卡住”了。

PR #13498 添加了一个务实的安全网（有限的 evaluate 时间、中止传播及尽力恢复）。本文档描述了一个更大的重构方案，使得 `act:evaluate` 本质上与 Playwright 隔离，从而卡住的 evaluate 无法阻塞正常的 Playwright 操作。

## 目标

- `act:evaluate` 无法永久阻塞同一标签页上的后续浏览器操作。
- 超时为端到端的唯一可信源，调用方可以信赖预算。
- HTTP 和进程内调度中的中止与超时统一处理。
- 支持针对元素的 evaluate，且无需脱离 Playwright 完全重写。
- 保持对现有调用者和负载的兼容性。

## 非目标

- 使用 CDP 实现替换所有浏览器动作（点击、输入、等待等）。
- 移除 PR #13498 中引入的安全网（它仍然是有用的回退方案）。
- 引入除现有 `browser.evaluateEnabled` 限制之外的不安全能力。
- 为 evaluate 引入进程隔离（工作进程/线程）。如果本次重构后依然出现难以恢复的卡住状态，进程隔离将作为后续方案。

## 当前架构（为什么会卡住）

整体流程：

- 调用者向浏览器控制服务发送 `act:evaluate`。
- 路由处理器调用 Playwright 执行 JavaScript。
- Playwright 对页面命令进行序列化，永远不返回的 evaluate 会堵塞队列。
- 队列阻塞导致同标签页的后续点击/输入/等待操作看似挂起。

## 拟议架构

### 1. 截止时间传播

引入单一预算概念，所有逻辑均从该预算派生：

- 调用者设置 `timeoutMs`（或未来的截止时间）。
- 外层请求超时、路由处理逻辑和页面内执行预算均使用同一预算，允许序列化开销的小余量。
- 中止通过 `AbortSignal` 一致传播，保证取消一致性。

实现方向：

- 增加一个小帮手（例如 `createBudget({ timeoutMs, signal })`），返回：
  - `signal`：关联的 AbortSignal
  - `deadlineAtMs`：绝对截止时间
  - `remainingMs()`：子操作剩余预算
- 在以下地方使用该帮手：
  - `src/browser/client-fetch.ts`（HTTP 和进程内调度）
  - `src/node-host/runner.ts`（代理路径）
  - 浏览器动作实现（Playwright 和 CDP）

### 2. 独立 Evaluate 引擎（CDP 路径）

添加基于 CDP 的 evaluate 实现，不共享 Playwright 的每页面命令队列。关键特性是 evaluate 的传输层是独立的 WebSocket 连接，并且有单独附加到目标的 CDP session。

实现方向：

- 新模块，如 `src/browser/cdp-evaluate.ts`，功能包括：
  - 连接配置的 CDP 端点（浏览器级别的套接字）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 获取 `sessionId`。
  - 执行：
    - 页面级别使用 `Runtime.evaluate`，
    - 元素级别使用 `DOM.resolveNode` 加上 `Runtime.callFunctionOn`。
  - 超时或中止时：
    - 尽力发送 `Runtime.terminateExecution` 给该 session。
    - 关闭 WebSocket 并返回明确错误。

备注：

- 该方法仍在页面中执行 JavaScript，终止有可能产生副作用。优势是不会卡住 Playwright 队列，且可通过关闭 CDP session 在传输层实现可取消。

### 3. 兼容方案（元素定位的渐进实现）

元素定位是难点。CDP 需要 DOM handle 或 `backendDOMNodeId`，而当前大多数浏览器动作基于 Playwright 定位器使用快照中的 ref。

推荐方案：保留现有 refs，同时附加可选的 CDP 可解析 id。

#### 3.1 扩展存储的 Ref 信息

扩展角色 ref 元数据，选填 CDP id：

- 当前格式：`{ role, name, nth }`
- 拟议格式：`{ role, name, nth, backendDOMNodeId?: number }`

此方案保证现有基于 Playwright 的动作继续工作，且当有 `backendDOMNodeId` 时，CDP evaluate 支持使用相同的 `ref`。

#### 3.2 在快照时填充 backendDOMNodeId

生成角色快照时：

1. 按照当前做法生成角色 ref 映射（role, name, nth）。
2. 通过 CDP (`Accessibility.getFullAXTree`) 获取辅助功能树，并用同样的去重规则计算并行映射 `(role, name, nth) -> backendDOMNodeId`。
3. 将 id 合并回当前标签的存储 ref 信息。

映射失败时，保持 `backendDOMNodeId` 为 undefined，保证该特性是尽力而为且安全的切换。

#### 3.3 evaluate 行为（带 ref）

在 `act:evaluate` 中：

- 若 `ref` 存在且含有 `backendDOMNodeId`，通过 CDP 运行元素 evaluate。
- 若 `ref` 存在但无 `backendDOMNodeId`，回退到 Playwright 路径（带安全网）。

可选逃生通道：

- 扩展请求结构，允许高级调用者直接传递 `backendDOMNodeId`（方便调试），而主接口仍是 `ref`。

### 4. 保持最后的恢复方案

即使用了 CDP evaluate，还有其它方式会卡住标签页或连接。保留现有恢复机制（终止执行 + 断开 Playwright）作为最后手段，适用于：

- 旧调用
- CDP 附加受限的环境
- Playwright 异常边缘情况

## 实施计划（一步迭代）

### 交付物

- 一个基于 CDP 的 evaluate 引擎，运行在 Playwright 每页面命令队列之外。
- 单一端到端的超时/中止预算，调用者和处理器统一使用。
- 可选携带 `backendDOMNodeId` 的 ref 元数据，用于元素 evaluate。
- `act:evaluate` 优先使用 CDP 引擎，条件不满足时回退到 Playwright。
- 测试确保卡住的 evaluate 不阻塞后续操作。
- 可观测性日志与指标，暴露失败与回退情况。

### 实施清单

1. 添加共享预算帮手，将 `timeoutMs` 和上游 `AbortSignal` 统一成：
   - 单一 `AbortSignal`
   - 绝对截止时间
   - `remainingMs()` 辅助函数供下游使用
2. 更新调用路径使用该帮手，使 `timeoutMs` 在各处行为一致：
   - `src/browser/client-fetch.ts`（HTTP 和进程内调度）
   - `src/node-host/runner.ts`（节点代理路径）
   - 调用 `/act` 的 CLI 封装（增加 `--timeout-ms` 到 `browser evaluate`）
3. 实现 `src/browser/cdp-evaluate.ts`：
   - 连接浏览器级 CDP 套接字
   - `Target.attachToTarget` 获取 `sessionId`
   - 页面 evaluate 执行 `Runtime.evaluate`
   - 元素 evaluate 执行 `DOM.resolveNode` + `Runtime.callFunctionOn`
   - 超时/中止时尽力发送 `Runtime.terminateExecution` 并关闭套接字
4. 扩展存储的角色 ref 元数据，选填 `backendDOMNodeId`：
   - 保持现有 `{ role, name, nth }` 用于 Playwright 动作
   - 新增 `backendDOMNodeId?: number` 用于 CDP 元素定位
5. 快照生成时填充 `backendDOMNodeId`（尽力而为）：
   - 通过 CDP 拿 AX 树（`Accessibility.getFullAXTree`）
   - 计算 `(role, name, nth) -> backendDOMNodeId` 并合并入已存 ref
   - 若映射不明或缺失，保持 id 未定义
6. 更新 `act:evaluate` 路由：
   - 无 `ref`：总是用 CDP evaluate
   - `ref` 含 `backendDOMNodeId`：用 CDP 元素 evaluate
   - 否则回退 Playwright evaluate（仍有限制且可中止）
7. 保留现有“最后恢复”路径作为回退，非默认
8. 编写测试：
   - 持续卡住的 evaluate 可在预算内超时，且后续点击输入成功
   - 中止操作（客户端断开或超时）能取消 evaluate 并解锁后续动作
   - 映射失败时明确回退 Playwright
9. 增加可观测性：
   - evaluate 时长和超时计数
   - terminateExecution 用量
   - CDP -> Playwright 的回退率及原因

### 验收标准

- 故意卡住的 `act:evaluate` 能在调用方预算内返回，且不阻塞后续操作。
- `timeoutMs` 在 CLI、代理工具、节点代理及进程内调用中行为一致。
- 若 `ref` 能映射到 `backendDOMNodeId`，元素 evaluate 使用 CDP，否则回退路径仍有限制且可恢复。

## 测试计划

- 单元测试：
  - 角色 ref 与 AX 树节点的 `(role, name, nth)` 匹配逻辑。
  - 预算帮手行为（裕度、剩余时间计算）。
- 集成测试：
  - CDP evaluate 超时可及时返回，且不阻塞后续操作。
  - 中止能取消 evaluate 并触发尽力终止。
- 合约测试：
  - 确认 `BrowserActRequest` 和 `BrowserActResponse` 的兼容性。

## 风险及缓解

- 映射不完美：
  - 缓解：尽力映射，回退 Playwright evaluate，增加调试工具。
- `Runtime.terminateExecution` 有副作用：
  - 缓解：仅用于超时/中止场景，错误中说明行为。
- 额外开销：
  - 缓解：仅在请求快照时获取 AX 树，按目标缓存，CDP session 保持短暂。
- 扩展中继限制：
  - 缓解：页面套接字不行时使用浏览器级附加 API，保持 Playwright 路径作为回退。

## 未决问题

- 新引擎是否应配置为 `playwright`、`cdp` 或 `auto`？
- 是否打算暴露新的高级“nodeRef”格式，还是只保留 `ref`？
- 框架快照和选择器作用域快照如何参与 AX 映射？
