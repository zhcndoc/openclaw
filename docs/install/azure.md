---
summary: "在 Azure Linux VM 上全天候运行 OpenClaw 网关并持久保存状态"
read_when:
  - 你希望在 Azure 上通过网络安全组（NSG）强化来全天候运行 OpenClaw
  - 你希望在自己的 Azure Linux VM 上部署生产级的、始终在线的 OpenClaw 网关
  - 你希望通过 Azure Bastion 进行安全的 SSH 管理
title: "Azure"
---

# Azure Linux VM 上的 OpenClaw

本指南使用 Azure CLI 设置 Azure Linux VM，应用网络安全组（NSG）强化，配置 Azure Bastion 以进行 SSH 访问，并安装 OpenClaw。

## 你将完成的操作

- 使用 Azure CLI 创建 Azure 网络资源（VNet、子网、NSG）和计算资源
- 应用网络安全组规则，使 VM SSH 仅允许来自 Azure Bastion
- 使用 Azure Bastion 进行 SSH 访问（VM 无公网 IP）
- 使用安装脚本安装 OpenClaw
- 验证网关

## 所需条件

- 具有创建计算和网络资源权限的 Azure 订阅
- 已安装 Azure CLI（如需要，请参阅 [Azure CLI 安装步骤](https://learn.microsoft.com/cli/azure/install-azure-cli)）
- SSH 密钥对（如需生成，本指南会涵盖）
- 约 20-30 分钟

## 配置部署

<Steps>
  <Step title="登录 Azure CLI">
    ```bash
    az login
    az extension add -n ssh
    ```

    # ssh 扩展是 Azure Bastion 原生 SSH 隧道所必需的。

  </Step>

  <Step title="注册所需的资源提供程序（一次性）">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    验证注册状态。等待两者都显示为 `Registered`。

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

  <Step title="设置部署变量">
    ```bash
    RG="rg-openclaw"
    LOCATION="westus2"
    VNET_NAME="vnet-openclaw"
    VNET_PREFIX="10.40.0.0/16"
    VM_SUBNET_NAME="snet-openclaw-vm"
    VM_SUBNET_PREFIX="10.40.2.0/24"
    BASTION_SUBNET_PREFIX="10.40.1.0/26"
    NSG_NAME="nsg-openclaw-vm"
    VM_NAME="vm-openclaw"
    ADMIN_USERNAME="openclaw"
    BASTION_NAME="bas-openclaw"
    BASTION_PIP_NAME="pip-openclaw-bastion"
    ```

    根据你的环境调整名称和 CIDR 范围。Bastion 子网必须至少为 `/26`。

  </Step>

  <Step title="选择 SSH 密钥">
    如果你已有公钥，请使用现有公钥：

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    如果还没有 SSH 密钥，请生成一个：

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="选择 VM 大小和 OS 磁盘大小">
    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    选择在你的订阅和区域中可用的 VM 大小和 OS 磁盘大小：

    - 对于轻度使用，从较小规格开始，后续可扩展
    - 对于较重的自动化、更多通道或更大的模型/工具工作负载，使用更多 vCPU/内存/磁盘
    - 如果某个 VM 大小在你的区域或订阅配额中不可用，请选择最接近的可用 SKU

    列出目标区域中可用的 VM 大小：

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    检查当前的 vCPU 和磁盘使用情况及配额：

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>
</Steps>

## 部署 Azure 资源

<Steps>
  <Step title="创建资源组">
    ```bash
    az group create -n "${RG}" -l "${LOCATION}"
    ```
  </Step>

  <Step title="创建网络安全组">
    创建 NSG 并添加规则，使只有 Bastion 子网可以 SSH 到 VM。

    ```bash
    az network nsg create \
      -g "${RG}" -n "${NSG_NAME}" -l "${LOCATION}"

    # 仅允许来自 Bastion 子网的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n AllowSshFromBastionSubnet --priority 100 \
      --access Allow --direction Inbound --protocol Tcp \
      --source-address-prefixes "${BASTION_SUBNET_PREFIX}" \
      --destination-port-ranges 22

    # 拒绝来自公共互联网的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyInternetSsh --priority 110 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes Internet \
      --destination-port-ranges 22

    # 拒绝来自其他 VNet 源的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyVnetSsh --priority 120 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes VirtualNetwork \
      --destination-port-ranges 22
    ```

    规则按优先级评估（数字越小越优先）：在优先级 100 处允许 Bastion 流量，然后在 110 和 120 处阻止所有其他 SSH。

  </Step>

  <Step title="创建虚拟网络和子网">
    创建带有 VM 子网（附加 NSG）的 VNet，然后添加 Bastion 子网。

    ```bash
    az network vnet create \
      -g "${RG}" -n "${VNET_NAME}" -l "${LOCATION}" \
      --address-prefixes "${VNET_PREFIX}" \
      --subnet-name "${VM_SUBNET_NAME}" \
      --subnet-prefixes "${VM_SUBNET_PREFIX}"

    # 将 NSG 附加到 VM 子网
    az network vnet subnet update \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n "${VM_SUBNET_NAME}" --nsg "${NSG_NAME}"

    # AzureBastionSubnet — 名称由 Azure 要求固定
    az network vnet subnet create \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n AzureBastionSubnet \
      --address-prefixes "${BASTION_SUBNET_PREFIX}"
    ```

  </Step>

  <Step title="创建 VM">
    该 VM 没有公网 IP。SSH 访问完全通过 Azure Bastion 进行。

    ```bash
    az vm create \
      -g "${RG}" -n "${VM_NAME}" -l "${LOCATION}" \
      --image "Canonical:ubuntu-24_04-lts:server:latest" \
      --size "${VM_SIZE}" \
      --os-disk-size-gb "${OS_DISK_SIZE_GB}" \
      --storage-sku StandardSSD_LRS \
      --admin-username "${ADMIN_USERNAME}" \
      --ssh-key-values "${SSH_PUB_KEY}" \
      --vnet-name "${VNET_NAME}" \
      --subnet "${VM_SUBNET_NAME}" \
      --public-ip-address "" \
      --nsg ""
    ```

    `--public-ip-address ""` 防止分配公网 IP。`--nsg ""` 跳过创建基于 NIC 的 NSG（子网级 NSG 负责安全）。

    **可重复性：** 上述命令对 Ubuntu 镜像使用 `latest`。要固定到特定版本，请列出可用版本并替换 `latest`：

    ```bash
    az vm image list \
      --publisher Canonical --offer ubuntu-24_04-lts \
      --sku server --all -o table
    ```

  </Step>

  <Step title="创建 Azure Bastion">
    Azure Bastion 为 VM 提供托管 SSH 访问，无需暴露公网 IP。CLI 方式的 `az network bastion ssh` 需要具有隧道功能的标准 SKU。

    ```bash
    az network public-ip create \
      -g "${RG}" -n "${BASTION_PIP_NAME}" -l "${LOCATION}" \
      --sku Standard --allocation-method Static

    az network bastion create \
      -g "${RG}" -n "${BASTION_NAME}" -l "${LOCATION}" \
      --vnet-name "${VNET_NAME}" \
      --public-ip-address "${BASTION_PIP_NAME}" \
      --sku Standard --enable-tunneling true
    ```

    Bastion 预配通常需要 5-10 分钟，但在某些区域可能需要 15-30 分钟。

  </Step>
</Steps>

## 安装 OpenClaw

<Steps>
  <Step title="通过 Azure Bastion SSH 连接到 VM">
    ```bash
    VM_ID="$(az vm show -g "${RG}" -n "${VM_NAME}" --query id -o tsv)"

    az network bastion ssh \
      --name "${BASTION_NAME}" \
      --resource-group "${RG}" \
      --target-resource-id "${VM_ID}" \
      --auth-type ssh-key \
      --username "${ADMIN_USERNAME}" \
      --ssh-key ~/.ssh/id_ed25519
    ```

  </Step>

  <Step title="安装 OpenClaw（在 VM shell 中）">
    ```bash
    # 下载安装脚本
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
    # 执行安装
    bash /tmp/install.sh
    # 清理安装文件
    rm -f /tmp/install.sh
    ```

    安装程序会安装 Node LTS 和依赖项（如果尚未存在），安装 OpenClaw，并启动引导向导。详情参见 [安装](/install)。

  </Step>

  <Step title="验证网关">
    引导完成后：

    ```bash
    openclaw gateway status
    ```

    大多数企业 Azure 团队已拥有 GitHub Copilot 许可证。如果是这种情况，我们建议在 OpenClaw 引导向导中选择 GitHub Copilot 提供程序。参见 [GitHub Copilot 提供程序](/providers/github-copilot)。

  </Step>
</Steps>

## 成本考量

Azure Bastion 标准 SKU 每月约 **140 美元**，VM（Standard_B2as_v2）每月约 **55 美元**。

降低成本的方法：

- **在不使用时解除分配 VM**（停止计算计费；磁盘费用保留）。VM 解除分配期间无法访问 OpenClaw 网关——需要时重新启动：

  ```bash
  # 解除分配 VM
  az vm deallocate -g "${RG}" -n "${VM_NAME}"
  # 稍后重新启动
  az vm start -g "${RG}" -n "${VM_NAME}"
  ```

- **不需要时删除 Bastion**，需要 SSH 访问时重新创建。Bastion 是成本最高的组件，预配只需几分钟。
- **如果只需要基于门户的 SSH 且不需要 CLI 隧道（`az network bastion ssh`），可使用基本 Bastion SKU**（约 38 美元/月）。

## 清理

删除本指南创建的所有资源：

```bash
az group delete -n "${RG}" --yes --no-wait
```

这将删除资源组及其内部的所有内容（VM、VNet、NSG、Bastion、公网 IP）。

## 后续步骤

- 设置消息通道：[通道](/channels)
- 将本地设备配对为节点：[节点](/nodes)
- 配置网关：[网关配置](/gateway/configuration)
- 有关使用 GitHub Copilot 模型提供程序进行 OpenClaw Azure 部署的更多详情：[Azure 上的 OpenClaw 与 GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)
