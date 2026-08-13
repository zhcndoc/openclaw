---
summary: "使用 Kustomize 将 OpenClaw Gateway 部署到 Kubernetes 集群"
read_when:
  - 你想在 Kubernetes 集群上运行 OpenClaw
  - 你想在 Kubernetes 环境中测试 OpenClaw
title: "Kubernetes"
---

在 Kubernetes 上运行 OpenClaw 的最小起点，不是可用于生产环境的部署。它涵盖了核心资源，并且旨在根据你的环境进行调整。

## 为什么不用 Helm

OpenClaw 是一个包含一些配置文件的单容器。真正有意思的定制在于代理内容（Markdown 文件、技能、配置覆盖），而不是基础设施模板。Kustomize 可以处理覆盖层，而无需 Helm chart 的开销。如果你的部署变得更复杂，可以在这些清单之上再叠加一个 Helm chart。

## 你需要什么

- 一个正在运行的 Kubernetes 集群（AKS、EKS、GKE、k3s、kind、OpenShift 等）
- 已连接到你的集群的 `kubectl`
- 至少一个模型提供商的 API key。

## 快速开始

```bash
# 替换为你的提供商：ANTHROPIC、GEMINI、OPENAI 或 OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

`deploy.sh` 默认会创建 token 认证。为 Control UI 获取生成的 gateway token：

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

对于本地调试，`./scripts/k8s/deploy.sh --show-token` 会在部署后打印 token。

## 使用 Kind 在本地测试

如果你没有集群，可以使用 [Kind](https://kind.sigs.k8s.io/) 在本地创建一个：

```bash
./scripts/k8s/create-kind.sh           # 自动检测 docker 或 podman
./scripts/k8s/create-kind.sh --delete  # 删除
```

然后像往常一样使用 `./scripts/k8s/deploy.sh` 进行部署。

## 逐步说明

### 1) 部署

**选项 A：在环境中提供 API key（一步完成）**

```bash
# 替换为你的提供商：ANTHROPIC、GEMINI、OPENAI 或 OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

该脚本会创建一个包含 API key 和自动生成 gateway token 的 Kubernetes Secret，然后进行部署。如果 Secret 已存在，它会保留当前的 gateway token 以及未被更改的任何提供商 key。

**选项 B：单独创建 secret**

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

在任一命令中添加 `--show-token`，即可将 token 输出到 stdout，便于本地测试。

### 2) 访问 gateway

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 部署了什么

```text
Namespace: openclaw (可通过 OPENCLAW_NAMESPACE 配置)
├── Deployment/openclaw        # 单个 Pod，init 容器 + 网关
├── Service/openclaw           # 18789 端口上的 ClusterIP
├── PersistentVolumeClaim      # 为 agent 状态和配置提供 10Gi
├── ConfigMap/openclaw-config  # openclaw.json + AGENTS.md
└── Secret/openclaw-secrets    # 网关 token + API 密钥
```

Deployment 对启动探针和流量就绪探针都使用 `/startupz`，并提供五分钟的启动时限。频道故障不会将健康的 Gateway 或 Control UI 从 Service 端点中移除。`/healthz` 仍然是存活探针；当监控应包含频道账户健康状态时，请单独使用 `/readyz`。

## 定制

### Agent 指令

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `AGENTS.md` 并重新部署：

```bash
./scripts/k8s/deploy.sh
```

### Gateway 配置

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `openclaw.json`。完整参考请查看 [Gateway 配置](/gateway/configuration)。

init 容器仅在 PVC 中缺少 `openclaw.json` 和工作区 `AGENTS.md` 时，才会分别为其写入初始内容。首次启动后，持久化副本就是事实来源：通过 OpenClaw（`onboard`、`channels add`、`doctor --fix`、Control UI）所做的更改会在 Pod 重启后保留，而更新 ConfigMap 不会覆盖现有的 PVC 副本。若要根据更新后的 ConfigMap 有意重新写入某个文件，请删除持久化副本并重启：

```bash
kubectl exec -n openclaw deploy/openclaw -- rm /home/node/.openclaw/openclaw.json
kubectl rollout restart -n openclaw deploy/openclaw
```

