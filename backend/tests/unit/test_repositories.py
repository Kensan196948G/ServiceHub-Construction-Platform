"""
Repository層の単体テスト
全Repository: CRUD + soft_delete + フィルタリングをテスト
"""

import uuid
from datetime import date
from decimal import Decimal

from app.models.project import Project
from app.repositories.cost import CostRecordRepository, WorkHourRepository
from app.repositories.itsm import ChangeRequestRepository, IncidentRepository
from app.repositories.knowledge import (
    AiSearchLogRepository,
    KnowledgeArticleRepository,
)
from app.repositories.safety import (
    QualityInspectionRepository,
    SafetyCheckRepository,
)
from app.repositories.user import UserRepository
from app.schemas.cost import CostRecordCreate, CostRecordUpdate, WorkHourCreate
from app.schemas.itsm import (
    ChangeRequestCreate,
    ChangeRequestUpdate,
    IncidentCreate,
    IncidentUpdate,
)
from app.schemas.knowledge import KnowledgeArticleCreate, KnowledgeArticleUpdate
from app.schemas.safety import (
    QualityInspectionCreate,
    QualityInspectionUpdate,
    SafetyCheckCreate,
    SafetyCheckUpdate,
)
from app.schemas.user import UserCreate, UserUpdate

ACTOR_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
PROJECT_ID = uuid.UUID("00000000-0000-0000-0000-000000000099")


async def _create_project(db) -> Project:
    """テスト用プロジェクトを作成"""
    project = Project(
        id=PROJECT_ID,
        project_code="TEST-001",
        name="テストプロジェクト",
        client_name="テスト建設株式会社",
        status="ACTIVE",
        created_by=ACTOR_ID,
        updated_by=ACTOR_ID,
    )
    db.add(project)
    await db.flush()
    return project


# ===================== UserRepository =====================


class TestUserRepository:
    async def test_create_and_get_by_id(self, db_session):
        repo = UserRepository(db_session)
        data = UserCreate(
            email="test@example.com",
            full_name="テストユーザー",
            role="VIEWER",
            password="TestPass1!",
        )
        user = await repo.create(data, hashed_password="hashed_pw")
        assert user.id is not None
        assert user.email == "test@example.com"

        found = await repo.get_by_id(user.id)
        assert found is not None
        assert found.email == "test@example.com"

    async def test_get_by_email(self, db_session):
        repo = UserRepository(db_session)
        data = UserCreate(
            email="find@example.com",
            full_name="検索テスト",
            role="ADMIN",
            password="TestPass1!",
        )
        await repo.create(data, hashed_password="hashed")

        found = await repo.get_by_email("find@example.com")
        assert found is not None
        assert found.full_name == "検索テスト"

        not_found = await repo.get_by_email("nonexist@example.com")
        assert not_found is None

    async def test_list_and_count(self, db_session):
        repo = UserRepository(db_session)
        for i in range(3):
            await repo.create(
                UserCreate(
                    email=f"user{i}@example.com",
                    full_name=f"User {i}",
                    role="VIEWER",
                    password="TestPass1!",
                ),
                hashed_password="hashed",
            )
        users = await repo.list(limit=10)
        assert len(users) == 3
        count = await repo.count()
        assert count == 3

    async def test_list_filter_by_role(self, db_session):
        repo = UserRepository(db_session)
        await repo.create(
            UserCreate(
                email="admin@test.com",
                full_name="Admin",
                role="ADMIN",
                password="TestPass1!",
            ),
            hashed_password="hashed",
        )
        await repo.create(
            UserCreate(
                email="viewer@test.com",
                full_name="Viewer",
                role="VIEWER",
                password="TestPass1!",
            ),
            hashed_password="hashed",
        )
        admins = await repo.list(role="ADMIN")
        assert len(admins) == 1
        assert admins[0].role == "ADMIN"

    async def test_update(self, db_session):
        repo = UserRepository(db_session)
        user = await repo.create(
            UserCreate(
                email="upd@example.com",
                full_name="Before",
                role="VIEWER",
                password="TestPass1!",
            ),
            hashed_password="hashed",
        )
        updated = await repo.update(user, UserUpdate(full_name="After"))
        assert updated.full_name == "After"

    async def test_soft_delete(self, db_session):
        repo = UserRepository(db_session)
        user = await repo.create(
            UserCreate(
                email="del@example.com",
                full_name="Delete Me",
                role="VIEWER",
                password="TestPass1!",
            ),
            hashed_password="hashed",
        )
        await repo.soft_delete(user)
        assert user.deleted_at is not None
        assert user.is_active is False

        found = await repo.get_by_id(user.id)
        assert found is None


# ===================== CostRecordRepository =====================


