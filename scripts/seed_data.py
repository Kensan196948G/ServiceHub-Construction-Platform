#!/usr/bin/env python3
"""
ServiceHub 開発用シードデータ投入スクリプト
Usage: docker exec servicehub-api python3 /app/scripts/seed_data.py
   OR: cd backend && python3 ../scripts/seed_data.py
"""

import asyncio
import sys
from datetime import date, datetime
from decimal import Decimal

sys.path.insert(0, "/app")

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.base import AsyncSessionLocal
from app.models.cost import CostRecord
from app.models.daily_report import DailyReport
from app.models.itsm import Incident
from app.models.knowledge import KnowledgeArticle
from app.models.project import Project
from app.models.safety import SafetyCheck
from app.models.user import User

# ---------------------------------------------------------------------------
# ユーザー定義
# ---------------------------------------------------------------------------
USERS = [
    {
        "email": "admin@servicehub.local",
        "password": "Admin1234!",
        "full_name": "管理者",
        "role": "ADMIN",
    },
    {
        "email": "pm@servicehub.local",
        "password": "Pass1234!",
        "full_name": "工事部長 田中",
        "role": "PROJECT_MANAGER",
    },
    {
        "email": "supervisor@servicehub.local",
        "password": "Pass1234!",
        "full_name": "現場監督 鈴木",
        "role": "SITE_SUPERVISOR",
    },
    {
        "email": "cost@servicehub.local",
        "password": "Pass1234!",
        "full_name": "原価管理 山田",
        "role": "COST_MANAGER",
    },
    {
        "email": "itop@servicehub.local",
        "password": "Pass1234!",
        "full_name": "IT運用 佐藤",
        "role": "IT_OPERATOR",
    },
    {
        "email": "viewer@servicehub.local",
        "password": "Pass1234!",
        "full_name": "閲覧ユーザー",
        "role": "VIEWER",
    },
]

# ---------------------------------------------------------------------------
# 工事案件定義
# ---------------------------------------------------------------------------
PROJECTS = [
    {
        "project_code": "SHB-2026-001",
        "name": "渋谷オフィスビル新築工事",
        "description": "渋谷区内の大型オフィスビル新築工事。地上20階建て、延床面積15,000㎡。",
        "client_name": "渋谷デベロップメント株式会社",
        "site_address": "東京都渋谷区道玄坂1丁目",
        "status": "IN_PROGRESS",
        "start_date": date(2026, 1, 15),
        "end_date": date(2027, 6, 30),
        "budget": Decimal("500000000"),
    },
    {
        "project_code": "SHG-2026-002",
        "name": "品川マンション改修工事",
        "description": "築30年の分譲マンション大規模修繕工事。外壁・屋上防水・共用設備更新。",
        "client_name": "品川マンション管理組合",
        "site_address": "東京都品川区大崎2丁目",
        "status": "PLANNING",
        "start_date": date(2026, 4, 1),
        "end_date": date(2026, 12, 31),
        "budget": Decimal("200000000"),
    },
    {
        "project_code": "YKH-2026-003",
        "name": "横浜工場設備更新工事",
        "description": "製造ライン全面刷新に伴う設備基盤更新工事。電気・空調・給排水設備を含む。",
        "client_name": "横浜製造株式会社",
        "site_address": "神奈川県横浜市鶴見区末広町",
        "status": "IN_PROGRESS",
        "start_date": date(2026, 2, 1),
        "end_date": date(2027, 3, 31),
        "budget": Decimal("800000000"),
    },
]

