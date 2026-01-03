#!/bin/bash

# Quick deployment status check

echo "=== Deployment Status ==="
echo ""

echo "📦 Docker Build Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "No builds running"
echo ""

echo "🚢 Kubernetes Pods:"
kubectl get pods -n kayak-dev 2>/dev/null || echo "No pods yet"
echo ""

echo "🔐 Secrets:"
kubectl get secrets -n kayak-dev 2>/dev/null || echo "No secrets yet"
echo ""

echo "📊 Services:"
kubectl get svc -n kayak-dev 2>/dev/null || echo "No services yet"
echo ""

echo "🎯 Helm Releases:"
helm list -n kayak-dev 2>/dev/null || echo "No releases yet"
