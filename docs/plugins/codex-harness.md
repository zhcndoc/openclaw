---
doc-schema-version: 1
summary: "通过官方 Codex 应用程序服务器工具运行 OpenClaw 嵌入式代理"
title: "Codexharness"
read_when:
  - "你想使用官方 Codex app-server harness"
  - "你需要 Codex harness 配置示例"
  - "您需要明确的 Codex 运行时策略和后备规则"
---

官方 `codex` 插件运行嵌入式 OpenAI 代理，通过 Codex 应用程序服务器而不是内置的 OpenClaw harness。 Codex 拥有低级代理会话：本机线程恢复、本机工具延续、本机压缩和应用程序服务器执行。 OpenClaw 仍然拥有聊天频道、会话文件、模型选择、OpenClaw 动态工具、批准、媒体交付和可见的转录镜像。

## <a id="shared-output-projection"></a> 共享输出投影

Codex 使用共享的本机harness投影所有者来进行有界工具输出、属性助手和工具消息以及演示回调结算。共享结算所有者保留回调订单并在终端交付之前加入待处理的演示工作。预计耗尽将在尝试取消和结算截止日期内保留。

Codex 适配器保留本机项目身份、协议解析、批准、挂钩处理和转录本来源。构造的消息通过现有的作用域转录 API 进行持久化；共享投影助手不拥有存储空间。

在 `initialize` 期间，OpenClaw 使用 `capabilities.optOutNotificationMethods` 在未使用的应用程序服务器通知到达传输和 JSON 解码器之前抑制它们。这包括累计转弯差异；文件更改项目仍然包含单独的更改。插件的通知策略拥有确切的方法列表。转弯和项目生命周期、记录、使用、批准和目录通知保持启用状态。一些未预测有效负载的事件仍然带有进度：MCP 进度、流式补丁更新、推理部分标记和模型元数据可防止本机工作出现停滞。终端交互还通知进程清理。这些通知保持启用状态。无法识别可选功能的旧应用程序服务器会忽略它；正常的最低版本检查仍然适用。

本机会话目录为每个 Codex 主目录保留一个常驻索引，在代理、工作目录过滤器、搜索和页面之间共享。列表通常会过滤并限制页面显示内存中的行。它们不会在正常侧边栏轮询间隔内过期或重新启动本机发现。行发布维护符合条件的显示行的一种排序视图，并准备其大小写标题文本。行更改不会使下一次轮询重建或对清单进行排序。页面选择在找到其行和延续后停止；实时状态和工作区设置仍然适用于每页。几乎没有匹配项和向后导航的搜索仍然可以检查保留的库存，但不会分配其过滤副本。这个仅内存边界是本地驻留查询。一旦其元数据准备好，网关还会从其驻留会话行投影中读取会话条目；突变可能需要在交付之前刷新精确的关键元数据。目录请求不会准备不相关的会话显示行，并且共享和采用检查在每次交付之前仍然使用当前元数据。仅显示目录刷新保留准备好的元数据选择；存储条目、身份和拓扑更改仍然使它们无效。本机采用绑定仍然使用其存储所有者，配对节点枚举可以使用网络 I/O. 预览仍然限制为 500 个字符；本机水合和溢出请求要求每页最多 16 个线程。 Codex `thread/list` 没有预览截断或排除选项，因此连线 JSON 仍然可能很大。在解析 JSON 之前，超过 8 个 MiB 的目录响应失败。本机列表将超大页面减半，并在原始请求截止日期内重试相同的光标，在该居民家庭的生命周期内保留较小的页面限制。如果单个线程仍然超过 8 MiB，则主机报告错误并等待 15 分钟，然后再尝试进行另一次本机列表；在退避期间重复读取重用该错误而不重复其后台警告。减少该线程的过大预览以允许发现恢复。每个本地主机都有一个八秒响应预算，涵盖所有页面读取和采用预测，与配对节点响应预算相匹配。健康的兄弟姐妹仍然回来；后台原生水合作用可以继续加温下一个请求。完整的目录 `thread/list` 页面和最多 64 个 KiB 的仅元数据 `thread/read` 响应将被内联解析和投影，从而避免启动工作程序以进行小型目录刷新。较大的响应使用其应用程序服务器客户端拥有的工作人员。两条路径应用相同的投影。标准输出读取器在传递稍后的响应或通知之前等待压缩结果。它将较大的响应作为字节传输，一次接受一项工作任务，并在该任务运行时暂停传输。格式错误的 JSON 帧会生成经过编辑的诊断信息并被丢弃；随后的有效帧正常继续。本机控制读取、正常流通知和完整历史记录读取保留其进程内解码器。 Control 读取保留完整的本机元数据，包括模型选择和直接输入功能；转录本消费者需要完整的本地原材料。两个路径都应用现有的前缀优先预览选择器和 500 个字符的显示限制。未更改的背景行可以在交付前重复使用常驻预览。大型本机有效负载及其临时对象保留在工作线程中。元数据读取保留精确的工作目录和本机历史分页模式。一旦本机元数据确认临时线程，它们就会被排除，因此在后台刷新挂起时，关闭短暂的帮助器不会丢失排除。新近度、暴露的时间戳关系中的本机位置和线程 ID 形成稳定的排序和不透明的延续键。初始本机位置保留协议舍入为秒的亚秒顺序。未更改的行在后台刷新时保持其位置，因此现有游标不会重复或跳过它们。新发现的或新活动的行在现有时间戳关系之前接收新位置，从而保留每个发现批次内的本机顺序。当观察到的回合开始的新近度落在与早期活动相同的暴露时间戳秒内时，它也会收到一个新位置。如果每个较早的匹配行都消失，则向后导航将返回第一个剩余的匹配页面。空的已知前缀在水合作用不完全时保留向前延续。