class TestCostRecordRepository:
    async def test_create_and_get(self, db_session):
        await _create_project(db_session)
        repo = CostRecordRepository(db_session)
        data = CostRecordCreate(
            project_id=PROJECT_ID,
            record_date=date(2026, 4, 3),
            category="LABOR",
            description="作業員人件費",
            budgeted_amount=Decimal("100000"),
            actual_amount=Decimal("95000"),
        )
        record = await repo.create(data, created_by=ACTOR_ID)
        assert record.id is not None
        assert record.category == "LABOR"

        found = await repo.get_by_id(record.id)
        assert found is not None

    async def test_list_and_count(self, db_session):
        await _create_project(db_session)
        repo = CostRecordRepository(db_session)
        for cat in ["LABOR", "MATERIAL", "LABOR"]:
            await repo.create(
                CostRecordCreate(
                    project_id=PROJECT_ID,
                    record_date=date(2026, 4, 3),
                    category=cat,
                    description=f"{cat}コスト",
                ),
                created_by=ACTOR_ID,
            )
        all_records = await repo.list(PROJECT_ID)
        assert len(all_records) == 3
        labor_only = await repo.list(PROJECT_ID, category="LABOR")
        assert len(labor_only) == 2
        count = await repo.count(PROJECT_ID)
        assert count == 3

    async def test_get_summary(self, db_session):
        await _create_project(db_session)
        repo = CostRecordRepository(db_session)
        await repo.create(
            CostRecordCreate(
                project_id=PROJECT_ID,
                record_date=date(2026, 4, 3),
                category="LABOR",
                description="人件費",
                budgeted_amount=Decimal("200000"),
                actual_amount=Decimal("180000"),
            ),
            created_by=ACTOR_ID,
        )
        summary = await repo.get_summary(PROJECT_ID)
        assert summary["total_budget"] == 200000
        assert summary["total_actual"] == 180000
        assert summary["variance"] == 20000

    async def test_update_and_soft_delete(self, db_session):
        await _create_project(db_session)
        repo = CostRecordRepository(db_session)
        record = await repo.create(
            CostRecordCreate(
                project_id=PROJECT_ID,
                record_date=date(2026, 4, 3),
                category="LABOR",
                description="元の説明",
            ),
            created_by=ACTOR_ID,
        )
        updated = await repo.update(
            record, CostRecordUpdate(description="更新後の説明")
        )
        assert updated.description == "更新後の説明"

        await repo.soft_delete(record)
        assert record.deleted_at is not None
        assert await repo.get_by_id(record.id) is None


# ===================== SafetyCheckRepository =====================


class TestSafetyCheckRepository:
    async def test_crud(self, db_session):
        await _create_project(db_session)
        repo = SafetyCheckRepository(db_session)
        check = await repo.create(
            SafetyCheckCreate(
                project_id=PROJECT_ID,
                check_date=date(2026, 4, 3),
                check_type="DAILY",
                items_total=10,
                items_ok=9,
                items_ng=1,
            ),
            created_by=ACTOR_ID,
        )
        assert check.id is not None
        assert check.items_total == 10

        updated = await repo.update(
            check, SafetyCheckUpdate(overall_result="OK")
        )
        assert updated.overall_result == "OK"

        await repo.soft_delete(check)
        assert await repo.get_by_id(check.id) is None


class TestQualityInspectionRepository:
    async def test_crud(self, db_session):
        await _create_project(db_session)
        repo = QualityInspectionRepository(db_session)
        inspection = await repo.create(
            QualityInspectionCreate(
                project_id=PROJECT_ID,
                inspection_date=date(2026, 4, 3),
                inspection_type="コンクリート強度",
                target_item="基礎部分",
            ),
            created_by=ACTOR_ID,
        )
        assert inspection.id is not None

        updated = await repo.update(
            inspection,
            QualityInspectionUpdate(result="PASS", measured_value="30N/mm²"),
        )
        assert updated.result == "PASS"

        await repo.soft_delete(inspection)
        assert await repo.get_by_id(inspection.id) is None


# ===================== IncidentRepository =====================


class TestIncidentRepository:
    async def test_create_with_auto_number(self, db_session):
        repo = IncidentRepository(db_session)
        incident = await repo.create(
            IncidentCreate(
                title="ネットワーク障害",
                description="社内LANが断続的に切断される",
                category="NETWORK",
                priority="HIGH",
            ),
            created_by=ACTOR_ID,
        )
        assert incident.incident_number == "INC-000001"
        assert incident.status == "OPEN"

    async def test_list_filter_by_status(self, db_session):
        repo = IncidentRepository(db_session)
        await repo.create(
            IncidentCreate(
                title="障害A",
                description="詳細A",
            ),
            created_by=ACTOR_ID,
        )
        i2 = await repo.create(
            IncidentCreate(
                title="障害B",
                description="詳細B",
            ),
            created_by=ACTOR_ID,
        )
        await repo.update(
            i2, IncidentUpdate(status="RESOLVED"), updated_by=ACTOR_ID
        )
        open_list = await repo.list(status="OPEN")
        assert len(open_list) == 1
        count = await repo.count()
        assert count == 2

    async def test_soft_delete(self, db_session):
        repo = IncidentRepository(db_session)
        incident = await repo.create(
            IncidentCreate(title="削除テスト", description="削除"),
            created_by=ACTOR_ID,
        )
        await repo.soft_delete(incident, deleted_by=ACTOR_ID)
        assert await repo.get_by_id(incident.id) is None


