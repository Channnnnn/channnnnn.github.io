---
title: "Migrating from GCP Internal Regional Backend + NGINX Ingress to Kubernetes Gateway API"
thumbnail: https://cdn.hashnode.com/res/hashnode/image/upload/v1694667078474/8e3c5f17-8b78-4b20-b2a7-a9ae657e919c.png
category: Technology
tags:
  - Kubernetes
  - gateway-api
  - GCP
  - NGINX
  - Networking
---
A practical guide to migrating from the GCP internal regional backend and NGINX Ingress Controller combo to the Kubernetes Gateway API, including feature parity, gotchas, and migration steps.

## Overview

For teams running internal workloads on GKE, the combination of a GCP internal regional Application Load Balancer (backend service) fronted by an NGINX Ingress Controller has been the de facto standard for years. It works, but it comes with operational overhead: two layers of routing config, split ownership between platform and application teams, and a growing gap between what the ecosystem supports and what `Ingress` can express natively.

The Kubernetes Gateway API is the community's answer to these limitations. It reached GA for its core features in late 2023 and has since become the recommended path forward. This article walks through what changes, what stays the same, and how to migrate without downtime.

---

## Architecture Comparison

### Old: GCP Internal Regional Backend + NGINX Ingress

```
Client (internal VPC)
  └─► GCP Internal Regional ALB (L7 forwarding rule)
        └─► Backend Service → NEG (Network Endpoint Group)
              └─► NGINX Ingress Controller Pod
                    └─► Kubernetes Service → Application Pods
```

In this setup the GCP load balancer handles TLS termination and regional health checking at the cloud layer. NGINX then handles the actual HTTP routing inside the cluster based on `Ingress` resource rules. You end up maintaining GCP Terraform for the LB layer and Kubernetes YAML for the Ingress layer — two separate planes that both need to agree on routing intent.

### New: Gateway API with GKE Gateway Controller

```
Client (internal VPC)
  └─► GatewayClass (GKE managed)
        └─► Gateway resource (provisions GCP Internal ALB automatically)
              └─► HTTPRoute → Kubernetes Service → Application Pods
```

The Gateway API collapses both layers into a single Kubernetes-native control plane. The `Gateway` resource directly provisions and manages the GCP Internal Regional ALB via the GKE Gateway Controller. NGINX is removed from the data path entirely.

---

## Feature Parity

| Feature | NGINX Ingress + GCP Backend | Gateway API (GKE) |
|---|---|---|
| HTTP/HTTPS routing by host | ✅ | ✅ |
| Path-based routing | ✅ | ✅ |
| TLS termination | ✅ (at LB or NGINX) | ✅ (at Gateway) |
| Header-based routing | ✅ (NGINX annotations) | ✅ (native HTTPRoute) |
| Traffic weighting / canary | ⚠️ NGINX annotations only | ✅ Native `backendRefs` weights |
| Cross-namespace routing | ❌ | ✅ Via `ReferenceGrant` |
| Role-based route ownership | ❌ All in one Ingress | ✅ Split Gateway / HTTPRoute |
| gRPC routing | ⚠️ Manual config | ✅ Native `GRPCRoute` |
| WebSocket support | ✅ | ✅ |
| Request mirroring | ⚠️ NGINX Plus only | ✅ Native |
| URL rewriting | ✅ (annotations) | ✅ (native filters) |
| Response header modification | ✅ (annotations) | ✅ (native filters) |
| Rate limiting | ✅ (NGINX module) | ⚠️ Needs policy extension |
| mTLS between client and LB | ⚠️ Complex setup | ✅ Via `BackendTLSPolicy` |
| Internal-only (no public IP) | ✅ | ✅ `gke-l7-rilb` GatewayClass |
| Multi-cluster routing | ❌ | ✅ Via GKE multi-cluster Gateway |
| Health check customization | ✅ (GCP backend service) | ✅ Via `HealthCheckPolicy` |
| IAP (Identity-Aware Proxy) | ✅ (via GCP backend) | ✅ Via `GCPBackendPolicy` |
| Cloud Armor integration | ✅ (via GCP backend) | ✅ Via `GCPBackendPolicy` |

### Notable gaps to be aware of

**Rate limiting** is the biggest functional gap. NGINX's `ngx_http_limit_req_module` is widely used and has no direct equivalent in the core Gateway API spec. You will need to implement rate limiting at the application layer, via a service mesh (Istio, Cilium), or wait for vendor-specific policy extensions to mature.

**Custom NGINX directives** via `nginx.ingress.kubernetes.io/configuration-snippet` annotations have no Gateway API equivalent by design — the API intentionally avoids escape hatches. Any logic that relied on raw NGINX config snippets needs to be reimplemented as proper HTTPRoute filters or moved to application middleware.

---

## Core Resource Mapping

### GatewayClass — replaces the NGINX IngressClass

```yaml
# Old: IngressClass pointing to NGINX controller
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
spec:
  controller: k8s.io/ingress-nginx

# New: GatewayClass managed by GKE
# This is pre-provisioned by GKE — you reference it, not create it
# For internal regional ALB:
#   gke-l7-rilb          (single cluster)
#   gke-l7-rilb-mc       (multi-cluster)
```

### Gateway — replaces the GCP forwarding rule + NGINX service

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: infra          # owned by platform team
spec:
  gatewayClassName: gke-l7-rilb
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: my-tls-cert
            kind: Secret
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: "true"
```

The `Gateway` resource lives in the infra namespace under platform team ownership. Application teams never touch it.

### HTTPRoute — replaces Ingress rules

```yaml
# Old: Ingress with NGINX annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "20"
spec:
  rules:
    - host: api.internal.example.com
      http:
        paths:
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2
                port:
                  number: 8080

