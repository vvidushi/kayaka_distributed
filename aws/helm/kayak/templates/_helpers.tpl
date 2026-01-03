{{/*
Expand the name of the chart.
*/}}
{{- define "kayak.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "kayak.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kayak.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kayak.labels" -}}
helm.sh/chart: {{ include "kayak.chart" . }}
{{ include "kayak.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: kayak
environment: {{ .Values.global.environment }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kayak.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kayak.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "kayak.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "kayak.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate image name with registry
Usage: {{ include "kayak.image" (dict "root" . "image" .Values.component.image) }}
Or for backward compatibility: {{ include "kayak.image" . }} when . is the root context
*/}}
{{- define "kayak.image" -}}
{{- if .root -}}
  {{- $registry := .root.Values.global.imageRegistry -}}
  {{- $repository := .image.repository -}}
  {{- $tag := .image.tag | default "latest" -}}
  {{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else if .Values -}}
  {{- $registry := .Values.global.imageRegistry -}}
  {{- $repository := .repository -}}
  {{- $tag := .tag | default "latest" -}}
  {{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
  {{- fail "kayak.image template requires either root context or image object with registry" -}}
{{- end -}}
{{- end }}

{{/*
Component specific labels
*/}}
{{- define "kayak.componentLabels" -}}
{{ include "kayak.labels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Component selector labels
*/}}
{{- define "kayak.componentSelectorLabels" -}}
{{ include "kayak.selectorLabels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end }}