保留的窗口不是发现限制。一旦主目录达到 20,000 条保留行，最近未过滤的页面仍会使用内存。保留边界处的分页、工作目录查询和标题搜索使用权威的本机纯数据库页面，包括内存中不存在的会话。这些请求可能会更慢。每个回退请求最多保留一个 16 行本机页面。搜索、排除填充以及任何嵌套成员资格、状态或后代读取共享一个 20 次读取预算和现有请求截止日期，包括跨调度程序暂停。当还有更多发现时，该请求返回不透明的延续。即使部分搜索页面为空，也可以继续分页。本机光标保留本机排序和向后导航。如果驻留到本地的转换因并发本地突变而失去锚点，它会报告刷新错误，而不是默默地结束发现。快照会记住保留的窗口可能不完整。

搜索和托管会话排除填充每个请求最多检查 20 个常驻页面。如果达到该限制，结果将保留一个不透明的连续游标，以便下一个请求可以找到以后的可见匹配项。完全由驻留窗口提供的查询不执行本机读取；溢出发现是显式异常。

当整个前台回退请求完成时，源回退就稳定下来，包括带有延续的有界部分结果。成功的中间页面不会清除之前的失败。失败的恢复检查会提前现有的退避计划；放弃请求会释放其检查，而不记录新的主机故障。后台水合作用保持其单独的分组尝试，并且可以在不消耗前台请求预算的情况下完成任务。

房屋根据第一个授权目录请求进行水合，包括明确配置的房屋。插件激活不会为配置的代理队列启动仅目录应用程序服务器。没有有效、完整保存快照的主页会在本机 `thread/list` 页面上行走一次，在页面之间产生变化。渐进式列表立即为常驻行提供服务。如果本地主目录在 250 毫秒后仍在加载，则列表会将该主机返回为待处理状态，并保留先前显示的行；现有进度回调在准备好时发布其页面或错误。页面制作者和出版物仍归列表后台完成所有。一次性列表、特定于主机的查找和分页等待可用的本机页面或确认的空清单最多五秒（或配置的应用程序服务器请求超时，如果更短）。该单个请求预算还包括加载保存的状态。部分结果带有不透明的连续光标；赶上发现的延续等待其请求预算内的下一页。如果在截止日期前发现仍未完成，主机会报告加载错误并要求调用者重试。共享水合作用在后台继续进行。部分或无效的已保存缓存会在显示其行之前重建，并且初始重试会保留连续游标中已使用的位置。该索引通过 OpenClaw SQLite 数据库中的插件状态保留可重构的显示行和文件指纹。有效的完整快照可在没有本机请求的情况下提供最近的未经过滤的页面，包括在远程应用程序服务器上。后台工作在快照恢复后协调更改的文件和本机元数据。仅数据库本机元数据遍历可恢复网关停止时所做的更改。完整的安全步行将在 15 分钟后到期，并在下一次常驻目录读取时在后台运行，包括重命名、Git 分支和其他显示的元数据，以及本机恢复后选定的推出路径。空闲目录不会重新列出本机历史记录，空闲间隔后的第一个常驻读取可以在遍历完成之前返回缓存的行。即使本机活动时间戳不更改，也会应用元数据更改和显式清除。重叠事件、快照恢复和后台页面是最好的努力：稍后完成可以暂时替换较新的显示元数据，直到下一个事件或协调。这些合并的后台行走重复使用未更改行的预览，并且不要求 Codex 扫描或修复卷展栏。对完整快照的请求永远不会等待这些刷新。当索引不完整或不可用时，仅本地数据库响应可以省略现有文件，因此仅省略不会删除本地行；已验证的文件消失和显式生命周期事件本身的删除。 Loaded/active 状态具有单独的仅内存生命周期。对于每个线程，最多 64 个本机连接可以支持相同的当前状态。关闭一个连接或接收其 `notLoaded` 状态仅撤回该连接的观察；不相关的助手无法清除另一个打开的连接观察到的活动。重新启动后或最终观察连接关闭时，状态重置为 **Stored / 活动未知**，直到新的本机事件或元数据提供当前状态。溢出页面使用相同的源拥有状态。关闭连接的延迟响应无法恢复其活动状态。不会将本机部署或成绩单复制到状态数据库中。实时工作区和模型提供程序设置也保留在内存中，每行最多有 64 个支持本机连接。设置通知和成功的恢复确认会立即更新此叠加层； cwd 过滤和显示都使用它，包括溢出页面。当存在实时 cwd 设置时，应用它们后会溢出发现过滤器，而不是依赖于存储的本机 cwd。本机元数据刷新无法覆盖覆盖，关闭其最后一个支持连接或接收该连接的 `notLoaded` 事件将恢复存储的元数据。恢复发布使用响应的当前 cwd，该 cwd 可能与线程的持久 cwd 不同。对于没有本地文件系统访问权限的远程应用程序服务器，保存的快照可立即使用，并且后台本机行走可协调在网关停止或其应用程序服务器连接不可用时所做的更改。完整的安全步行将在 15 分钟后到期，并根据常驻目录需求协调远程成员资格和元数据。未更改的显示行在交付前重用其有限的驻留预览。未更改的行不会重写为 SQLite。

本机启动、元数据刷新、重命名、存档、删除和更改的文件指纹会在下一个 30 秒的时间间隔内合并增量本机检查。它按新近度降序读取仅数据库页面，并在整个页面使驻留元数据保持不变或达到 20,000 行保留限制后停止。比较包括时间戳、所选路径、指纹和有界显示元数据；暴露的时间戳关系保持其现有的顺序。未访问的尾部永远不会被视为已删除。如果没有活动，蜱虫不会发出本机请求；本地文件安全扫描保持其自己的 15 分钟周期。这些检查在 JSON 解码后重用现有的预览缓存；他们通过请求更少的页面来减少线路解析。