# ---------------------------------------------------------------------------
# 日報定義（各案件 2 件）
# ---------------------------------------------------------------------------
def _daily_reports(project_ids: list) -> list[dict]:
    reports = []
    report_data = [
        # project[0]: 渋谷オフィスビル
        {
            "project_idx": 0,
            "report_date": date(2026, 5, 20),
            "weather": "SUNNY",
            "temperature": 22,
            "worker_count": 45,
            "work_content": "3F躯体工事：型枠組立・配筋作業。コンクリート打設準備完了。",
            "safety_check": True,
            "safety_notes": "朝礼時に安全確認実施。作業区画内への一般人立入防止柵を再確認。",
            "progress_rate": 35,
            "issues": None,
            "status": "APPROVED",
        },
        {
            "project_idx": 0,
            "report_date": date(2026, 5, 21),
            "weather": "CLOUDY",
            "temperature": 19,
            "worker_count": 48,
            "work_content": "3Fコンクリート打設作業。打設量: 120㎥。養生シート設置完了。",
            "safety_check": True,
            "safety_notes": "コンクリートポンプ車周辺の立入禁止区域設定を徹底確認。",
            "progress_rate": 37,
            "issues": "ポンプ車の到着が30分遅延。工程への影響は軽微。",
            "status": "SUBMITTED",
        },
        # project[1]: 品川マンション
        {
            "project_idx": 1,
            "report_date": date(2026, 4, 10),
            "weather": "SUNNY",
            "temperature": 18,
            "worker_count": 12,
            "work_content": "外壁調査・劣化部位マーキング作業。足場組立開始（西面）。",
            "safety_check": True,
            "safety_notes": "居住者への安全周知チラシ配布済み。足場昇降口に施錠確認。",
            "progress_rate": 8,
            "issues": None,
            "status": "APPROVED",
        },
        {
            "project_idx": 1,
            "report_date": date(2026, 4, 11),
            "weather": "RAINY",
            "temperature": 14,
            "worker_count": 8,
            "work_content": "雨天のため外部作業中断。屋上防水既存撤去の内部準備作業を実施。",
            "safety_check": True,
            "safety_notes": "雨天時作業安全基準を確認。滑りやすい通路にコーンを設置。",
            "progress_rate": 9,
            "issues": "降雨により外部作業を1日停止。工程再調整が必要。",
            "status": "APPROVED",
        },
        # project[2]: 横浜工場
        {
            "project_idx": 2,
            "report_date": date(2026, 5, 15),
            "weather": "SUNNY",
            "temperature": 24,
            "worker_count": 30,
            "work_content": "既設電気設備の撤去作業。高圧盤・分電盤の解体・搬出。",
            "safety_check": True,
            "safety_notes": "高圧活線作業のため、停電確認証の確認を徹底。絶縁手袋着用全員確認済み。",
            "progress_rate": 20,
            "issues": None,
            "status": "APPROVED",
        },
        {
            "project_idx": 2,
            "report_date": date(2026, 5, 16),
            "weather": "SUNNY",
            "temperature": 26,
            "worker_count": 35,
            "work_content": "新規電気設備の搬入・設置作業開始。主幹盤の据付・アンカー固定。",
            "safety_check": True,
            "safety_notes": "重量機器搬入のため、クレーン作業半径内への立入禁止を徹底。",
            "progress_rate": 23,
            "issues": "搬入経路の床養生が一部不足。追加資材を手配済み。",
            "status": "SUBMITTED",
        },
    ]
    for d in report_data:
        d["project_id"] = project_ids[d.pop("project_idx")]
    return report_data


# ---------------------------------------------------------------------------
# 安全チェック定義（各案件 1 件）
# ---------------------------------------------------------------------------
def _safety_checks(project_ids: list, inspector_id) -> list[dict]:
    return [
        {
            "project_id": project_ids[0],
            "check_date": date(2026, 5, 20),
            "check_type": "DAILY",
            "items_total": 10,
            "items_ok": 10,
            "items_ng": 0,
            "overall_result": "OK",
            "notes": "安全靴確認: 全員OK。ヘルメット確認: 全員OK。作業区画確認: 正常。高所作業安全帯確認: 全員装着済み。",
            "inspector_id": inspector_id,
        },
        {
            "project_id": project_ids[1],
            "check_date": date(2026, 4, 10),
            "check_type": "DAILY",
            "items_total": 8,
            "items_ok": 8,
            "items_ng": 0,
            "overall_result": "OK",
            "notes": "安全靴確認: 全員OK。ヘルメット確認: 全員OK。作業区画確認: 居住者動線との分離を確認。",
            "inspector_id": inspector_id,
        },
        {
            "project_id": project_ids[2],
            "check_date": date(2026, 5, 15),
            "check_type": "DAILY",
            "items_total": 12,
            "items_ok": 11,
            "items_ng": 1,
            "overall_result": "NG",
            "notes": "安全靴確認: 全員OK。ヘルメット確認: 全員OK。絶縁手袋確認: 1名不備→即時対応済み。作業区画確認: 正常。",
            "inspector_id": inspector_id,
        },
    ]


