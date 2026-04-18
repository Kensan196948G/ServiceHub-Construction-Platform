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
export type UserListResponse = Schemas["UserListResponse"];
export type UserCreate = Schemas["UserCreate"];
export type UserUpdate = Schemas["UserUpdate"];

// --- Auth ---
export type LoginRequest = Schemas["LoginRequest"];
export type TokenResponse = Schemas["TokenResponse"];

// --- Dashboard ---
export type ProjectStats = Schemas["ProjectStats"];
export type IncidentStats = Schemas["IncidentStats"];
export type CostOverview = Schemas["CostOverview"];
export type DashboardKPI = Schemas["DashboardKPI"];

// --- Knowledge (AI Search) ---
export type AiSearchRequest = Schemas["AiSearchRequest"];
export type AiSearchResult = Schemas["AiSearchResult"];
export type AiSearchResponse = Schemas["AiSearchResponse"];

// --- Safety (Quality Inspection) ---
export type QualityInspectionResponse = Schemas["QualityInspectionResponse"];
export type QualityInspectionCreate = Schemas["QualityInspectionCreate"];

// --- Photos ---
export type PhotoResponse = Schemas["PhotoResponse"];

// --- Common ---
export type PaginationMeta = Schemas["PaginationMeta"];

// --- Notifications (Phase 4) ---
export type NotificationDeliveryResponse = Schemas["NotificationDeliveryResponse"];
export type NotificationPreferenceResponse = Schemas["NotificationPreferenceResponse"];
export type NotificationPreferenceUpdate = Schemas["NotificationPreferenceUpdate"];
export type NotificationTestResponse = Schemas["NotificationTestResponse"];
