import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building,
  Book,
  Calendar,
  Clock,
  Coins,
  FileText,
  Settings,
  Shield,
  Users,
} from "lucide-react";

export type NoticeCategory =
  | "重要"
  | "人事"
  | "ITSM"
  | "福利厚生"
  | "規程"
  | "安全";

export interface Notice {
  id: number;
  pinned: boolean;
  cat: NoticeCategory;
  title: string;
  date: string;
  by: string;
  readCount?: [number, number];
}

export interface EventItem {
  date: string;
  day: string;
  title: string;
  loc: string;
  color: string;
}

export interface QuickLink {
  label: string;
  icon: LucideIcon;
  href?: string;
}

export interface HRKpi {
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "warn" | "err";
}

export interface HRMenu {
  icon: LucideIcon;
  label: string;
  desc: string;
}

export interface Application {
  kind: string;
  period: string;
  appliedAt: string;
  approver: string;
  status: "承認待ち" | "承認済" | "差戻し";
  tone: "warn" | "ok" | "err";
}

export interface RuleCategory {
  icon: LucideIcon;
  label: string;
  count: number;
  desc: string;
}

export interface RuleRevision {
  title: string;
  ver: string;
  date: string;
  diff: string;
}

export interface BirthdayMember {
  name: string;
  date: string;
  dept: string;
}

export const notices: Notice[] = [
  {
    id: 1,
    pinned: true,
    cat: "重要",
    title: "2026 年度 安全衛生方針の公開について",
    date: "2026-04-15",
    by: "安全管理部",
    readCount: [128, 180],
  },
  {
    id: 2,
    pinned: true,
    cat: "人事",
    title: "新入社員配属先のお知らせ（2026 年 4 月入社）",
    date: "2026-04-12",
    by: "人事部",
    readCount: [145, 180],
  },
  {
    id: 3,
    pinned: false,
    cat: "ITSM",
    title: "社内システム定期メンテナンス（4/27 22:00-24:00）",
    date: "2026-04-10",
    by: "情報システム部",
  },
  {
    id: 4,
    pinned: false,
    cat: "福利厚生",
    title: "健康診断 2026 年度スケジュール確定のご案内",
    date: "2026-04-08",
    by: "総務部",
  },
  {
    id: 5,
    pinned: false,
    cat: "規程",
    title: "テレワーク規程改訂（2026-05-01 施行）",
    date: "2026-04-05",
    by: "総務部",
  },
  {
    id: 6,
    pinned: false,
    cat: "安全",
    title: "熱中症対策ガイドライン更新",
    date: "2026-04-02",
    by: "安全管理部",
  },
];

export const events: EventItem[] = [
  { date: "4/22", day: "火", title: "月次全社朝礼", loc: "本社 3F 会議室", color: "brand" },
  { date: "4/25", day: "金", title: "安全パトロール", loc: "第 2 現場", color: "safety" },
  { date: "4/27", day: "日", title: "システムメンテナンス", loc: "オンライン", color: "warn" },
  { date: "5/01", day: "木", title: "新テレワーク規程施行", loc: "—", color: "ok" },
  { date: "5/10", day: "土", title: "ファミリーデイ", loc: "本社ビル", color: "brand" },
];

export const quickLinks: QuickLink[] = [
  { label: "申請書類", icon: FileText },
  { label: "就業規則", icon: Book },
  { label: "安全マニュアル", icon: Shield },
  { label: "経費精算", icon: Coins },
  { label: "勤怠打刻", icon: Clock },
  { label: "社員名簿", icon: Users },
  { label: "施設予約", icon: Building },
  { label: "設定", icon: Settings },
];

export const hrKpis: HRKpi[] = [
  { label: "今月稼働日", value: "13 / 21", sub: "進捗 62%" },
  { label: "有給残", value: "12.5 日", sub: "期末まで 5.2 ヶ月" },
  { label: "超過勤務 (今月)", value: "8.5 h", sub: "月上限 45h", tone: "ok" },
  { label: "承認待ち申請", value: "2 件", sub: "最古 3 日前", tone: "warn" },
];

export const hrMenus: HRMenu[] = [
  { icon: Clock, label: "勤怠打刻", desc: "出退勤の登録" },
  { icon: FileText, label: "各種申請", desc: "有休・出張・交通費" },
  { icon: Coins, label: "給与明細", desc: "過去 12 ヶ月閲覧可能" },
  { icon: Calendar, label: "勤務シフト", desc: "月次シフト表" },
  { icon: Users, label: "社員名簿", desc: "部門・連絡先" },
  { icon: Settings, label: "人事設定", desc: "届出情報変更" },
];

export const applications: Application[] = [
  {
    kind: "有給休暇",
    period: "2026-04-24",
    appliedAt: "2026-04-15",
    approver: "山田 太郎",
    status: "承認待ち",
    tone: "warn",
  },
  {
    kind: "出張申請",
    period: "2026-04-28 〜 04-30",
    appliedAt: "2026-04-14",
    approver: "鈴木 花子",
    status: "承認済",
    tone: "ok",
  },
  {
    kind: "交通費",
    period: "2026-03 分",
    appliedAt: "2026-04-02",
    approver: "経理部",
    status: "差戻し",
    tone: "err",
  },
  {
    kind: "在宅勤務",
    period: "2026-04-20",
    appliedAt: "2026-04-17",
    approver: "山田 太郎",
    status: "承認待ち",
    tone: "warn",
  },
];

export const ruleCategories: RuleCategory[] = [
  { icon: Users, label: "就業規則", count: 24, desc: "勤務時間・休暇・服務規律" },
  { icon: Coins, label: "給与・報酬規程", count: 12, desc: "給与体系・手当・賞与" },
  { icon: Shield, label: "安全衛生規程", count: 18, desc: "労災予防・健康管理" },
  { icon: FileText, label: "情報セキュリティ", count: 9, desc: "データ取扱・端末管理" },
  { icon: AlertTriangle, label: "コンプライアンス", count: 7, desc: "反社会的勢力対応ほか" },
  { icon: Building, label: "施設・車両", count: 11, desc: "利用ルール・予約" },
];

export const ruleRevisions: RuleRevision[] = [
  { title: "テレワーク規程", ver: "v2.3", date: "2026-04-05", diff: "+3 条 / 改正 2 箇所" },
  { title: "経費精算規程", ver: "v1.8", date: "2026-03-22", diff: "交通費区分を再定義" },
  { title: "情報セキュリティ基本方針", ver: "v4.0", date: "2026-03-01", diff: "全面改訂" },
  { title: "健康管理規程", ver: "v1.4", date: "2026-02-18", diff: "健診項目追加" },
];

export const birthdays: BirthdayMember[] = [
  { name: "佐藤 健一", date: "4/20", dept: "安全管理部" },
  { name: "田中 美咲", date: "4/23", dept: "工事部" },
  { name: "伊藤 涼", date: "4/28", dept: "情報システム部" },
];

export const newHires: BirthdayMember[] = [
  { name: "高橋 翔太", date: "4/01 入社", dept: "工事部" },
  { name: "渡辺 美香", date: "4/01 入社", dept: "人事部" },
];
