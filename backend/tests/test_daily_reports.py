"""日報管理APIテスト（CRUD完全カバー）"""

import uuid

import pytest


# ---------------------------------------------------------------------------
# 認証なし
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_daily_reports_unauthorized(client):
    """未認証で日報一覧は401"""
    project_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/projects/{project_id}/daily-reports")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_daily_report_unauthorized(client):
    """未認証で日報作成は401"""
    project_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/projects/{project_id}/daily-reports",
        json={"project_id": project_id, "report_date": "2024-01-15"},
    )
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# CRUD - 正常系
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_daily_report(auth_client, admin_headers):
    """日報作成 - 正常"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/daily-reports",
        json={
            "project_id": project_id,
            "report_date": "2024-01-15",
            "weather": "晴れ",
            "temperature": 20,
            "worker_count": 10,
            "work_content": "基礎工事",
            "safety_check": True,
            "safety_notes": "異常なし",
            "progress_rate": 30,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["weather"] == "晴れ"
    assert data["worker_count"] == 10
    assert data["safety_check"] is True
    assert data["progress_rate"] == 30


@pytest.mark.asyncio
async def test_list_daily_reports(auth_client, admin_headers):
    """日報一覧取得"""
    project_id = str(uuid.uuid4())
    # 日報を2件作成
    for d in ["2024-01-15", "2024-01-16"]:
        await auth_client.post(
            f"/api/v1/projects/{project_id}/daily-reports",
            json={"project_id": project_id, "report_date": d, "worker_count": 5},
            headers=admin_headers,
        )

    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/daily-reports",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] == 2
    assert len(body["data"]) == 2


@pytest.mark.asyncio
async def test_list_daily_reports_empty(auth_client, admin_headers):
    """日報一覧 - 0件"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/daily-reports",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_get_daily_report(auth_client, admin_headers):
    """日報詳細取得"""
    project_id = str(uuid.uuid4())
    create_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/daily-reports",
        json={
            "project_id": project_id,
            "report_date": "2024-02-01",
            "worker_count": 8,
        },
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    report_id = create_resp.json()["data"]["id"]

    get_resp = await auth_client.get(
        f"/api/v1/daily-reports/{report_id}",
        headers=admin_headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == report_id
    assert get_resp.json()["data"]["worker_count"] == 8


@pytest.mark.asyncio
async def test_get_daily_report_not_found(auth_client, admin_headers):
    """存在しない日報は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/daily-reports/{fake_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_daily_report(auth_client, admin_headers):
    """日報更新"""
    project_id = str(uuid.uuid4())
    create_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/daily-reports",
        json={
            "project_id": project_id,
            "report_date": "2024-03-01",
            "worker_count": 5,
        },
        headers=admin_headers,
    )
    report_id = create_resp.json()["data"]["id"]

    update_resp = await auth_client.put(
        f"/api/v1/daily-reports/{report_id}",
        json={
            "worker_count": 15,
            "weather": "曇り",
            "progress_rate": 50,
            "issues": "資材搬入遅延",
        },
        headers=admin_headers,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()["data"]
    assert updated["worker_count"] == 15
    assert updated["weather"] == "曇り"
    assert updated["progress_rate"] == 50


@pytest.mark.asyncio
async def test_update_daily_report_not_found(auth_client, admin_headers):
    """存在しない日報の更新は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.put(
        f"/api/v1/daily-reports/{fake_id}",
        json={"worker_count": 5},
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_daily_report(auth_client, admin_headers):
    """日報削除（論理削除）"""
    project_id = str(uuid.uuid4())
    create_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/daily-reports",
        json={
            "project_id": project_id,
            "report_date": "2024-04-01",
            "worker_count": 3,
        },
        headers=admin_headers,
    )
    report_id = create_resp.json()["data"]["id"]

    del_resp = await auth_client.delete(
        f"/api/v1/daily-reports/{report_id}",
        headers=admin_headers,
    )
    assert del_resp.status_code == 204

    # 削除後は404
    get_resp = await auth_client.get(
        f"/api/v1/daily-reports/{report_id}",
        headers=admin_headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_daily_report_not_found(auth_client, admin_headers):
    """存在しない日報の削除は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.delete(
        f"/api/v1/daily-reports/{fake_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_viewer_can_read_daily_reports(auth_client, viewer_headers):
    """Viewerロールは日報一覧閲覧可"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/daily-reports",
        headers=viewer_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_pm_can_create_daily_report(auth_client, pm_headers):
    """PROJECT_MANAGERロールは日報作成可"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/daily-reports",
        json={
            "project_id": project_id,
            "report_date": "2024-05-01",
            "worker_count": 7,
        },
        headers=pm_headers,
    )
    assert resp.status_code == 201
