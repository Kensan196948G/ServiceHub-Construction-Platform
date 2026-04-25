{{/*
Expand the name of the chart.
*/}}
{{- define "servicehub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "servicehub.fullname" -}}
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
Create chart label.
*/}}
{{- define "servicehub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "servicehub.labels" -}}
helm.sh/chart: {{ include "servicehub.chart" . }}
{{ include "servicehub.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "servicehub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "servicehub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
ServiceAccount name.
*/}}
{{- define "servicehub.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "servicehub.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend full name.
*/}}
{{- define "servicehub.backend.fullname" -}}
{{- printf "%s-backend" (include "servicehub.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Frontend full name.
*/}}
{{- define "servicehub.frontend.fullname" -}}
{{- printf "%s-frontend" (include "servicehub.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Namespace name.
*/}}
{{- define "servicehub.namespace" -}}
{{- if .Values.namespace.create -}}
{{- .Values.namespace.name | default "servicehub" }}
{{- else -}}
{{- .Release.Namespace }}
{{- end }}
{{- end }}
