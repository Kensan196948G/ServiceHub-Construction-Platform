import {
  ClipboardList, FileText, ShieldCheck, DollarSign, Image,
} from "lucide-react";
import { createElement } from "react";
import type { Photo } from "@/api/photos";

export const STATUS_LABELS: Record<string, string> = {
  PLANNING: "計画中", IN_PROGRESS: "進行中", COMPLETED: "完了",
  SUSPENDED: "保留", CANCELLED: "中止",
};
export const STATUS_BADGE_VARIANT: Record<string, "info" | "success" | "default" | "warning" | "danger"> = {
  PLANNING: "info",
  IN_PROGRESS: "success",
  COMPLETED: "default",
  SUSPENDED: "warning",
  CANCELLED: "danger",
};
export const WEATHER_LABELS: Record<string, string> = {
  SUNNY: "☀️ 晴れ", CLOUDY: "☁️ 曇り", RAINY: "🌧️ 雨", SNOWY: "❄️ 雪",
};
export const COST_CATEGORY_LABELS: Record<string, string> = {
  LABOR: "労務費", MATERIAL: "材料費", EQUIPMENT: "機械費",
  SUBCONTRACT: "外注費", OVERHEAD: "諸経費",
};
export const PHOTO_CATEGORY_LABELS: Record<Photo["category"], string> = {
  GENERAL: "一般", PROGRESS: "工程", SAFETY: "安全",
  COMPLETION: "完了", TROUBLE: "障害",
};
export const PHOTO_CATEGORY_VARIANT: Record<Photo["category"], "default" | "info" | "warning" | "success" | "danger"> = {
  GENERAL: "default",
  PROGRESS: "info",
  SAFETY: "warning",
  COMPLETION: "success",
  TROUBLE: "danger",
};

export type TabKey = "info" | "reports" | "safety" | "cost" | "photos";

export interface TabDef { key: TabKey; label: string; icon: React.ReactNode }
export const TABS: TabDef[] = [
  { key: "info",    label: "基本情報",     icon: createElement(ClipboardList, { className: "w-4 h-4" }) },
  { key: "reports", label: "日報",         icon: createElement(FileText, { className: "w-4 h-4" }) },
  { key: "safety",  label: "安全チェック", icon: createElement(ShieldCheck, { className: "w-4 h-4" }) },
  { key: "cost",    label: "原価",         icon: createElement(DollarSign, { className: "w-4 h-4" }) },
  { key: "photos",  label: "写真",         icon: createElement(Image, { className: "w-4 h-4" }) },
];
