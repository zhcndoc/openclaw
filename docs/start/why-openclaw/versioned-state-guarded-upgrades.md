---
summary: "数据库优先状态、模式版本契约、受保护的更新、发布通道和成熟度记分卡"
title: "版本化状态，受保护的升级"
read_when:
  - "您需要知道 OpenClaw 升级是否会破坏您的磁盘状态"
  - "您正在稳定、扩展稳定、测试版和开发频道之间进行选择"
  - "您正在部署之前评估每个表面的准备情况"
---

运行时状态是数据库优先：一个全局 SQLite 存储，每个代理一个，具有书面合同，运行时代码永远不会在活动状态下读取或写入 JSON sidecar。该合约在 CI（[ 数据库模式](/reference/database-schemas)）中进行机器检查。模式带有两地版本合约；构建拒绝打开比自身更新的数据库。 [`openclaw update`](/cli/update) 拒绝其声明的模式支持早于磁盘数据库的目标；无法对没有架构元数据的旧目标包进行预检。 [`openclaw doctor --fix`](/cli/doctor) 是文件到 SQLite 迁移的单一所有者，并为每个迁移记录一份收据。 [backups](/cli/backup) 中的 SQLite 快照使用 SQLite 的在线备份 API，并在创建和发布期间进行完整性和哈希检查。整个存档验证不会将普通文件有效负载绑定到内容哈希值；恢复永远不会发生在原地。 [重新启动恢复](/gateway/restart-recovery)在有限的尝试预算下恢复中断的轮次，并且崩溃循环断路器在抑制通道自动启动的同时保持控制平面可达。

发布通过四个渠道（稳定、扩展稳定、测试版、开发）在日历版本上进行，具有不可变的 npm 发布（[ 开发渠道](/install/development-channels)、[ 发布流程](/reference/RELEASING)）。扩展稳定是保守的轨道：更新程序重新获取并验证确切选择的包，丢失或不一致的注册表数据是一个错误，永远不会回退到 `latest`。 [完整版本Validation](/reference/full-release-validation)工作流程密封了一个不可变的执行计划工件，涵盖跨OS安装和升级、包接受、实时通道通道和性能门。发布是在 OpenClaw Foundation 身份下进行序列化和出处验证（Sigstore 证明，npm 出处）。

每个表面的准备情况已发布。 [ 成熟度记分卡 ](/maturity/scorecard) 根据可重复的 QA 检查以及经过审核的质量分数对 [280 功能领域 ](/maturity/taxonomy) 的 50 个表面进行评分，每一行都具有长期支持状态。延长稳定的答案是支持表面多长时间；记分卡回答了它的证明程度。
