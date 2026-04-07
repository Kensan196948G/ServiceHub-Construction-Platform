/**
 * Re-exports from auto-generated OpenAPI types.
 * Use these types instead of hand-written interfaces in api/ modules.
 *
 * Usage:
 *   import type { ProjectResponse, ProjectCreate } from "@/generated";
 */

export type { paths, components, operations } from "./api-types";

// Convenience aliases for commonly used schema types
type Schemas = import("./api-types").components["schemas"];

// --- Projects ---
export type ProjectResponse = Schemas["ProjectResponse"];
export type ProjectCreate = Schemas["ProjectCreate"];
export type ProjectUpdate = Schemas["ProjectUpdate"];

// --- Cost ---
export type CostRecordResponse = Schemas["CostRecordResponse"];
export type CostRecordCreate = Schemas["CostRecordCreate"];
export type CostSummary = Schemas["CostSummary"];
export type WorkHourResponse = Schemas["WorkHourResponse"];
export type WorkHourCreate = Schemas["WorkHourCreate"];

// --- Daily Reports ---
export type DailyReportResponse = Schemas["DailyReportResponse"];
export type DailyReportCreate = Schemas["DailyReportCreate"];
export type DailyReportUpdate = Schemas["DailyReportUpdate"];

// --- Safety ---
export type SafetyCheckResponse = Schemas["SafetyCheckResponse"];
export type SafetyCheckCreate = Schemas["SafetyCheckCreate"];

// --- ITSM ---
export type IncidentResponse = Schemas["IncidentResponse"];
export type IncidentCreate = Schemas["IncidentCreate"];
export type IncidentUpdate = Schemas["IncidentUpdate"];
export type ChangeRequestResponse = Schemas["ChangeRequestResponse"];
export type ChangeRequestCreate = Schemas["ChangeRequestCreate"];
export type ChangeRequestUpdate = Schemas["ChangeRequestUpdate"];

// --- Knowledge ---
export type KnowledgeArticleResponse = Schemas["KnowledgeArticleResponse"];
export type KnowledgeArticleCreate = Schemas["KnowledgeArticleCreate"];

// --- Users ---
export type UserResponse = Schemas["UserResponse"];
export type UserCreate = Schemas["UserCreate"];

// --- Auth ---
export type LoginRequest = Schemas["LoginRequest"];
export type TokenResponse = Schemas["TokenResponse"];

// --- Common ---
export type PaginationMeta = Schemas["PaginationMeta"];