# ---------------------------------------------------------------------------
# 原価記録定義（各案件 2 件）
# ---------------------------------------------------------------------------
def _cost_records(project_ids: list) -> list[dict]:
    return [
        # project[0]
        {
            "project_id": project_ids[0],
            "record_date": date(2026, 5, 20),
            "category": "MATERIAL",
            "description": "3F躯体工事用生コンクリート（普通コンクリート 24-15-20 BB）",
            "budgeted_amount": Decimal("3600000"),
            "actual_amount": Decimal("3480000"),
            "vendor_name": "東京レミコン株式会社",
            "invoice_number": "TRC-2026-05-0342",
            "notes": "打設量120㎥。単価29,000円/㎥",
        },
        {
            "project_id": project_ids[0],
            "record_date": date(2026, 5, 20),
            "category": "LABOR",
            "description": "躯体工事作業員賃金（型枠・鉄筋・コンクリート打設）",
            "budgeted_amount": Decimal("2250000"),
            "actual_amount": Decimal("2160000"),
            "vendor_name": "東京建設労働組合",
            "invoice_number": None,
            "notes": "45名 × 8時間 × 6,000円",
        },
        # project[1]
        {
            "project_id": project_ids[1],
            "record_date": date(2026, 4, 10),
            "category": "MATERIAL",
            "description": "外壁調査・足場組立資材（仮設資材レンタル含む）",
            "budgeted_amount": Decimal("1500000"),
            "actual_amount": Decimal("1420000"),
            "vendor_name": "品川仮設工業株式会社",
            "invoice_number": "SKK-2026-04-0087",
            "notes": "足場面積600㎡分",
        },
        {
            "project_id": project_ids[1],
            "record_date": date(2026, 4, 10),
            "category": "LABOR",
            "description": "外壁調査・足場組立作業員賃金",
            "budgeted_amount": Decimal("720000"),
            "actual_amount": Decimal("672000"),
            "vendor_name": None,
            "invoice_number": None,
            "notes": "12名 × 8時間 × 7,000円",
        },
        # project[2]
        {
            "project_id": project_ids[2],
            "record_date": date(2026, 5, 15),
            "category": "MATERIAL",
            "description": "新規高圧受変電設備一式（主幹盤・分電盤・制御盤）",
            "budgeted_amount": Decimal("45000000"),
            "actual_amount": Decimal("43500000"),
            "vendor_name": "横浜電機設備株式会社",
            "invoice_number": "YDE-2026-05-0019",
            "notes": "主要機器搬入完了。取付工事は翌週開始。",
        },
        {
            "project_id": project_ids[2],
            "record_date": date(2026, 5, 15),
            "category": "LABOR",
            "description": "電気設備撤去・搬入作業員賃金",
            "budgeted_amount": Decimal("1800000"),
            "actual_amount": Decimal("1680000"),
            "vendor_name": None,
            "invoice_number": None,
            "notes": "30名 × 8時間 × 7,000円",
        },
    ]


# ---------------------------------------------------------------------------
# ITSM インシデント定義
# ---------------------------------------------------------------------------
def _incidents(project_ids: list, assigned_to) -> list[dict]:
    return [
        {
            "incident_number": "INC-2026-001",
            "title": "工事管理システム応答遅延",
            "description": (
                "工事管理システムへのアクセス時にページロードが通常の5倍以上かかる事象が発生。"
                "午前10時頃から発生しており、現場作業員からの日報投入業務に支障が出ている。"
                "DBサーバーのCPU使用率が85%を超えていることを確認。"
            ),
            "category": "SYSTEM",
            "priority": "HIGH",
            "severity": "HIGH",
            "status": "IN_PROGRESS",
            "assigned_to": assigned_to,
            "project_id": project_ids[0],
            "resolution": None,
            "resolved_at": None,
        },
        {
            "incident_number": "INC-2026-002",
            "title": "写真アップロード失敗",
            "description": (
                "現場写真のアップロード機能において、5MB以上のJPEGファイルのアップロードが"
                "失敗する事象が報告されている。エラーコード: HTTP 413 Request Entity Too Large。"
                "nginxの設定変更が原因の可能性あり。"
            ),
            "category": "APPLICATION",
            "priority": "MEDIUM",
            "severity": "MEDIUM",
            "status": "OPEN",
            "assigned_to": assigned_to,
            "project_id": None,
            "resolution": None,
            "resolved_at": None,
        },
    ]