已检查前缀之外的静默更改（包括保留时间戳的元数据编辑和远程删除或存档）将出现在常驻目录需求之后的下一次成功的完整安全行走中。本地文件消失按其独立的15分钟周期进行检查；仅本机数据库遗漏仍然无法删除本地行。本地步行在上次步行尝试后 15 分钟到期，并开始读取后续的驻留目录。本机支持的溢出请求不会启动第二次完整遍历。失败的本地遍历记录其错误并等待下一个安全间隔和目录需求，受到源回退的影响；它不会在空闲滴答或每次繁忙的目录读取时重试。文件扫描保留其独立的截止日期和失败处理。通知和确认的目录操作继续立即更新行。

本机生命周期通知会更新受影响的线程，成功的目录归档会立即隐藏其行。轮次开始和完成合并单线程元数据刷新，因此正在运行的轮次在完成之前会提高新近度。当观察客户端关闭时，针对该客户端的排队读取将停止；中断的读取日志表明其元数据刷新被推迟，以便由当前目录所有者自动恢复，并保留原始原因。真正的读取、协调和存储失败仍然会记录后台更新警告。观察并不能让退休的客户活下去。启动扫描和 15 分钟安全扫描可发现外部部署更改。每个居民家庭在 256 个监视日目录中缓存最多 20,000 个指纹。目录身份和时间戳检测替换和成员资格更改；文件更改通知使就地追加的包含目录无效。未更改的目录会重复使用其指纹，而无需说明每次推出的情况。不可监视的目录、监视程序故障和超出缓存范围的目录使用完整的统计扫描。重新启动会重建此仅内存缓存，而退休家庭会关闭其观察者。在 macOS 上，观察者布防后的完整读取会在指纹重新使用之前关闭其启动通知间隙。仍会枚举父目录以发现新的日子。有限批次之间的扫描、快照恢复和协调产量。扫描流式传输目录条目并保留最多 20,000 个候选指纹，同时单独检查驻留路径是否存在。仅读取已更改或新的文件：普通卷展的头部和尾部各最多 128 个 KiB，或有限的 128 个 KiB 压缩头。缺失的第一用户预览将一直缺失，直到后来的更改使其可被发现。当卷展栏没有标题时，会保留本机标题。无法到达第一条用户消息的有界读取会保留其先前已知的预览。不可变、未修改的部署不会导致内容读取。仅文件行在本机元数据到达之前保持临时状态。本机发布后，更改的卷展栏标题无法替换选定的工作区或本机显示元数据和 `updatedAt`。更改的选定文件可以刷新其有限的第一用户预览；错过它的有限读取会保留已知的预览。显式本机空预览会清除存储的后备。即使在暴露的时间戳一秒内，Empty/nonempty 预览过渡仍然可见。仅从已解析的回合启动事实中扫描提前的新近度。该权限标志在 SQLite 恢复后仍然存在；没有它的过时缓存行将在补水之前在后台被丢弃和修剪。名称、状态和实时设置观察结果与文件元数据分开存储。重叠更新是尽最大努力；本机响应可以暂时替换较新的文件更新或恢复已删除的显示行，直到下一次协调。即使文件大小和修改时间保持不变，中断的更新和暂时的文件读取失败仍然可以进行下一次扫描。普通和压缩部署共享本机逻辑 `.jsonl` 标识；当两种表示形式都存在时，扫描仪更喜欢纯文件。 Codex 拥有选定的转出路径。在文件系统扫描期间，早期恢复中保留的文件无法替换当前会话的路径或元数据。

每个家庭最多保留20,000条显示行、20,000条实时状态记录、20,000条实时设置记录、20,000条姓名记录和20,000条扫描指纹，与现有的Codex托管线程上限相匹配；逐出首先删除最旧的归档行，然后删除最旧的剩余行。行驱逐保留独立限制的实时状态和设置，同时它们的支持本机连接保持打开状态。驱逐仅删除缓存的元数据：较旧的会话仍然可通过本机 paging/search 发现并可由 ID 读取。初始和完整的安全遍历完成分页，但超出驻留限制的行将在本机响应元数据投影或预览清理之前被丢弃。本机请求使用 16 行页面，分页继续完成。步行期间最多会记住 20,000 个分离的本机光标。恢复完整快照时，适用相同的存档最旧行限制。不完整的快照仍然无法建立可分页的本机前缀。插件状态也有其共享容量限制。持久性失败使实时驻留视图可用并被记录；丢失的完整快照会在重新启动时重建。派生缓存不会添加任何数据库架构版本更改。快照读取失败会导致该索引生命周期的持久完整性失效；本机水合在内存中仍然可用，并且下一次成功重新启动会枚举并修剪未读的陈旧密钥。缓存不会更改本机会话文件、更新迁移或回滚。精确线程请求使用新的本机元数据。每个远程资格检查（包括常驻缓存命中）都会验证权威的非存档成员资格，因为本机 `thread/read` 可以返回存档线程。这些检查使用现​​有的请求截止日期，没有保留行或页数截止日期；配对节点精确查找遵循现有截止日期的延续。网关聚合仅合并并发请求，因此完成的聚合响应不会延迟下一次轮询的驻留更改视图。当交付等待新的身份事实时，进度会保留每个选定目录和观察到的主机的最新更新。它发出单独的单主机帧；保留的进度与不同的主机有关，而不是与更新的数量有关。

每个家庭的行和簿记限制是独立的。线程标识符限制为 256 个 UTF-16 代码单元，路径和工作目录限制为 4,096 个，显示元数据和预览限制为 500 个，状态限制为 64 个，活动标志限制为 16 个条目（共 128 个）。保留的字符串与较大的本机输入字符串分离。预览解码保留其现有的 UTF-8 替换行为。事件调度和并发单线程投影各自最多允许 20,000 次操作；突变、过时的清理键和待处理的持久性写入也有 20,000 个条目的上限。持久性保留一项额外的完整标记操作和一项正在进行的写入。溢出会保留已承认的写入，使完整标记无效，并记录警告；居民查询仍然可用。溢出后，定期协调会继续刷新本机元数据。

