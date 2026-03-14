---
role: sqlite-state-management
status: experimental
summary: |
  OpenProse 程序的基于 SQLite 的状态管理。该方法将执行状态持久化到 SQLite 数据库中，实现结构化查询、原子事务和灵活的模式演进。
requires: sqlite3 CLI 工具在 PATH 中
see-also:
  - ../prose.md: VM 执行语义
  - filesystem.md: 基于文件的状态（默认，更具规范性）
  - in-context.md: 上下文内状态（适用于简单程序）
  - ../primitives/session.md: 会话上下文和压缩指南
---

# SQLite 状态管理（实验性）

本文档介绍了 OpenProse 虚拟机如何使用 **SQLite 数据库** 来跟踪执行状态。这是文件状态 (`filesystem.md`) 和上下文内状态 (`in-context.md`) 的一种实验性替代方案。

## 前提条件

**要求：** 必须在你的 PATH 中提供 `sqlite3` 命令行工具。

| 平台     | 安装方式                                                     |
| -------- | ------------------------------------------------------------ |
| macOS    | 预装                                                        |
| Linux    | `apt install sqlite3` / `dnf install sqlite3` / 等           |
| Windows  | 使用 `winget install SQLite.SQLite` 或从 sqlite.org 下载     |

如果 `sqlite3` 不可用，VM 将回退到文件系统状态并提醒用户。

---

## 概述

SQLite 状态提供：

- **原子事务**：状态变更遵守 ACID 原则
- **结构化查询**：查找特定绑定，按状态过滤，聚合结果
- **灵活的模式**：按需添加列和表
- **单文件便携性**：整个运行状态存储在一个 `.db` 文件中
- **并发访问**：SQLite 自动处理锁定

**关键原则：** 数据库是一个灵活的工作区。VM 和子代理共享它作为协调机制，而非严格契约。

---

## 数据库位置

数据库存放在标准运行目录中：

```
.prose/runs/{YYYYMMDD}-{HHMMSS}-{random}/
├── state.db          # SQLite 数据库（此文件）
├── program.prose     # 运行时程序副本
└── attachments/      # 大型输出文件（存储在数据库之外，可选）
```

**运行 ID 格式：** 与文件系统状态相同：`{YYYYMMDD}-{HHMMSS}-{random6}`

示例：`.prose/runs/20260116-143052-a7b3c9/state.db`

### 项目作用域和用户作用域的代理

执行作用域代理（默认）存放在每次运行的 `state.db` 中。但是，**项目作用域代理**（`persist: project`）和**用户作用域代理**（`persist: user`）必须跨运行存活。

项目作用域代理使用独立数据库：

```
.prose/
├── agents.db                 # 项目作用域代理内存（跨运行存活）
└── runs/
    └── {id}/
        └── state.db          # 执行作用域状态（随运行结束）
```

用户作用域代理使用位于用户主目录的数据库：

```
~/.prose/
└── agents.db                 # 用户作用域代理内存（跨项目存活）
```

项目作用域代理的 `agents` 和 `agent_segments` 表存在 `.prose/agents.db`，用户作用域代理则在 `~/.prose/agents.db`。VM 首次使用时初始化这些数据库，并为子代理提供正确路径。

---

## 职责分离