# ---------------------------------------------------------------------------
# ナレッジ記事定義
# ---------------------------------------------------------------------------
KNOWLEDGE_ARTICLES = [
    {
        "title": "工事現場安全管理マニュアル",
        "content": """# 工事現場安全管理マニュアル

## 1. 基本方針
すべての工事において安全を最優先とし、労働災害ゼロを目標とする。

## 2. 毎朝の安全確認事項
- 安全靴・ヘルメット・安全帯の着用確認
- 作業区画の設定と一般立入禁止区域の確認
- 重機・車両の点検記録確認
- 天気・気温に応じた熱中症・凍傷対策

## 3. 高所作業（2m以上）
- 安全帯の使用を義務付ける
- 墜落防止ネットの設置
- 作業前に手摺・昇降設備の点検

## 4. 重機作業
- オペレータの資格確認（車両系建設機械運転技能講習修了証）
- 作業半径内への立入禁止
- 誘導員の配置

## 5. 電気作業
- 停電確認証（LOTO）の確認
- 絶縁保護具の着用
- 活線作業は有資格者のみ

## 6. 緊急連絡体制
緊急時は直ちに現場監督へ報告し、119番・110番への通報を実施する。
""",
        "category": "SAFETY",
        "tags": "安全管理,現場,マニュアル,ヘルメット,安全靴",
        "is_published": True,
        "view_count": 42,
        "rating": 4.8,
    },
    {
        "title": "コスト管理のベストプラクティス",
        "content": """# コスト管理のベストプラクティス

## 1. 予算管理の基本
- 工事着手前に詳細な積算・予算計画を策定
- 月次での実績対比レポートを作成し、乖離を早期発見
- 予算超過が見込まれる場合は早期に上位者へ報告・承認を得る

## 2. 原価記録の入力ルール
- 請求書受領後5営業日以内にシステム入力
- 材料費・労務費・外注費・経費を明確に分類
- 請求書番号を必ず紐付けること

## 3. 出来高管理
- 週次で作業進捗率を更新
- EVM（アーンドバリュー管理）手法を活用してコスト効率を評価
- CPI（コスト効率指数）が0.9を下回った場合は要因分析を実施

## 4. 変更工事の対応
- 追加工事は必ず変更契約を締結してから着手
- 口頭発注は厳禁。書面または電子承認を取得すること

## 5. 完成工事原価の締め
- 工事完了後30日以内に最終原価を確定
- 予算対実績の分析レポートを作成し、次回工事の積算精度向上に活用
""",
        "category": "COST",
        "tags": "コスト管理,予算,原価,EVM,ベストプラクティス",
        "is_published": True,
        "view_count": 28,
        "rating": 4.5,
    },
    {
        "title": "ITSM運用手順書",
        "content": """# ITSM運用手順書

## 1. インシデント管理プロセス

### 1.1 インシデント受付
- メール・電話・チケットシステムによる受付
- 受付後15分以内に優先度を設定し、担当者をアサイン

### 1.2 優先度定義
| 優先度 | 対応開始 | 解決目標 |
|--------|---------|---------|
| CRITICAL | 即時 | 2時間以内 |
| HIGH | 1時間以内 | 8時間以内 |
| MEDIUM | 4時間以内 | 24時間以内 |
| LOW | 翌営業日 | 72時間以内 |

### 1.3 エスカレーション
- 解決目標時間の75%経過時点でエスカレーション実施
- CRITICALは即時マネージャーへ報告

## 2. 変更管理プロセス

### 2.1 変更要求の申請
- 本番環境への変更はすべて変更要求チケットを作成
- インパクト・リスク評価を必ず記載
- ロールバック計画を策定してから承認申請

### 2.2 緊急変更
- 重大インシデント対応のみ適用
- 実施後24時間以内に事後承認を取得

## 3. 問題管理
- 同一事象が月3回以上発生した場合は問題管理チケットを起票
- 根本原因分析（RCA）を実施し再発防止策を策定
""",
        "category": "PROCEDURE",
        "tags": "ITSM,インシデント管理,変更管理,運用,ISO20000",
        "is_published": True,
        "view_count": 15,
        "rating": 4.2,
    },
]