这些是有效负载限制，而不是关于总 JavaScript 堆或网关 RSS 的承诺。对于每个字符串的最大长度和每个 UTF-16 代码单元两个字节，以下保守容量适用。 490 列假定每个命名结构中有 490 个占用的条目；具有 490 个当前行的主目录仍可以有 20,000 个历史字段或队列条目。当这些独立字段和扫描路径索引已满时，已确定的字符串有效负载的边界为 473.566 MiB（490 个当前行）或 993.385 MiB（20,000 行）。这些数字不包括主动工作和 object/engine 开销。监视目录缓存还可以保留 20,000 个转出路径（最大字符串长度为 156.250 MiB）和 256 个目录键（2 MiB）。不变的世代与扫描结果共享指纹对象；这些是保守的独立界限。

| 保留的字符串有效负载                        | 490 条记录 | 20,000 个条目 |
| ---------------------------------------------- | ----------: | -------------: |
| 显示行（每行 12,469 个代码单元）          |  11.654 MiB |    475.655 MiB |
| 准备好的标题搜索（最多 1,500 个代码单元） |   1.402 MiB |     57.220 MiB |
| 名称、状态和设置记录在一起    |   7.454 MiB |    304.260 MiB |
| 生成一次扫描路径                       |   3.828 MiB |    156.250 MiB |
| 本机线程 DTO 等待投影          |  13.569 MiB |    553.856 MiB |
| 突变标识符                           |   0.239 MiB |      9.766 MiB |
| 清理或持久化密钥（512 字节上限） |   0.479 MiB |     19.531 MiB |

标题搜索界限允许区域设置大小写折叠来扩展 500 个代码单元的显示标题。该派生文本仅存于内存中，并会被其驻留行替换或删除；它永远不会保留在目录快照中。

本机遍历和文件扫描都可以保留较旧的行快照，最多添加两代行。挂起的持久性可以保留另一行生成以及一个正在进行的行。活动事件投影可以暂时保存两个有界本机 DTO 代和一个投影行。文件货币保留了以前和新的指纹代号以及存在密钥；数组和映射共享其引用的 row/string 值。即使在行数较少的家庭中，本机游标集也有自己的 156.250 MiB 最大字符串容量。状态和设置每个条目最多保留 64 个被动源引用（两个完整索引中的 2,560,000 个引用）。对象、映射、数组、promise、分配器和引擎开销、传输缓冲区以及单独的托管 thread/provenance 缓存不在这些字符串有效负载数字之外。

通用插件状态 `entries()` API 在目录可以验证或限制其行之前对整个命名空间进行解码。在 JavaScript 扩展之前，其 1 MiB 通用值限制允许 19.532 GiB 的序列化值用于 20,001 个条目。驻留限制器限制所承认的结果，而不是该预解码峰值。正常的目录写入仅包含更小的有界行形状；解决通用峰值需要分页状态 API。

保存为 `.txt` 附件的粘贴文本由 OpenClaw 提取，并作为不受信任的外部内容包含在当前回合中，但受现有文件提取限制的约束。提取的附件在模型上下文中使用发件人的文件名，即使存储或暂存的副本具有生成的名称也是如此。这也适用于已采用和分叉的具有锁定模型选择的 Codex 会话。图像通过 Codex 的本机图像输入继续。

对于具有文件读取权限的未沙箱本地 Codex 进程，OpenClaw 还提供已验证的已保存文档路径。当内联提取有界时，Codex 可以处理完整的文件。 OpenClaw 将路径添加到允许的本机输入，而不更改其存储的附件引用或转录文本。如果路径注释无法满足本机输入预算，OpenClaw 会忽略它并保留原始请求和内联附件上下文。 JSON 转义在选择技能或插件时保留附件元数据中的提及字符，同时保留解码的文件名和路径。 Codex 将该输入保留在其自己的本机对话历史记录中。路径注释标识一个文件；后期仍沿用现有的执行和工具策略准入。这不会扩展仅限工作区的策略或将网关路径暴露给远程应用程序服务器。

远程 Codex 应用程序服务器可以在与网关不同的计算机上运行。设置 `remoteWorkspaceRoot` 以验证远程工作区附件路径。 OpenClaw 使用固定的无外壳 `command/exec` 读取器通过现有应用程序服务器连接传输权威附件字节。读取器拒绝符号链接，在分配之前强制执行文件和响应大小限制，并在通道传递之前暂存不可变的网关管理的媒体，而不需要共享或同步文件系统。 Codex 图像直接从类型化的应用程序服务器事件具体化。仅保存路径图像使用相同的有界远程读取器。上传始终使用网关配置的通道标识和请求超时。

使用标准 OpenAI 模型参考，例如 `openai/gpt-6-astra`。请勿配置旧版 Codex GPT 参考。将OpenAI代理授权订单放在`auth.order.openai`下。旧版 Codex 身份验证配置文件 ID 和旧版 Codex 身份验证订单条目由 `openclaw doctor --fix` 修复。