class TestChangeRequestRepository:
    async def test_create_with_auto_number(self, db_session):
        repo = ChangeRequestRepository(db_session)
        cr = await repo.create(
            ChangeRequestCreate(
                title="サーバー移行",
                description="本番サーバーの移行作業",
                change_type="NORMAL",
                risk_level="MEDIUM",
            ),
            created_by=ACTOR_ID,
        )
        assert cr.change_number == "CHG-000001"
        assert cr.status == "DRAFT"

    async def test_update_and_soft_delete(self, db_session):
        repo = ChangeRequestRepository(db_session)
        cr = await repo.create(
            ChangeRequestCreate(
                title="テスト変更",
                description="詳細",
            ),
            created_by=ACTOR_ID,
        )
        updated = await repo.update(
            cr, ChangeRequestUpdate(status="REVIEW"), updated_by=ACTOR_ID
        )
        assert updated.status == "REVIEW"

        await repo.soft_delete(cr, deleted_by=ACTOR_ID)
        assert await repo.get_by_id(cr.id) is None


# ===================== KnowledgeArticleRepository =====================


class TestKnowledgeArticleRepository:
    async def test_create_and_get(self, db_session):
        repo = KnowledgeArticleRepository(db_session)
        article = await repo.create(
            KnowledgeArticleCreate(
                title="安全作業手順",
                content="高所作業時は必ずハーネスを着用すること",
                category="SAFETY",
                tags="安全,高所,ハーネス",
                is_published=True,
            ),
            created_by=ACTOR_ID,
        )
        assert article.id is not None
        assert article.category == "SAFETY"

        found = await repo.get_by_id(article.id)
        assert found is not None

    async def test_search(self, db_session):
        repo = KnowledgeArticleRepository(db_session)
        await repo.create(
            KnowledgeArticleCreate(
                title="コンクリート養生手順",
                content="打設後7日間は散水養生を行う",
                category="TECHNICAL",
                is_published=True,
            ),
            created_by=ACTOR_ID,
        )
        await repo.create(
            KnowledgeArticleCreate(
                title="安全教育マニュアル",
                content="新規入場者教育の実施手順",
                category="SAFETY",
                is_published=True,
            ),
            created_by=ACTOR_ID,
        )
        results = await repo.search("コンクリート")
        assert len(results) == 1
        assert results[0].title == "コンクリート養生手順"

    async def test_increment_view_count(self, db_session):
        repo = KnowledgeArticleRepository(db_session)
        article = await repo.create(
            KnowledgeArticleCreate(
                title="テスト記事",
                content="内容",
            ),
            created_by=ACTOR_ID,
        )
        assert article.view_count == 0
        await repo.increment_view_count(article)
        assert article.view_count == 1

    async def test_update_and_soft_delete(self, db_session):
        repo = KnowledgeArticleRepository(db_session)
        article = await repo.create(
            KnowledgeArticleCreate(title="元タイトル", content="内容"),
            created_by=ACTOR_ID,
        )
        updated = await repo.update(
            article,
            KnowledgeArticleUpdate(title="新タイトル"),
            updated_by=ACTOR_ID,
        )
        assert updated.title == "新タイトル"

        await repo.soft_delete(article, deleted_by=ACTOR_ID)
        assert await repo.get_by_id(article.id) is None


class TestAiSearchLogRepository:
    async def test_create_and_list(self, db_session):
        repo = AiSearchLogRepository(db_session)
        log = await repo.create(
            user_id=ACTOR_ID,
            query="安全対策について教えて",
            ai_response="安全対策として...",
            model_used="gpt-4o-mini",
            tokens_used=150,
            response_time_ms=500,
        )
        assert log.id is not None

        logs = await repo.list_recent(limit=10)
        assert len(logs) == 1


# ===================== WorkHourRepository =====================


class TestWorkHourRepository:
    async def test_create_and_total(self, db_session):
        await _create_project(db_session)
        repo = WorkHourRepository(db_session)
        await repo.create(
            WorkHourCreate(
                project_id=PROJECT_ID,
                work_date=date(2026, 4, 3),
                hours=Decimal("8.0"),
                work_type="REGULAR",
            ),
            created_by=ACTOR_ID,
        )
        await repo.create(
            WorkHourCreate(
                project_id=PROJECT_ID,
                work_date=date(2026, 4, 3),
                hours=Decimal("2.5"),
                work_type="OVERTIME",
            ),
            created_by=ACTOR_ID,
        )
        total = await repo.get_total_hours(PROJECT_ID)
        assert total == Decimal("10.5")

        hours_list = await repo.list(PROJECT_ID)
        assert len(hours_list) == 2
