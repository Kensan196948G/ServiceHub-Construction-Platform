"""
Locust 性能テスト
使用方法: locust -f locustfile.py --host=http://localhost:8000 --users=50 --spawn-rate=5
"""

from locust import HttpUser, between, task


class ServiceHubUser(HttpUser):
    """一般ユーザーの負荷テスト"""

    wait_time = between(1, 3)
    token: str = ""

    def on_start(self):
        """ログイン→トークン取得"""
        resp = self.client.post(
            "/api/v1/auth/login",
            data={
                "username": "admin",
                "password": "Admin1234!",
            },
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token", "")

    def auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def get_projects(self):
        self.client.get("/api/v1/projects/", headers=self.auth_headers())

    @task(2)
    def get_daily_reports(self):
        self.client.get("/api/v1/daily-reports/", headers=self.auth_headers())

    @task(2)
    def get_knowledge_articles(self):
        self.client.get("/api/v1/knowledge/articles", headers=self.auth_headers())

    @task(1)
    def search_knowledge(self):
        self.client.post(
            "/api/v1/knowledge/search",
            json={
                "query": "安全管理",
                "max_results": 5,
            },
            headers=self.auth_headers(),
        )

    @task(1)
    def get_incidents(self):
        self.client.get("/api/v1/itsm/incidents", headers=self.auth_headers())

    @task(1)
    def health_check(self):
        self.client.get("/health")


class AdminUser(HttpUser):
    """管理者操作の負荷テスト"""

    wait_time = between(2, 5)
    token: str = ""

    def on_start(self):
        resp = self.client.post(
            "/api/v1/auth/login",
            data={
                "username": "admin",
                "password": "Admin1234!",
            },
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token", "")

    def auth_headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    @task(2)
    def create_incident(self):
        self.client.post(
            "/api/v1/itsm/incidents",
            json={
                "title": "性能テスト用インシデント",
                "description": "Locust性能テスト",
                "category": "SYSTEM",
                "priority": "LOW",
                "severity": "LOW",
            },
            headers=self.auth_headers(),
        )

    @task(1)
    def create_knowledge(self):
        self.client.post(
            "/api/v1/knowledge/articles",
            json={
                "title": "性能テスト記事",
                "content": "Locust負荷テスト用記事",
                "category": "GENERAL",
            },
            headers=self.auth_headers(),
        )
