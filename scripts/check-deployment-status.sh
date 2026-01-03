#!/bin/bash

# ============================================
# Comprehensive Deployment Status Check
# ============================================

set -e

echo "Deployment Status Check"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Track status (using simple variables for compatibility)
INFRA_PASSED=0
INFRA_FAILED=0
APP_PASSED=0
APP_FAILED=0

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}ERROR: kubectl not found${NC}"
    exit 1
fi

# Check cluster connection
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}ERROR: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

CLUSTER_INFO=$(kubectl cluster-info | head -1)
echo -e "${BLUE}Cluster:${NC} $CLUSTER_INFO"
echo ""

# ============================================
# INFRASTRUCTURE CHECKS
# ============================================
echo "INFRASTRUCTURE DEPLOYMENT"
echo "----------------------------"

# Namespace
if kubectl get namespace kayak &> /dev/null; then
    echo -e "${GREEN}OK: Namespace 'kayak' exists${NC}"
    ((INFRA_PASSED++))
else
    echo -e "${RED}ERROR: Namespace 'kayak' does not exist${NC}"
    ((INFRA_FAILED++))
fi

# Backend Deployment
BACKEND_DEPLOY=$(kubectl get deployment backend -n kayak 2>/dev/null || echo "")
if [ -n "$BACKEND_DEPLOY" ]; then
    BACKEND_READY=$(kubectl get deployment backend -n kayak -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    BACKEND_DESIRED=$(kubectl get deployment backend -n kayak -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
    if [ "$BACKEND_READY" = "$BACKEND_DESIRED" ] && [ "$BACKEND_READY" != "0" ]; then
        echo -e "${GREEN}OK: Backend Deployment: $BACKEND_READY/$BACKEND_DESIRED ready${NC}"
        ((INFRA_PASSED++))
    else
        echo -e "${YELLOW}WARNING: Backend Deployment: $BACKEND_READY/$BACKEND_DESIRED ready (expected $BACKEND_DESIRED)${NC}"
        ((INFRA_FAILED++))
    fi
else
    echo -e "${RED}ERROR: Backend Deployment: Not found${NC}"
    ((INFRA_FAILED++))
fi

# Frontend Deployment
FRONTEND_DEPLOY=$(kubectl get deployment frontend -n kayak 2>/dev/null || echo "")
if [ -n "$FRONTEND_DEPLOY" ]; then
    FRONTEND_READY=$(kubectl get deployment frontend -n kayak -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    FRONTEND_DESIRED=$(kubectl get deployment frontend -n kayak -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
    if [ "$FRONTEND_READY" = "$FRONTEND_DESIRED" ] && [ "$FRONTEND_READY" != "0" ]; then
        echo -e "${GREEN}OK: Frontend Deployment: $FRONTEND_READY/$FRONTEND_DESIRED ready${NC}"
        ((INFRA_PASSED++))
    else
        echo -e "${YELLOW}WARNING: Frontend Deployment: $FRONTEND_READY/$FRONTEND_DESIRED ready (expected $FRONTEND_DESIRED)${NC}"
        ((INFRA_FAILED++))
    fi
else
    echo -e "${RED}ERROR: Frontend Deployment: Not found${NC}"
    ((INFRA_FAILED++))
fi

# Pods
echo ""
echo "Pods Status:"
BACKEND_PODS=$(kubectl get pods -n kayak -l app=backend 2>/dev/null | tail -n +2 || echo "")
if [ -n "$BACKEND_PODS" ]; then
    echo "$BACKEND_PODS" | while read line; do
        if echo "$line" | grep -q "Running"; then
            echo -e "  ${GREEN}OK: $line${NC}"
        else
            echo -e "  ${RED}ERROR: $line${NC}"
        fi
    done
    ((INFRA_PASSED++))
else
    echo -e "  ${RED}ERROR: No backend pods found${NC}"
    ((INFRA_FAILED++))
fi

FRONTEND_PODS=$(kubectl get pods -n kayak -l app=frontend 2>/dev/null | tail -n +2 || echo "")
if [ -n "$FRONTEND_PODS" ]; then
    echo "$FRONTEND_PODS" | while read line; do
        if echo "$line" | grep -q "Running"; then
            echo -e "  ${GREEN}OK: $line${NC}"
        else
            echo -e "  ${RED}ERROR: $line${NC}"
        fi
    done
    ((INFRA_PASSED++))
else
    echo -e "  ${RED}ERROR: No frontend pods found${NC}"
    ((INFRA_FAILED++))
fi

# Services
echo ""
echo "Services:"
BACKEND_SVC=$(kubectl get svc backend -n kayak 2>/dev/null || echo "")
if [ -n "$BACKEND_SVC" ]; then
    BACKEND_LB=$(kubectl get svc backend -n kayak -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || \
                 kubectl get svc backend -n kayak -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$BACKEND_LB" ]; then
        echo -e "  ${GREEN}OK: Backend Service: $BACKEND_LB${NC}"
        ((INFRA_PASSED++))
        BACKEND_URL="http://$BACKEND_LB"
    else
        echo -e "  ${YELLOW}WARNING: Backend Service: Exists but LoadBalancer not ready${NC}"
        ((INFRA_FAILED++))
        BACKEND_URL=""
    fi
else
    echo -e "  ${RED}ERROR: Backend Service: Not found${NC}"
    ((INFRA_FAILED++))
    BACKEND_URL=""
fi

FRONTEND_SVC=$(kubectl get svc frontend -n kayak 2>/dev/null || echo "")
if [ -n "$FRONTEND_SVC" ]; then
    FRONTEND_LB=$(kubectl get svc frontend -n kayak -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || \
                  kubectl get svc frontend -n kayak -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$FRONTEND_LB" ]; then
        echo -e "  ${GREEN}OK: Frontend Service: $FRONTEND_LB${NC}"
        ((INFRA_PASSED++))
        FRONTEND_URL="http://$FRONTEND_LB"
    else
        echo -e "  ${YELLOW}WARNING: Frontend Service: Exists but LoadBalancer not ready${NC}"
        ((INFRA_FAILED++))
        FRONTEND_URL=""
    fi
else
    echo -e "  ${RED}ERROR: Frontend Service: Not found${NC}"
    ((INFRA_FAILED++))
    FRONTEND_URL=""
fi

echo ""
echo ""

# ============================================
# APPLICATION FUNCTIONALITY CHECKS
# ============================================
echo "APPLICATION FUNCTIONALITY"
echo "----------------------------"

# Secrets
SECRETS=$(kubectl get secret backend-secrets -n kayak 2>/dev/null || echo "")
if [ -n "$SECRETS" ]; then
    echo -e "${GREEN}OK: Backend secrets exist${NC}"
    ((APP_PASSED++))
    
    # Check critical secrets
    echo "  Checking critical secrets:"
    MISSING=0
    for secret in DATABASE_URL MONGODB_URI REDIS_URL JWT_SECRET SESSION_SECRET; do
        VALUE=$(kubectl get secret backend-secrets -n kayak -o jsonpath="{.data.$secret}" 2>/dev/null | base64 -d 2>/dev/null || echo "")
        if [ -z "$VALUE" ]; then
            echo -e "    ${RED}ERROR: $secret: Missing or empty${NC}"
            ((MISSING++))
        else
            # Mask sensitive values
            MASKED=$(echo "$VALUE" | sed 's/:[^@]*@/:***@/' | sed 's/=.*/=***/')
            echo -e "    ${GREEN}OK: $secret: Set${NC}"
        fi
    done
    
    if [ $MISSING -gt 0 ]; then
        ((APP_FAILED++))
        echo -e "  ${RED}ERROR: Database secrets: $MISSING missing/empty${NC}"
    else
        ((APP_PASSED++))
        echo -e "  ${GREEN}OK: Database secrets: All configured${NC}"
    fi
else
    echo -e "${RED}ERROR: Backend secrets: Not found${NC}"
    ((APP_FAILED++))
    ((APP_FAILED++))
fi

# Frontend loads
if [ -n "$FRONTEND_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}OK: Frontend loads: Yes ($FRONTEND_URL)${NC}"
        ((APP_PASSED++))
    else
        echo -e "${RED}ERROR: Frontend loads: No (HTTP $HTTP_CODE)${NC}"
        ((APP_FAILED++))
    fi
else
    echo -e "${RED}ERROR: Frontend loads: Cannot test (no URL)${NC}"
    ((APP_FAILED++))
fi

# Backend responds
if [ -n "$BACKEND_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL/health/live" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}OK: Backend responds: Yes ($BACKEND_URL)${NC}"
        ((APP_PASSED++))
    else
        echo -e "${RED}ERROR: Backend responds: No (HTTP $HTTP_CODE)${NC}"
        ((APP_FAILED++))
    fi
else
    echo -e "${RED}ERROR: Backend responds: Cannot test (no URL)${NC}"
    ((APP_FAILED++))
fi

# Database connections
if [ -n "$BACKEND_URL" ]; then
    READY_RESPONSE=$(curl -s --max-time 10 "$BACKEND_URL/health/ready" 2>/dev/null || echo "")
    if echo "$READY_RESPONSE" | grep -qi "ready\|ok\|healthy"; then
        echo -e "${GREEN}OK: Database connections: Working${NC}"
        ((APP_PASSED++))
    else
        echo -e "${RED}ERROR: Database connections: Not working${NC}"
        ((APP_FAILED++))
        
        # Show backend pod logs if available
        BACKEND_POD=$(kubectl get pods -n kayak -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        if [ -n "$BACKEND_POD" ]; then
            echo "  Recent backend logs:"
            kubectl logs "$BACKEND_POD" -n kayak --tail=20 2>/dev/null | grep -i "database\|connection\|error" | tail -5 | sed 's/^/    /' || echo "    (no relevant logs)"
        fi
    fi
else
    echo -e "${RED}ERROR: Database connections: Cannot test (no backend URL)${NC}"
    ((APP_FAILED++))
fi

# Frontend-Backend connectivity
if [ -n "$FRONTEND_URL" ] && [ -n "$BACKEND_URL" ]; then
    echo -e "${GREEN}OK: Frontend  Backend: URLs available${NC}"
    echo "    Frontend: $FRONTEND_URL"
    echo "    Backend: $BACKEND_URL"
    ((APP_PASSED++))
else
    echo -e "${RED}ERROR: Frontend  Backend: Cannot verify (missing URLs)${NC}"
    ((APP_FAILED++))
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=========================="
echo "SUMMARY"
echo "=========================="

echo ""
echo "INFRASTRUCTURE DEPLOYMENT:"
if [ $INFRA_FAILED -eq 0 ]; then
    echo -e "  ${GREEN}OK: 100% Complete ($INFRA_PASSED/$INFRA_PASSED)${NC}"
else
    PERCENT=$((INFRA_PASSED * 100 / (INFRA_PASSED + INFRA_FAILED)))
    echo -e "  ${YELLOW}WARNING: $PERCENT% Complete ($INFRA_PASSED passed, $INFRA_FAILED failed)${NC}"
fi

echo ""
echo "APPLICATION FUNCTIONALITY:"
if [ $APP_FAILED -eq 0 ]; then
    echo -e "  ${GREEN}OK: 100% Complete ($APP_PASSED/$APP_PASSED)${NC}"
else
    PERCENT=$((APP_PASSED * 100 / (APP_PASSED + APP_FAILED)))
    echo -e "  ${YELLOW}WARNING: $PERCENT% Complete ($APP_PASSED passed, $APP_FAILED failed)${NC}"
fi

echo ""
if [ $INFRA_FAILED -eq 0 ] && [ $APP_FAILED -eq 0 ]; then
    echo -e "${GREEN}OK: All checks passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}WARNING: Some checks failed. Review the output above.${NC}"
    exit 1
fi