VM 与子代理的契约匹配 [postgres.md](./postgres.md#responsibility-separation)。

SQLite 特有差别：

- VM 创建 `state.db`，而非 `openprose` 模式(schema)
- 子代理确认消息指向本地数据库路径，例如 `.prose/runs/<runId>/state.db`
- 清理通常为执行 `VACUUM` 或删除文件，而非删除模式对象

示例返回值：

```text
Binding written: research
Location: .prose/runs/20260116-143052-a7b3c9/state.db (bindings 表，name='research'，execution_id=NULL)
```

```text
Binding written: result
Location: .prose/runs/20260116-143052-a7b3c9/state.db (bindings 表，name='result'，execution_id=43)
Execution ID: 43
```

VM 仍跟踪位置，而非完整值。

---

## 核心模式

VM 初始化以下数据表。这是一个**最小可用模式**—可自由扩展。

```sql
-- 运行元数据
CREATE TABLE IF NOT EXISTS run (
    id TEXT PRIMARY KEY,
    program_path TEXT,
    program_source TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'running',  -- running，completed，failed，interrupted
    state_mode TEXT DEFAULT 'sqlite'
);

-- 执行位置和历史
CREATE TABLE IF NOT EXISTS execution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    statement_index INTEGER,
    statement_text TEXT,
    status TEXT,  -- pending，executing，completed，failed，skipped
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT,
    parent_id INTEGER REFERENCES execution(id),  -- 用于嵌套块
    metadata TEXT  -- 针对构造特定的数据（循环迭代，平行分支等）的 JSON
);

-- 所有具名值（输入，输出，let，const）
CREATE TABLE IF NOT EXISTS bindings (
    name TEXT,
    execution_id INTEGER,  -- 根作用域为 NULL，块调用为非 NULL
    kind TEXT,  -- input，output，let，const
    value TEXT,
    source_statement TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    attachment_path TEXT,  -- 如果值太大，存储指向文件的路径
    PRIMARY KEY (name, IFNULL(execution_id, -1))  -- IFNULL 处理根作用域的 NULL
);

-- 持久化代理内存
CREATE TABLE IF NOT EXISTS agents (
    name TEXT PRIMARY KEY,
    scope TEXT,  -- execution，project，user，custom
    memory TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 代理调用历史
CREATE TABLE IF NOT EXISTS agent_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT REFERENCES agents(name),
    segment_number INTEGER,
    timestamp TEXT DEFAULT (datetime('now')),
    prompt TEXT,
    summary TEXT,
    UNIQUE(agent_name, segment_number)
);

-- 导入注册表
CREATE TABLE IF NOT EXISTS imports (
    alias TEXT PRIMARY KEY,
    source_url TEXT,
    fetched_at TEXT,
    inputs_schema TEXT,  -- JSON
    outputs_schema TEXT  -- JSON
);
```

### 模式约定

- **时间戳**：使用 ISO 8601 格式 (`datetime('now')`)
- **JSON 字段**：在 `metadata`、`*_schema` 列中以 JSON 文本存储结构化数据
- **大值存储**：如果绑定值超过约 100KB，写入 `attachments/{name}.md` 并存储路径
- **扩展表**：使用 `x_` 前缀（例如 `x_metrics`、`x_audit_log`）
- **匿名绑定**：没有显式捕获的会话（`session "..."` 未使用 `let x =`）使用自动生成名称：`anon_001`、`anon_002` 等
- **导入绑定**：使用导入别名前缀进行作用域限定：`research.findings`、`research.sources`
- **作用域绑定**：利用 `execution_id` 列—根作用域为 NULL；块调用为非 NULL

### 作用域解析查询

对于递归块，绑定作用于其执行帧。通过向上遍历调用栈解析变量：

```sql
-- 从 execution_id 43 开始查找绑定 'result'
WITH RECURSIVE scope_chain AS (
  -- 从当前执行开始
  SELECT id, parent_id FROM execution WHERE id = 43
  UNION ALL
  -- 向上遍历至父级
  SELECT e.id, e.parent_id
  FROM execution e
  JOIN scope_chain s ON e.id = s.parent_id
)
SELECT b.* FROM bindings b
LEFT JOIN scope_chain s ON b.execution_id = s.id
WHERE b.name = 'result'
  AND (b.execution_id IN (SELECT id FROM scope_chain) OR b.execution_id IS NULL)
ORDER BY
  CASE WHEN b.execution_id IS NULL THEN 1 ELSE 0 END,  -- 优先作用域绑定而非根绑定
  s.id DESC NULLS LAST  -- 优先较深入（更局部）的作用域
LIMIT 1;
```

**如果已知作用域链的简单版本：**

```sql
-- 直接查找：检查当前作用域、父作用域，再到根作用域
SELECT * FROM bindings
WHERE name = 'result'
  AND (execution_id = 43 OR execution_id = 42 OR execution_id IS NULL)
ORDER BY execution_id DESC NULLS LAST
LIMIT 1;
```

---

## 数据库交互

VM 和子代理均通过 `sqlite3` CLI 交互。

### 从 VM 端

```bash
# 初始化数据库
sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "CREATE TABLE IF NOT EXISTS..."

# 更新执行位置
sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  INSERT INTO execution (statement_index, statement_text, status, started_at)
  VALUES (3, 'session \"Research AI safety\"', 'executing', datetime('now'))
"

# 读取绑定
sqlite3 -json .prose/runs/20260116-143052-a7b3c9/state.db "
  SELECT value FROM bindings WHERE name = 'research'
"

# 检查平行分支状态
sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  SELECT statement_text, status FROM execution
  WHERE json_extract(metadata, '$.parallel_id') = 'p1'
"
```

### 从子代理端

VM 在启动子代理时提供数据库路径和指令：

**根作用域（块调用外）：**

```
你的输出数据库：
  .prose/runs/20260116-143052-a7b3c9/state.db

完成后，写入输出：

sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  INSERT OR REPLACE INTO bindings (name, execution_id, kind, value, source_statement, updated_at)
  VALUES (
    'research',
    NULL,  -- 根作用域
    'let',
    'AI safety research covers alignment, robustness...',
    'let research = session: researcher',
    datetime('now')
  )
"
```

**块调用内部（包含 execution_id）：**

```
执行作用域：
  execution_id: 43
  block: process
  depth: 3

你的输出数据库：
  .prose/runs/20260116-143052-a7b3c9/state.db

完成后，写入输出：

sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "
  INSERT OR REPLACE INTO bindings (name, execution_id, kind, value, source_statement, updated_at)
  VALUES (
    'result',
    43,  -- 限于此执行作用域
    'let',
    'Processed chunk into 3 sub-parts...',
    'let result = session \"Process chunk\"',
    datetime('now')
  )
"
```

对于持久代理（执行作用域）：

```
你的内存存储在数据库中：
  .prose/runs/20260116-143052-a7b3c9/state.db

读取当前状态：
  sqlite3 -json .prose/runs/20260116-143052-a7b3c9/state.db "SELECT memory FROM agents WHERE name = 'captain'"

完成后更新：
  sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "UPDATE agents SET memory = '...', updated_at = datetime('now') WHERE name = 'captain'"

记录此段：
  sqlite3 .prose/runs/20260116-143052-a7b3c9/state.db "INSERT INTO agent_segments (agent_name, segment_number, prompt, summary) VALUES ('captain', 3, '...', '...')"
```

对于项目作用域代理，使用 `.prose/agents.db`。对于用户作用域代理，使用 `~/.prose/agents.db`。

---

## 主线程中的上下文保存

**这非常关键。** 数据库用于持久化和协调，但 VM 仍必须维护会话上下文。

### VM 必须叙述的内容

即使有了 SQLite 状态，VM 也应叙述其对话中的关键事件：

```
[位置] 语句 3: let research = session: researcher
   正在启动会话，将写入 state.db
   [任务工具调用]
[成功] 会话完成，绑定已写入数据库
[绑定] research = <存储于 state.db>
```

### 为什么两者都需要？

| 目的                     | 机制                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| **工作记忆**             | 会话叙述（VM “记住”的内容，无需重新查询）                         |
| **持久状态**             | SQLite 数据库（可跨越上下文限制，支持恢复）                        |
| **子代理协调**           | SQLite 数据库（共享访问点）                                        |
| **调试/检查**            | SQLite 数据库（可查询的历史记录）                                  |

叙述是 VM 的“执行心智模型”。数据库是恢复和检查的“事实源”。

---

## 并行执行

对于并行块，VM 使用 `metadata` JSON 字段来跟踪分支。**只有 VM 会写入 `execution` 表。**

```sql
-- VM 标记并行开始
INSERT INTO execution (statement_index, statement_text, status, metadata)
VALUES (5, 'parallel:', 'executing', '{"parallel_id": "p1", "strategy": "all", "branches": ["a", "b", "c"]}');

-- VM 为每个分支创建执行记录
INSERT INTO execution (statement_index, statement_text, status, parent_id, metadata)
VALUES (6, 'a = session "Task A"', 'executing', 5, '{"parallel_id": "p1", "branch": "a"}');

-- 子代理将其输出写入 bindings 表（参见“来自子代理”部分）
-- 任务工具通过 substrate 向 VM 发出完成信号

-- 任务返回后，VM 标记分支完成
UPDATE execution SET status = 'completed', completed_at = datetime('now')
WHERE json_extract(metadata, '$.parallel_id') = 'p1' AND json_extract(metadata, '$.branch') = 'a';

-- VM 检查是否所有分支均已完成
SELECT COUNT(*) as pending FROM execution
WHERE json_extract(metadata, '$.parallel_id') = 'p1' AND status != 'completed';
```

---

## 循环追踪

```sql
-- 循环元数据追踪迭代状态
INSERT INTO execution (statement_index, statement_text, status, metadata)
VALUES (10, 'loop until **analysis complete** (max: 5):', 'executing',
  '{"loop_id": "l1", "max_iterations": 5, "current_iteration": 0, "condition": "**analysis complete**"}');

-- 更新迭代次数
UPDATE execution
SET metadata = json_set(metadata, '$.current_iteration', 2),
    updated_at = datetime('now')
WHERE json_extract(metadata, '$.loop_id') = 'l1';
```

---

## 错误处理

```sql
-- 记录失败
UPDATE execution
SET status = 'failed',
    error_message = '连接超时 30 秒后',
    completed_at = datetime('now')
WHERE id = 15;

-- 在元数据中跟踪重试次数
UPDATE execution
SET metadata = json_set(metadata, '$.retry_attempt', 2, '$.max_retries', 3)
WHERE id = 15;
```

---

## 大型输出

当绑定值太大，不适合数据库存储（>100KB）时：

1. 将内容写入 `attachments/{binding_name}.md`
2. 在 `attachment_path` 列储存路径
3. 将 `value` 留为摘要或空值

```sql
INSERT INTO bindings (name, kind, value, attachment_path, source_statement)
VALUES (
  'full_report',
  'let',
  '完整分析报告（847KB）- 见附件',
  'attachments/full_report.md',
  'let full_report = session "Generate comprehensive report"'
);
```

---

## 恢复执行

恢复中断运行：

```sql
-- 找当前定位
SELECT statement_index, statement_text, status
FROM execution
WHERE status = 'executing'
ORDER BY id DESC LIMIT 1;

-- 获取所有完成的绑定
SELECT name, kind, value, attachment_path FROM bindings;

-- 获取代理内存状态
SELECT name, memory FROM agents;

-- 检查并行块状态
SELECT json_extract(metadata, '$.branch') as branch, status
FROM execution
WHERE json_extract(metadata, '$.parallel_id') IS NOT NULL
  AND parent_id = (SELECT id FROM execution WHERE status = 'executing' AND statement_text LIKE 'parallel:%');
```

---

## 灵活性鼓励

与文件系统状态不同，SQLite 状态有意设计为**不那么规范化**。核心 schema 是起点。鼓励你：

- **向现有表添加列**，根据需要
- **创建扩展表**（前缀用 `x_`）
- **存储自定义指标**（时长、token 计数、模型信息）
- **为查询模式建立索引**
- **使用 JSON 函数** 处理半结构化数据

示例扩展：

```sql
-- 自定义指标表
CREATE TABLE x_metrics (
    execution_id INTEGER REFERENCES execution(id),
    metric_name TEXT,
    metric_value REAL,
    recorded_at TEXT DEFAULT (datetime('now'))
);

-- 添加自定义列
ALTER TABLE bindings ADD COLUMN token_count INTEGER;

-- 为常用查询创建索引
CREATE INDEX idx_execution_status ON execution(status);
```

数据库是你的工作空间。尽情使用。

---

## 与其他模式比较

| 方面                   | filesystem.md              | in-context.md         | sqlite.md                       |
| ---------------------- | ------------------------- | --------------------- | ------------------------------ |
| **状态位置**           | `.prose/runs/{id}/` 文件   | 会话历史               | `.prose/runs/{id}/state.db`    |
| **可查询性**           | 通过文件读取               | 否                    | 是（SQL）                      |
| **原子更新**           | 否                        | 不适用                 | 是（事务）                     |
| **模式灵活性**         | 文件结构固定               | 不适用                 | 灵活（添加表/列）              |
| **恢复**               | 读取 state.md             | 重新读取会话           | 查询数据库                    |
| **复杂度上限**         | 高                        | 低（<30 条语句）       | 高                            |
| **依赖**               | 无                        | 无                     | sqlite3 CLI                   |
| **状态**               | 稳定                      | 稳定                   | **实验中**                    |

---

## 总结

SQLite 状态管理：

1. 每次运行只用一个**单一数据库文件**
2. 提供 VM 与子代理间**清晰的职责分离**
3. 支持**结构化查询**用于状态检查
4. 支持**原子事务**确保更新可靠
5. 允许根据需要**灵活演进模式**
6. 需要使用 **sqlite3 CLI** 工具
7. 仍处于**实验阶段**，可能有变化

核心约定：VM 管理执行流程并启动子代理；子代理将输出直接写入数据库。双方保持一个原则：发生的都记录，记录的都能查询。