根据之前模板创建的 Deployment 会在每次 Pod 启动时应用 ConfigMap 编辑内容（并丢弃通过 OpenClaw 所做的任何配置更改）。如果你依赖这种流程，请在编辑 ConfigMap 后使用上述重新写入命令。

### 添加提供商

重新运行并导出额外的 key：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

现有的提供商 key 会保留在 Secret 中，除非你覆盖它们。

或者直接 patch Secret：

```bash
kubectl patch secret openclaw-secrets -n openclaw \
  -p '{"stringData":{"<PROVIDER>_API_KEY":"..."}}'
kubectl rollout restart deployment/openclaw -n openclaw
```

### 自定义命名空间

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh
```

### 自定义镜像

编辑 `scripts/k8s/manifests/deployment.yaml` 中的 `image` 字段：

```yaml
# Bump this immutable versioned tag when upgrading OpenClaw.
image: ghcr.io/openclaw/openclaw:2026.7.1-2-slim
```

### 超出 port-forward 的暴露方式

默认的 manifests 会将 gateway 绑定到 pod 内的 loopback。这适用于 `kubectl port-forward`，但不适用于需要直接访问 pod IP 的 Kubernetes `Service` 或 Ingress 路径。

要通过 Ingress 或负载均衡器暴露 gateway：

- 将 `scripts/k8s/manifests/configmap.yaml` 中的 gateway 绑定从 `loopback` 改为与你的部署模型匹配的非 loopback 绑定。
- 保持 gateway 认证启用，并使用正确的 TLS 终止入口。
- 使用支持的 Web 安全模型为远程访问配置 Control UI（例如 HTTPS/Tailscale Serve，以及在需要时显式允许的来源）。

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

这会应用所有清单并重启 Pod，以获取任何配置或 secret 更改。

## 删除部署

```bash
./scripts/k8s/deploy.sh --delete
```

对于默认的 `openclaw` 命名空间，此操作会删除该命名空间及其中的所有内容，包括 PVC。

对于自定义命名空间，`--delete` 仅删除 OpenClaw 资源，并保留该命名空间及其中无关的工作负载：

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh --delete
```

在任何命名空间中，使用 `--delete-resources` 可显式请求执行此范围限定的清理操作。这两种范围限定模式都会删除 OpenClaw Deployment、Service、PVC、ConfigMap 以及生成的 Secret。删除 PVC 会移除 OpenClaw 的存储声明以及对其持久化数据的访问；底层卷和数据是否被删除，取决于 PersistentVolume 或 StorageClass 的回收策略（`Delete` 或 `Retain`）。

要删除自定义命名空间及其中的所有工作负载，请显式选择加入：

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh --delete-namespace
```

此操作也会删除无关的工作负载和 PVC。

## 架构说明

- 默认情况下，gateway 绑定到 Pod 内部的 loopback，因此所包含的设置适用于 `kubectl port-forward`。
- 没有集群级资源；所有内容都位于单个命名空间中。
- 安全加固：`readOnlyRootFilesystem`、`drop: ALL` capabilities、非 root 用户（UID 1000）。
- 默认配置将 Control UI 保持在更安全的本地访问路径上：loopback 绑定，再通过 `kubectl port-forward` 访问 `http://127.0.0.1:18789`。
- 如果你要超出 localhost 访问，请使用受支持的远程模式：HTTPS/Tailscale，以及相应的 gateway 绑定和 Control UI origin 设置。
- Secret 会在临时目录中生成，并直接应用到集群；不会将任何 secret 内容写入仓库检出目录。

## 文件结构

```text
scripts/k8s/
├── deploy.sh                   # 创建命名空间 + secret，通过 kustomize 部署
├── create-kind.sh              # 本地 Kind 集群（自动检测 docker/podman）
└── manifests/
    ├── kustomization.yaml      # Kustomize 基础
    ├── configmap.yaml          # openclaw.json + AGENTS.md
    ├── deployment.yaml         # 带安全加固的 Pod spec
    ├── pvc.yaml                # 10Gi 持久化存储
    └── service.yaml            # 18789 上的 ClusterIP
```

## 相关内容

- [Docker](/install/docker)
- [Docker VM runtime](/install/docker-vm-runtime)
- [安装概览](/install)