---
# New: HTTPRoute with native traffic splitting
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app
  namespace: app-team        # owned by app team
spec:
  parentRefs:
    - name: internal-gateway
      namespace: infra
  hostnames:
    - api.internal.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v2
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /
      backendRefs:
        - name: api-v2
          port: 8080
          weight: 80
        - name: api-v2-canary
          port: 8080
          weight: 20
```

Notice that traffic splitting which required two separate `Ingress` resources with canary annotations is now expressed in a single `HTTPRoute` with `weight` fields on `backendRefs`.

### ReferenceGrant — cross-namespace routing

If your `HTTPRoute` in `app-team` namespace needs to reference a `Service` in another namespace, you need a `ReferenceGrant` in the target namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-app-team
  namespace: shared-services   # namespace being accessed
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: app-team
  to:
    - group: ""
      kind: Service
```

---

## GCP-Specific Policies

These replace what you previously configured via Terraform on the GCP backend service.

### Cloud Armor

```yaml
apiVersion: networking.gke.io/v1
kind: GCPBackendPolicy
metadata:
  name: cloud-armor-policy
  namespace: app-team
spec:
  default:
    securityPolicy: projects/my-project/global/securityPolicies/my-policy
  targetRef:
    group: ""
    kind: Service
    name: my-app-service
```

### Custom health check

```yaml
apiVersion: networking.gke.io/v1
kind: HealthCheckPolicy
metadata:
  name: my-app-healthcheck
  namespace: app-team
spec:
  default:
    checkIntervalSec: 15
    timeoutSec: 5
    healthyThreshold: 1
    unhealthyThreshold: 2
    logConfig:
      enabled: true
    config:
      type: HTTP
      httpHealthCheck:
        port: 8080
        requestPath: /healthz
  targetRef:
    group: ""
    kind: Service
    name: my-app-service
```

---

## Migration Steps

### Phase 1: Preparation

Before touching any live traffic, complete these prerequisites:

1. **Verify GKE version** — Gateway API requires GKE 1.24+ for beta, 1.28+ recommended for GA resources
2. **Enable Gateway API on the cluster** if not already enabled:
   ```bash
   gcloud container clusters update my-cluster \
     --gateway-api=standard \
     --region=asia-southeast1
   ```
3. **Audit all NGINX annotations** in existing Ingress resources — identify any that rely on `configuration-snippet` or NGINX-specific modules that have no Gateway API equivalent
4. **Inventory GCP backend services** configured outside Kubernetes — Cloud Armor policies, IAP configs, custom health checks — these will be migrated to GCP policy resources

### Phase 2: Shadow deployment

Deploy the new Gateway and HTTPRoute alongside the existing NGINX Ingress without removing anything. Both will exist simultaneously.

1. Create the `Gateway` resource in your infra namespace
2. Create `HTTPRoute` resources mirroring existing `Ingress` rules
3. The new Gateway provisions a new GCP Internal ALB with a different IP
4. Update an internal DNS entry (e.g. `api-gateway-test.internal.example.com`) to point at the new ALB IP
5. Run smoke tests and integration tests against the new endpoint

### Phase 3: Gradual traffic shift

Use GCP's internal DNS or your service mesh to shift traffic incrementally:

1. Update the primary internal DNS record to a weighted routing policy: 90% old ALB, 10% new Gateway
2. Monitor error rates, latency, and health check status on both ALBs
3. Shift to 50/50, then 10/90, over the course of hours or days depending on risk tolerance
4. Once confident, update DNS to 100% new Gateway

### Phase 4: Cleanup

1. Delete all `Ingress` resources
2. Delete the NGINX Ingress Controller deployment and related RBAC
3. Delete the old GCP backend service and forwarding rule via Terraform
4. Remove NGINX-related annotations from all workload configs
5. Archive the old NGINX ConfigMaps

---

## Gotchas and Operational Notes

**NEG attachment is automatic but takes time.** When a `Gateway` and `HTTPRoute` first reconcile, GKE provisions NEGs and attaches them to the new ALB backend service. This can take 2-5 minutes. Do not assume the endpoint is healthy immediately after `kubectl apply`.

**One Gateway per IP.** Unlike NGINX which multiplexes many Ingress resources through a single pod, each `Gateway` resource provisions its own GCP load balancer. For teams with dozens of internal services, consider a shared Gateway with HTTPRoutes from many namespaces rather than one Gateway per service.

**`allowedRoutes` is your access control boundary.** Without explicit `allowedRoutes` configuration on the Gateway, no HTTPRoute from any namespace can attach. Always define this deliberately — leaving it as `from: All` is the equivalent of a world-readable Ingress.

**TLS certs must be in the same namespace as the Gateway.** Unlike NGINX which could reference secrets from annotated Ingress resources in any namespace, Gateway listeners look for cert Secrets in their own namespace only. Centralise cert management in the infra namespace alongside the Gateway.

**GCP policy resources are eventually consistent.** Changes to `GCPBackendPolicy` and `HealthCheckPolicy` propagate to GCP asynchronously. Check the `status` field on these resources rather than assuming immediate effect:
```bash
kubectl describe gcpbackendpolicy cloud-armor-policy -n app-team
```

---

## Summary

The migration from NGINX Ingress plus GCP internal backend to the Gateway API is primarily an investment in operational clarity. The new model gives platform teams clean ownership of infrastructure concerns (the `Gateway`) while application teams own their routing logic (`HTTPRoute`) — without needing to coordinate on a shared Ingress resource or NGINX annotation vocabulary.

The feature parity is strong for the majority of use cases. Rate limiting and raw NGINX directive flexibility are the two areas that require alternative solutions. For everything else — TLS, header routing, traffic weighting, Cloud Armor, IAP — the Gateway API provides first-class support that is more expressive and less annotation-dependent than what came before.