如果未设置 provider/model 运行时策略或 `auto`，则仅 `openai/*` 前缀永远不会选择此harness。 OpenAI 可以仅针对确切的官方 HTTPS 平台响应或 ChatGPT 响应路由隐式选择 Codex，而无需重写提供者请求。有效的模型范围的 `params.fastMode` / `params.fast_mode` 值和有效的截止键是类型化的代理运行时控件，因此它们不计为创作的提供程序请求参数或自行选择运行时。请参阅 [OpenAI 隐式代理运行时](/providers/openai/runtimes#implicit-agent-runtime)。如果 Codex 在平台与 ChatGPT 路由已知之前拥有身份验证，则 OpenClaw 仍然要求每个候选路由声明 Codex 兼容性。仅本机身份验证所有权永远不会绕过该路由检查。

当没有 OpenClaw 沙箱处于活动状态时，OpenClaw 启动 Codex 应用程序服务器线程，并启用 Codex 本机代码模式（默认情况下仅代码模式保持关闭），因此本机 workspace/code 功能与通过应用程序服务器路由的 OpenClaw 动态工具一起保持可用`item/tool/call` 桥。普通的 OpenClaw 沙箱或受限工具策略会禁用本机代码模式，除非您选择进入实验性沙箱执行服务器路径。有效的工具配置文件必须允许所有本机 shell 和文件系统功能：`coding` 和 `full` 允许，而 `messaging` 和 `minimal` 禁用本机表面。代理和提供商配置文件覆盖以及显式工具限制仍然适用。

选择托管 GitHub 身份还使用 OpenClaw 的主机拥有的工具，而不是本机代码模式。内置运行时使用的同一执行所有者在子启动时绑定选定的配置文件，保留批准和调用者生命周期检查，并报告不可用的配置文件，而无需回退到本机 GitHub 身份验证。其他工具和对话仍然可用；身份发现不会阻止轮启动。重新连接或更改“设置”中的 GitHub 身份即可恢复。如果未选择托管标识，本机代码模式和 shell 默认值将保持不变。普通的配对节点执行保持节点本地身份验证：网关 GitHub 选择和命令批准永远不会将该凭证导出到节点。

当沙箱禁用本机表面时，允许的 shell 命令通过 `sandbox_exec` 仍然可用。拒绝 `process` 会删除 `sandbox_process` 和后台延续，而 `sandbox_exec` 在现有超时、沙箱后端和工作区访问策略下运行至完成。

当延迟工具或本机委派可用时，普通线程会收到直接调用列出的工具的指导，并将 `tool_search` 用于未列出的工具。对于 `tool_search` 不可直接调用的情况（例如，其元数据选择仅代码模式执行的模型），他们保留 `exec` / `ALL_TOOLS` 后备，但被告知永远不要使用 `exec` 查找列出的工具或重复已完成的调用。配置的仅代码模式线程接收原始 `exec` / `ALL_TOOLS` 发现指南。

当 Codex 仅允许托管挂钩并且无法安装本机进程准入挂钩时，沙箱也会使用这些工具。 OpenClaw 在准备工具目录和提示之前选择此现有执行路径。需要其他强制执行本机钩子的现有策略仍然需要其正常的预检才能通过。

sandbox exec-server 选项不会绕过这些工具限制。配对设备或云工作人员上的 Node- 支持的 `remote-exec` 改为使用其放置拥有的环境，而没有该实验标志。完成项目准备工作的专用云工作人员会保留绑定的工作区和 `HOME` 路径，因此本机命令可以重用设置缓存。节点执行服务器仍然为每个连接使用单独的临时 `CODEX_HOME`。结束连接会删除 Codex 状态并保留准备好的项目主目录。

有些展示位置需要本机执行。当 Node- 支持的 `remote-exec` 无法在没有本机工具的情况下运行时，它们会拒绝有限的配置文件。当应用策略需要替换外部拥有的线程时，本机拥有的附加 Codex 线程也可以拒绝受限转向。这可能会在升级后中断现有对话。要保留有限的配置文件，请使用具有兼容执行环境的网关管理的对话或运行时。如果需要本机 shell 和文件系统访问，操作员可以选择 `coding` 或 `full`。其他明确的工具和沙箱限制仍然适用；显式的有限工具白名单仍然会阻止本机执行。 OpenClaw 不会自动扩大工具访问范围或替换外部拥有的螺纹。

计划和其他运行时工具白名单使用与 OpenClaw 工具相同的别名、组和通配符，包括 `cron`、`group:runtime` 和 `web_*`。显式的空运行时白名单会禁用工具。在 OpenClaw 将工具注册到 Codex 之前，独立限制必须全部允许。

符合条件的本机 shell 轮次还保留 `gateway_exec` 和 `gateway_process` 作为不同的 OpenClaw 执行路径。仅当命令需要 OpenClaw- 托管网关环境访问（包括机密存储代理可读环境值或受保护的出口哨兵）时，才使用 `gateway_exec`。它固定到网关主机并遵循 OpenClaw 执行策略。 `gateway_process` 使用现有的每会话 OpenClaw 进程范围进行后台跟踪。对于普通的本地工作，更喜欢 Codex 原生 shell。

本机 shell 命令可以在退出之前生成会话句柄。当成功的转弯结束且该确切命令仍归本机线程所有时，其工具行记录 **Outcomeknown** 并解释该进程仍在运行。这不是命令的成功或失败。使用本机进程等待工具收集保留的句柄以获得其输出和退出代码。延续记录结果而不重写先前回合的快照。已确认的后台命令会保持其本机线程订阅，直到匹配完成或源关闭，包括禁用沙箱执行服务器时。空闲对话驱逐不会中断该工作。现有的未知结果审计诊断仍然存在；取消和没有确认的实时所有者的命令保留其失败处理。

停止活动的 Codex 运行会中断其运行。在父代屈服于本地子代之后，Stop 等待其承认的后代到达真正的终端事件并完成完成结算。在 Stop 期间成功完成的子项将保留其结果。停止不会取消同级运行或替换会话生成。停止解决后，您可以在同一聊天中发送另一条消息，而无需重新连接。 Stop 还会使已经中断的子进程退出，而不会再次中断其已完成的回合，因此该子进程无法使其父会话保持阻塞状态。如果其先前的本机进程已经关闭，Stop 会取消等待运行，而无需等待物理退出。替代作家仍在等待该退出。会话范围的停止保留调用者的请求所有权、受保护的运行和旁路运行限制。在其前台父进程完成后，本机后代保留主机捕获的请求保管权；如果没有该保管，恢复的观察结果无法单独从会话或运行 ID 获得取消权限。

使用 OpenClaw 沙箱执行服务器，清理会停止该轮允许的具体进程，并在同一重用线程中保留独立的后台工作。每个进程在结算之前都保留其原始来源，包括在前台完成之后。访客访问权限到期和撤销会停止访客的保留进程，而不会中断以后的维护人员轮流。本机命令准入和后续进程输入重新检查原始来源；撤销后清理仍然可用。

其他本机执行模式保留线程范围的后台终端清理。其他 Codex 线程和故意后台的 `gateway_process` 作业不受影响。如果本机终端清理失败，则运行会报告错误，而不是默默地声明清理成功。在开始更多工作之前检查该线程的运行终端。这使用 Codex 的终端所有权。它不保证清除故意脱离该所有权的命令。

在默认 `tools.exec.host: "auto"` 且没有活动 OpenClaw 沙箱的情况下，当连接的节点支持 `system.run` 时，Codex 也会收到 `node_exec`。离线配对的设备和不带 shell 支持的设备不会公开此工具。配置节点后，该绑定必须解析为合格的节点。本机 shell 保留在 Codex 应用程序服务器主机和工作区上（默认 stdio 部署的网关本地）。 `node_exec` 选择支持 `system.run` 的唯一连接节点，或者当有多个符合条件时需要名称或 ID。它使 OpenClaw 的节点批准策略保持有效，并等待远程命令完成。远程节点后台追踪不可用。如果有限运行时白名单禁用本机代码模式并在没有执行环境的情况下离开，OpenClaw 会保留其策略过滤的 `exec` 和 `process` 工具，而不是用于直接、非沙盒执行。

当 `tools.exec.host: "node"` 或 `/exec host=node` 将节点设为会话默认值时，OpenClaw 会隐藏 Codex-native shell，并仅在节点目标符合条件时公开 `node_exec`。如果不可用，请重新连接配置的节点或显式更改执行主机。 OpenClaw 不会默默地回退到应用程序服务器或网关计算机。

当活动的 OpenClaw 沙箱、节点默认执行策略、内存刷新限制、工具 allow/deny 策略或 `codexDynamicToolsExclude` 会使网关主机访问绕过时，`gateway_exec` 不会暴露。秘密存储环境值绝不会进入 Codex 应用程序服务器进程、本机 shell、沙箱执行服务器、ACP 子项、沙箱执行程序或节点执行程序。

这Codex-本机功能与[开爪代码Mode](/tools/code-mode)， 一个单独的JavaScript运行时具有自己的自动每个模型激活和显式覆盖。它有一个不同的`exec`输入形状。为了更广泛的model/provider/runtime分割，开始于[代理运行时间](/concepts/agent-runtimes)： `openai/gpt-6-astra`是模型参考，`codex`是运行时间，并且Telegram， Discord， Slack，或者另一个通道是通信面。

## <a id="saved-account-usage"></a> 已保存帐户使用情况

该插件的 `codex.accountUsage` 网关方法接受 `agentId` 和 `profileId`。即使普通harness使用本机家庭或远程服务器，它也会在具有所选登录名的临时本地应用程序服务器中重用 `account/rateLimits/read`。每个请求都会获取所选已保存订阅登录名的当前配额。该请求需要 `operator.admin` 并拒绝更改或删除的凭据。拒绝代理启动参数以避免更改共享守护程序的登录名。

## <a id="native-subagent-status"></a> 本机子代理状态

本机 Codex 子代理使用 Codex 的执行和协作控制，而不是 OpenClaw 已停用的任务视图。它们当前的执行、分配结果和结果交付仍然是独立的事实。

退出会立即撤销捕获的请求者权限，然后在释放子订阅之前加入已接受的本机提交和分配写入。在释放保留所有者之前，客户端处置会加入这些写入。

批准或输入请求显示需要注意的内容。本机邮箱等待表明代理正在等待消息；它不会发明子依赖项列表。空闲、中断或卸载的本机线程并不能证明委托任务已成功。恢复的本机轮次会清除前一轮的当前工具活动，同时保留本机分配标识。

本机子级完成后的后续工作会在同一 Codex 线程上创建单独的分配。早期结果及其交付状态保持不变。本机线程保留其对话；没有共享任务记录查看器。当本机轮流恢复时，中断的工作将保留其分配标识。如果恢复的回合结束仍未知，则 OpenClaw 会等待本机历史记录或结束事件，然后再决定后续工作是恢复该任务还是开始新的任务。没有足够本地回合信息的较旧任务仍然悬而未决，而不是借用另一个回合的结果。

待处理的本机分配在现有父绑定的元数据中保留其运行、子线程、本机父级和已知本机轮次标识。这不会添加 SQL 表，并且不会迁移旧的任务行。在父注册时，OpenClaw 只能在同一请求者会话、生命周期和连接的新完成权限下恢复对那些保存的身份和本机历史记录的观察。本机父线程轮换可以保留这些分配；重置请求者或更改连接不会采用它们。丢失的分配元数据不会从已停用的任务历史记录中重建。

对于 Codex V1 后续行动，OpenClaw 保留带有父绑定的成功提交收据，直到将匹配的本机回合记录为分配。这允许在父进程让步或网关在观察子进程之前重新启动时进行恢复。单独的收据并不能保持空闲的本机连接处于活动状态。观察遵循现有的热线程生命周期；不匹配的收据仍可供以后恢复。重置父级或替换其本机连接会使这些收据失效。在降级 OpenClaw 之前，让待处理的本机工作解决：旧版本可以读取绑定，但在更新时可能会丢弃其恢复收据。

关闭本机子项适用于关闭开始时选择的分配。 OpenClaw等待Codex确认孩子的运行时不存在，然后将未完成的工作标记为取消；延迟关闭不能取消稍后的分配。如果无法确认，则成交仍未解决；重试关闭请求而不是将其视为成功取消。本地结果收据无法识别孩子的轮次。如果较早的结果仍在恢复中或重复相同的结果导致收据不明确，OpenClaw 会保留稍后的待交付结果，而不用冒结果丢失的风险；这可能会导致额外的延续。

Codex 拥有本机子代理执行和控制。跟进父会话，可以使用 Codex 的原生协作工具。对于已承认的本机分配，OpenClaw 的harness会观察子级并在父级让步后路由结果。本机前台父级已收到完成消息，因此 OpenClaw 不会为其已消耗的结果发送另一个延续。显式 OpenClaw 或 ACP 委派继续使用 `sessions_spawn`。存储的提交和结果收据是恢复证据，而不是收养孩子或交付给替代父母的许可。

对于本机 Codex V1 代理，完整的 `wait` 结果还记录到前台父级的传送。在父级回复后，OpenClaw 不会为同一子级结果启动另一个延续。

## <a id="requirements"></a> 要求

- 官方安装的`@openclaw/codex`插件。如果您的配置使用允许列表，请将 `codex` 包含在 `plugins.allow` 中。
- 托管 Codex 应用程序服务器 `0.160.0` 或更高版本。该插件附带 `@openai/codex` `0.162.0`，并仅在通过版本检查和应用程序服务器握手后才使用 `PATH` 中较新的稳定版 `codex`；请参阅 [ 较新安装的 Codex](/plugins/codex-harness-reference/app-server-transport#newer-installed-codex)。显式自定义、远程和 macOS 桌面拥有的应用程序服务器必须报告 `0.149.0` 或更高版本的可解析语义版本。新版本继续带有兼容性警告和正常的运行时验证。
- 当设置 `remoteWorkspaceRoot` 并且必须传输跨计算机工作区附件时，远程 Codex 应用程序服务器主机上的 Node.js 。
- 通过 `openclaw models auth login --provider openai`、代理的 Codex 主目录中已存在的应用程序服务器帐户或显式 Codex API-key 身份验证配置文件进行 Codex 身份验证。

有关认证优先级、环境隔离、自定义 app-server 命令、模型发现以及完整的配置字段列表，请参阅 [Codex 运行时参考](/plugins/codex-harness-reference)。

## <a id="quickstart"></a> 快速开始

安装官方插件，然后使用 Codex OAuth 登录：

```bash
openclaw plugins install @openclaw/codex
openclaw models auth login --provider openai
```

启用 `codex` 插件并选择一个 OpenAI agent 模型：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-6-astra",
    },
  },
}
```

如果你的配置使用 `plugins.allow`，也请在其中添加 `codex`：

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

插件配置更改会在默认混合重新加载模式下自动应用。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。如果聊天已有会话，请先运行 `/new` 或 `/reset`，以便下一回合从当前配置解析harness。

## <a id="verify-codex-runtime"></a> 验证 Codex 运行时

在您期望使用 Codex 的聊天中使用 `/status`。 Codex- 支持的 OpenAI 代理轮流显示：

```text
Runtime: OpenAI Codex
```

然后检查 Codex app-server 状态：

```text
/codex status
/codex models
/codex binding
```

安装或更新 OpenClaw 后，在切换前显式验证受管软件包二进制文件：

```bash
openclaw doctor --lint --only codex/managed-app-server --json
```

对于使用托管 stdio 应用程序服务器的有效 Codex 路由，此默认禁用的检查可解析平台本机可执行文件，并需要由 OpenClaw 固定的确切 Codex 版本。它不执行自定义、远程或 macOS 桌面拥有的应用程序服务器。

`/status` 报告已解析的 OpenClaw 快速策略（`on`、`off` 或 `auto`）和选定的运行时。它不会报告已完成的请求实际兑现或返回的上游服务层。 `/codex binding` 报告附加的本机线程和当前模型设置。 `/codex status` 报告应用程序服务器连接、帐户、速率限制、MCP 服务器和技能。 Codex 命令都不是提供者响应遥测。 `/codex models` 列出了harness和帐户的实时 Codex 应用程序服务器目录。如果 `/status` 令人惊讶，请参阅 [ 故障排除](/plugins/codex-harness/troubleshooting)。

## <a id="luna-reserve-and-credit-usage"></a> Luna 储备金和积分使用情况

普通 `gpt-5.6-luna` 和 Luna Reserve （`gpt-reserve`） 是不同的路线。选择普通Luna不会仅仅因为它的配额有容量而消耗Reserve。关闭快速会更改请求的服务层，而不是模型路由。

OpenClaw 目前在 Codex 返回时报告 Reserve 桶，但没有实现后端授权的 Reserve 转换和恢复流程。不要强制使用隐藏的 Reserve 模型或将未使用的计数器视为授权。账户和客户资格仍然由后端决定。

包含的使用量用完后，普通请求可能会消耗您账户设置下的积分。在继续大批量自动化之前，请检查提供商的使用情况和支出控制。帐户余额和配额百分比不是每个请求的账单收据； `/status` 和 `/codex binding` 不建立实际应用于已完成请求的服务等级或费用。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的九个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="run-codex-on-another-machine"></a> 在另一台机器上运行Codex

[ 在另一台计算机上运行 Codex](/plugins/codex-harness/placement) — 将 Codex 本机执行放在配对设备或云工作线程上。

- <a id="run-codex-on-a-paired-device"></a>[在配对设备上运行 Codex](/plugins/codex-harness/placement#run-codex-on-a-paired-device)
- <a id="run-codex-on-a-cloud-worker"></a>[在云工作者上运行Codex](/plugins/codex-harness/placement#run-codex-on-a-cloud-worker)

### <a id="codex-routing-and-deployment"></a> Codex 路由部署

[Codex 路由和部署](/plugins/codex-harness/routing) — 选择哪些 OpenAI 路由选择 Codex 并围绕它们塑造部署。

- <a id="routing-and-model-selection"></a>[路由及选型](/plugins/codex-harness/routing#routing-and-model-selection)
- <a id="deployment-patterns"></a>[部署模式](/plugins/codex-harness/routing#deployment-patterns)
- <a id="basic-codex-deployment"></a>[基本 Codex 部署](/plugins/codex-harness/routing#basic-codex-deployment)
- <a id="mixed-provider-deployment"></a>[混合提供商部署](/plugins/codex-harness/routing#mixed-provider-deployment)
- <a id="fail-closed-codex-deployment"></a>[部署需要Codex](/plugins/codex-harness/routing#fail-closed-codex-deployment)

### <a id="codex-harness-configuration"></a> Codexharness配置

[Codex harness配置](/plugins/codex-harness/configuration) — Codex harness配置图、限制转弯、项目说明、压缩和长上下文。

- <a id="configuration"></a>[配置](/plugins/codex-harness/configuration#configuration)
- <a id="restricted-turns-and-ring-zero"></a>[限制匝数和环零](/plugins/codex-harness/configuration#restricted-turns-and-ring-zero)
- <a id="project-instructions"></a>[项目说明](/plugins/codex-harness/configuration#project-instructions)
- <a id="compaction"></a>[压缩](/plugins/codex-harness/configuration#compaction)
- <a id="direct-api-long-context"></a>[直接 API 长上下文](/plugins/codex-harness/configuration#direct-api-long-context)

### <a id="codex-app-server-policy"></a> Codex 应用程序服务器策略

[Codex 应用程序服务器策略](/plugins/codex-harness/app-server) — 应用程序服务器传输、审批姿势、身份验证顺序和环境隔离。

- <a id="app-server-policy"></a>[应用程序服务器策略](/plugins/codex-harness/app-server#app-server-policy)
- <a id="native-approval-audit-evidence"></a>[本机审批审核证据](/plugins/codex-harness/app-server#native-approval-audit-evidence)
- <a id="auth-order"></a>[授权订单](/plugins/codex-harness/app-server#auth-order)
- <a id="scheduled-app-authority"></a>[预定应用权限](/plugins/codex-harness/app-server#scheduled-app-authority)
- <a id="environment-isolation"></a>[环境隔离](/plugins/codex-harness/app-server#environment-isolation)
- <a id="local-testing-env-overrides"></a>[本地测试环境覆盖](/plugins/codex-harness/app-server#local-testing-env-overrides)

### <a id="codex-plugin-config-fields"></a> Codex 插件配置字段

[Codex 插件配置字段](/plugins/codex-harness/config-fields) — Codex 插件的顶级和 appServer 配置字段。

- <a id="config-fields"></a>[配置字段](/plugins/codex-harness/config-fields#config-fields)

### <a id="codex-commands-and-diagnostics"></a> Codex 命令和诊断

[Codex 命令和诊断](/plugins/codex-harness/commands) — /codex 命令界面、快速模式控制和本地线程检查。

- <a id="commands-and-diagnostics"></a>[命令和诊断](/plugins/codex-harness/commands#commands-and-diagnostics)
- <a id="shared-fast-mode-and-codex-fast-mode"></a>[共享快速模式和Codex快速模式](/plugins/codex-harness/commands#shared-fast-mode-and-codex-fast-mode)
- <a id="inspect-codex-threads-locally"></a>[本地检查Codex线程](/plugins/codex-harness/commands#inspect-codex-threads-locally)

### <a id="codex-runtime-behavior"></a> Codex 运行时行为

[Codex 运行时行为](/plugins/codex-harness/runtime-behavior) — 动态工具、Web 搜索、图像加载、转向活跃性和运行时边界。

- <a id="dynamic-tools-and-web-search"></a>[动态工具和网页搜索](/plugins/codex-harness/runtime-behavior#dynamic-tools-and-web-search)
- <a id="image-loader-ownership"></a>[图像加载器所有权](/plugins/codex-harness/runtime-behavior#image-loader-ownership)
- <a id="turn-liveness-and-timeouts"></a>[Turn 活跃度和超时](/plugins/codex-harness/runtime-behavior#turn-liveness-and-timeouts)
- <a id="parallel-chats-and-thread-ownership"></a>[并行聊天和线程所有权](/plugins/codex-harness/runtime-behavior#parallel-chats-and-thread-ownership)
- <a id="runtime-boundaries"></a>[运行时边界](/plugins/codex-harness/runtime-behavior#runtime-boundaries)

### <a id="native-codex-state-and-features"></a> Native Codex 状态和特性

[Native Codex 状态和功能](/plugins/codex-harness/native-features) — 共享本机 Codex 线程、监督会话并启用本机插件和计算机使用。

- <a id="share-threads-with-codex-desktop-and-cli"></a>[与 Codex Desktop 和 CLI](/plugins/codex-harness/native-features#share-threads-with-codex-desktop-and-cli) 共享线程
- <a id="supervise-codex-sessions"></a>[监督 Codex 会话](/plugins/codex-harness/native-features#supervise-codex-sessions)
- <a id="native-codex-plugins"></a>[原生 Codex 插件](/plugins/codex-harness/native-features#native-codex-plugins)
- <a id="computer-use"></a>[计算机 Use](/plugins/codex-harness/native-features#computer-use)

### <a id="codex-harness-troubleshooting"></a> Codexharness故障排除

[Codex harness故障排除](/plugins/codex-harness/troubleshooting) — Codex harness选择、应用程序服务器和内存问题的症状和修复。

- <a id="troubleshooting"></a>[故障排除](/plugins/codex-harness/troubleshooting#troubleshooting)

## <a id="related"></a> 相关内容

- [Codex harness 参考](/plugins/codex-harness-reference)
- [Codex harness运行时](/plugins/codex-harness-runtime)
- [Codex 监督](/plugins/codex-supervision)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 计算机 Use](/plugins/codex-computer-use)
- [Agent 运行时](/concepts/agent-runtimes)
- [模型提供商](/concepts/model-providers)
- [OpenAI 提供商](/providers/openai)
- [OpenAI Codex 帮助](https://help.openai.com/en/collections/14937394-codex)
- [Agent harness 插件](/plugins/sdk-agent-harness)
- [副驾驶SDKharness](/plugins/copilot)
- [插件钩子](/plugins/hooks)
- [诊断导出](/gateway/diagnostics)
- [状态](/cli/status)
- [测试](/help/testing-live#live-codex-app-server-harness-smoke)
- [ACP 代理](/tools/acp-agents) — 如何配置和绑定 ACP 代理
- [ACP 代理 — setup](/tools/acp-agents-setup) — 将此harness配置为 ACP 代理
