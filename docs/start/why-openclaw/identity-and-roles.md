---
summary: "配对、运营商范围、角色上限和一网关即一信任域边界"
title: "身份和角色"
read_when:
  - "您正在配置网关角色、范围或身份识别前门"
  - "您需要知道 OpenClaw 如何限制一个人可以达到的范围"
  - "您正在评估 OpenClaw 的多租户使用"
---

经过设备验证的控制平面客户端提供签名身份并通过 [pairing](/gateway/pairing)。重新连接更广泛的设备范围需要批准。其他准入路径包括经过验证的前门和配置的本地或共享秘密访问。将 DM 策略设置为 [pairing](/channels/pairing) 时，未知发件人将获得配对代码，而不是代理。身份感知前门（[Tailscale](/gateway/tailscale)、[可信代理](/gateway/trusted-proxy-auth)、[Cloudflare Access](/gateway/cloudflare-access)）将经过验证的身份映射到范围。

八个 [ 操作员范围 ](/gateway/operator-scopes) — `read`、`write`、`admin` 以及用于配对、批准、问题和谈话的更窄范围 — 是根据调度前的实际参数根据请求派生的，没有范围分类的方法将被拒绝而不是允许。写入和管理操作需要相应的范围。 [`gateway.roles`](/gateway/operator-scopes) 分配指定的人员级别角色：对其他人会话的可见性、代理允许列表以及与授予的任何连接身份验证相交的范围上限（从未添加到其中）。没有有效分配的配置文件将接收配置的默认角色；对于强化部署，将该角色配置为拒绝所有。省略 `gateway.roles` 会使角色边界禁用。 [多用户会话](/concepts/multi-user)记录不可变的创建者、可分配的所有者和有界的参与者历史记录，并且经过验证的GitHub身份可以流向`Co-authored-by`预告片和PR-链接的会话记录（[user模型](/concepts/user-model)）。

我们的 [ 安全文档 ](/gateway/security) 定义了范围：一个网关就是一个信任域。角色组织已经相互信任的人之间的协作。对于相互不信任的租户，最好在单独的 OS 用户或主机下运行具有自己的状态和凭据的单独网关。请参阅 [ 安全信任模型](/gateway/security/trust-model)。