# ---------------------------------------------------------------------------
# メイン処理
# ---------------------------------------------------------------------------
async def seed():
    counts = {
        "users": 0,
        "projects": 0,
        "daily_reports": 0,
        "safety_checks": 0,
        "cost_records": 0,
        "incidents": 0,
        "knowledge_articles": 0,
    }
    skipped = {k: 0 for k in counts}

    async with AsyncSessionLocal() as session:
        # ----------------------------------------------------------------
        # 1. ユーザー
        # ----------------------------------------------------------------
        print("\n[1/7] ユーザー投入中...")
        user_objs: dict[str, User] = {}
        for u in USERS:
            result = await session.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  SKIP  {u['email']} (既存)")
                skipped["users"] += 1
                user_objs[u["email"]] = existing
                continue
            user = User(
                email=u["email"],
                hashed_password=get_password_hash(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                is_active=True,
            )
            session.add(user)
            await session.flush()
            user_objs[u["email"]] = user
            print(f"  OK    {u['email']} ({u['role']})")
            counts["users"] += 1

        pm_user = user_objs.get("pm@servicehub.local")
        supervisor_user = user_objs.get("supervisor@servicehub.local")
        itop_user = user_objs.get("itop@servicehub.local")
        admin_user = user_objs.get("admin@servicehub.local")

        # ----------------------------------------------------------------
        # 2. 工事案件
        # ----------------------------------------------------------------
        print("\n[2/7] 工事案件投入中...")
        project_ids = []
        for p in PROJECTS:
            result = await session.execute(
                select(Project).where(Project.project_code == p["project_code"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  SKIP  {p['project_code']} (既存)")
                skipped["projects"] += 1
                project_ids.append(existing.id)
                continue
            project = Project(
                project_code=p["project_code"],
                name=p["name"],
                description=p["description"],
                client_name=p["client_name"],
                site_address=p["site_address"],
                status=p["status"],
                start_date=p["start_date"],
                end_date=p["end_date"],
                budget=p["budget"],
                manager_id=pm_user.id if pm_user else None,
                created_by=admin_user.id if admin_user else None,
            )
            session.add(project)
            await session.flush()
            project_ids.append(project.id)
            print(f"  OK    {p['project_code']} {p['name']}")
            counts["projects"] += 1

        # ----------------------------------------------------------------
        # 3. 日報
        # ----------------------------------------------------------------
        print("\n[3/7] 日報投入中...")
        for rd in _daily_reports(project_ids):
            result = await session.execute(
                select(DailyReport).where(
                    DailyReport.project_id == rd["project_id"],
                    DailyReport.report_date == rd["report_date"],
                )
            )
            if result.scalar_one_or_none():
                print(f"  SKIP  日報 {rd['report_date']} (既存)")
                skipped["daily_reports"] += 1
                continue
            report = DailyReport(
                project_id=rd["project_id"],
                report_date=rd["report_date"],
                weather=rd["weather"],
                temperature=rd["temperature"],
                worker_count=rd["worker_count"],
                work_content=rd["work_content"],
                safety_check=rd["safety_check"],
                safety_notes=rd["safety_notes"],
                progress_rate=rd["progress_rate"],
                issues=rd["issues"],
                status=rd["status"],
                created_by=supervisor_user.id if supervisor_user else None,
            )
            session.add(report)
            print(f"  OK    日報 {rd['report_date']} 進捗{rd['progress_rate']}%")
            counts["daily_reports"] += 1

        # ----------------------------------------------------------------
        # 4. 安全チェック
        # ----------------------------------------------------------------
        print("\n[4/7] 安全チェック投入中...")
        inspector_id = supervisor_user.id if supervisor_user else None
        for sc in _safety_checks(project_ids, inspector_id):
            result = await session.execute(
                select(SafetyCheck).where(
                    SafetyCheck.project_id == sc["project_id"],
                    SafetyCheck.check_date == sc["check_date"],
                    SafetyCheck.check_type == sc["check_type"],
                )
            )
            if result.scalar_one_or_none():
                print(f"  SKIP  安全チェック {sc['check_date']} (既存)")
                skipped["safety_checks"] += 1
                continue
            check = SafetyCheck(
                project_id=sc["project_id"],
                check_date=sc["check_date"],
                check_type=sc["check_type"],
                items_total=sc["items_total"],
                items_ok=sc["items_ok"],
                items_ng=sc["items_ng"],
                overall_result=sc["overall_result"],
                notes=sc["notes"],
                inspector_id=sc["inspector_id"],
                created_by=supervisor_user.id if supervisor_user else None,
            )
            session.add(check)
            print(f"  OK    安全チェック {sc['check_date']} 結果:{sc['overall_result']}")
            counts["safety_checks"] += 1

        # ----------------------------------------------------------------
        # 5. 原価記録
        # ----------------------------------------------------------------
        print("\n[5/7] 原価記録投入中...")
        for cr in _cost_records(project_ids):
            result = await session.execute(
                select(CostRecord).where(
                    CostRecord.project_id == cr["project_id"],
                    CostRecord.record_date == cr["record_date"],
                    CostRecord.description == cr["description"],
                )
            )
            if result.scalar_one_or_none():
                print(f"  SKIP  原価記録 {cr['record_date']} {cr['category']} (既存)")
                skipped["cost_records"] += 1
                continue
            cost = CostRecord(
                project_id=cr["project_id"],
                record_date=cr["record_date"],
                category=cr["category"],
                description=cr["description"],
                budgeted_amount=cr["budgeted_amount"],
                actual_amount=cr["actual_amount"],
                vendor_name=cr["vendor_name"],
                invoice_number=cr["invoice_number"],
                notes=cr["notes"],
                created_by=admin_user.id if admin_user else None,
            )
            session.add(cost)
            print(f"  OK    原価記録 {cr['record_date']} {cr['category']} ¥{cr['actual_amount']:,}")
            counts["cost_records"] += 1

        # ----------------------------------------------------------------
        # 6. ITSM インシデント
        # ----------------------------------------------------------------
        print("\n[6/7] ITSMインシデント投入中...")
        assigned = itop_user.id if itop_user else None
        for inc in _incidents(project_ids, assigned):
            result = await session.execute(
                select(Incident).where(
                    Incident.incident_number == inc["incident_number"]
                )
            )
            if result.scalar_one_or_none():
                print(f"  SKIP  {inc['incident_number']} (既存)")
                skipped["incidents"] += 1
                continue
            incident = Incident(
                incident_number=inc["incident_number"],
                title=inc["title"],
                description=inc["description"],
                category=inc["category"],
                priority=inc["priority"],
                severity=inc["severity"],
                status=inc["status"],
                assigned_to=inc["assigned_to"],
                project_id=inc["project_id"],
                resolution=inc["resolution"],
                resolved_at=inc["resolved_at"],
                created_by=itop_user.id if itop_user else None,
            )
            session.add(incident)
            print(f"  OK    {inc['incident_number']} [{inc['priority']}] {inc['title']}")
            counts["incidents"] += 1

        # ----------------------------------------------------------------
        # 7. ナレッジ記事
        # ----------------------------------------------------------------
        print("\n[7/7] ナレッジ記事投入中...")
        for ka in KNOWLEDGE_ARTICLES:
            result = await session.execute(
                select(KnowledgeArticle).where(KnowledgeArticle.title == ka["title"])
            )
            if result.scalar_one_or_none():
                print(f"  SKIP  {ka['title'][:30]}... (既存)")
                skipped["knowledge_articles"] += 1
                continue
            article = KnowledgeArticle(
                title=ka["title"],
                content=ka["content"],
                category=ka["category"],
                tags=ka["tags"],
                is_published=ka["is_published"],
                view_count=ka["view_count"],
                rating=ka["rating"],
                created_by=admin_user.id if admin_user else None,
            )
            session.add(article)
            print(f"  OK    {ka['title']}")
            counts["knowledge_articles"] += 1

        # ----------------------------------------------------------------
        # コミット
        # ----------------------------------------------------------------
        await session.commit()

    # ----------------------------------------------------------------
    # サマリー表示
    # ----------------------------------------------------------------
    print("\n" + "=" * 60)
    print("  シードデータ投入完了")
    print("=" * 60)
    print(f"  {'種別':<20} {'新規':>6}  {'スキップ':>8}")
    print("-" * 42)
    labels = {
        "users": "ユーザー",
        "projects": "工事案件",
        "daily_reports": "日報",
        "safety_checks": "安全チェック",
        "cost_records": "原価記録",
        "incidents": "ITSMインシデント",
        "knowledge_articles": "ナレッジ記事",
    }
    total_new = 0
    total_skip = 0
    for key, label in labels.items():
        n = counts[key]
        s = skipped[key]
        total_new += n
        total_skip += s
        print(f"  {label:<20} {n:>6}件   {s:>6}件")
    print("-" * 42)
    print(f"  {'合計':<20} {total_new:>6}件   {total_skip:>6}件")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
