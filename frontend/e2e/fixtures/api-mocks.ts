import { type Page } from '@playwright/test'

export const MOCK_TOKEN = 'mock-jwt-token-for-testing'
export const MOCK_REFRESH_TOKEN = 'mock-refresh-token-for-testing'
export const MOCK_NEW_TOKEN = 'mock-jwt-token-refreshed'
export const MOCK_NEW_REFRESH_TOKEN = 'mock-refresh-token-refreshed'

export const MOCK_USER = {
  id: 1,
  email: 'test@example.com',
  full_name: 'テスト管理者',
  role: 'ADMIN',
  is_active: true,
}

export const MOCK_KPI = {
  projects: { total: 10, planning: 2, in_progress: 5, on_hold: 1, completed: 2 },
  incidents: { total: 8, open: 3, in_progress: 2, resolved: 3 },
  cost_overview: {
    total_budgeted: 10_000_000,
    total_actual: 9_200_000,
    variance: -800_000,
    variance_rate: -0.08,
  },
  daily_reports_count: 24,
  photos_count: 156,
  users_count: 12,
}

export const MOCK_PROJECTS = [
  {
    id: '1',
    project_code: 'PRJ-001',
    name: '渋谷オフィスビル新築工事',
    status: 'IN_PROGRESS',
    client_name: '株式会社テスト',
    budget: 50_000_000,
    start_date: '2026-01-01',
    end_date: null,
    description: null,
    site_address: null,
    manager_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    project_code: 'PRJ-002',
    name: '横浜マンション改修工事',
    status: 'PLANNING',
    client_name: '株式会社サンプル',
    budget: 30_000_000,
    start_date: '2026-03-01',
    end_date: null,
    description: null,
    site_address: null,
    manager_id: null,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
]

export const MOCK_DAILY_REPORTS = [
  {
    id: '1',
    report_date: '2026-04-04',
    project_id: '1',
    author_id: 1,
    weather: 'SUNNY',
    summary: 'テスト日報',
    created_at: '2026-04-04T09:00:00Z',
    updated_at: '2026-04-04T09:00:00Z',
  },
]

export const MOCK_SAFETY_INSPECTIONS = [
  {
    id: '1',
    inspection_date: '2026-04-04',
    project_id: '1',
    inspector_id: 1,
    severity: 'MEDIUM',
    status: 'OPEN',
    title: 'テスト安全点検',
    description: null,
    created_at: '2026-04-04T09:00:00Z',
    updated_at: '2026-04-04T09:00:00Z',
  },
]

export const MOCK_PHOTOS = [
  {
    id: 'photo-1',
    project_id: '1',
    filename: 'site-progress-001.jpg',
    original_filename: '現場進捗写真.jpg',
    file_size: 204800,
    mime_type: 'image/jpeg',
    category: 'PROGRESS',
    description: '2階部分の鉄骨組み立て完了',
    taken_at: '2026-04-10T09:00:00Z',
    url: null,
    created_at: '2026-04-10T09:00:00Z',
  },
  {
    id: 'photo-2',
    project_id: '1',
    filename: 'safety-check-001.jpg',
    original_filename: '安全点検写真.jpg',
    file_size: 153600,
    mime_type: 'image/jpeg',
    category: 'SAFETY',
    description: '安全帯着用確認',
    taken_at: '2026-04-10T10:00:00Z',
    url: null,
    created_at: '2026-04-10T10:00:00Z',
  },
]

export const MOCK_COST_RECORDS = [
  {
    id: '1',
    project_id: '1',
    category: 'LABOR',
    budgeted_amount: 10_000_000,
    actual_amount: 9_200_000,
    description: 'テストコスト',
    record_date: '2026-04-04',
    created_at: '2026-04-04T09:00:00Z',
    updated_at: '2026-04-04T09:00:00Z',
  },
]

// Mock auth APIs (login + me + refresh + logout)
export async function setupAuthMocks(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: MOCK_TOKEN,
        token_type: 'bearer',
        refresh_token: MOCK_REFRESH_TOKEN,
        expires_in: 3600,
      }),
    })
  })

  await page.route('**/api/v1/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_USER }),
    })
  })

  await page.route('**/api/v1/auth/refresh', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: MOCK_NEW_TOKEN,
        token_type: 'bearer',
        refresh_token: MOCK_NEW_REFRESH_TOKEN,
        expires_in: 3600,
      }),
    })
  })

  await page.route('**/api/v1/auth/logout', (route) => {
    route.fulfill({ status: 204 })
  })
}

// Mock all domain APIs
export async function setupAllApiMocks(page: Page): Promise<void> {
  await setupAuthMocks(page)

  await page.route('**/api/v1/dashboard/kpi', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_KPI }),
    })
  })

  await page.route('**/api/v1/projects**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_PROJECTS,
        meta: { page: 1, per_page: 20, total: 2 },
      }),
    })
  })

  await page.route('**/api/v1/daily_reports**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_DAILY_REPORTS,
        meta: { page: 1, per_page: 20, total: 1 },
      }),
    })
  })

  await page.route('**/api/v1/safety_inspections**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_SAFETY_INSPECTIONS,
        meta: { page: 1, per_page: 20, total: 1 },
      }),
    })
  })

  await page.route('**/api/v1/cost_records**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_COST_RECORDS,
        meta: { page: 1, per_page: 20, total: 1 },
      }),
    })
  })

  // Mock incidents for ITSM page
  await page.route('**/api/v1/itsm/incidents**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        meta: { page: 1, per_page: 20, total: 0 },
      }),
    })
  })

  // Mock change requests for ITSM page
  await page.route('**/api/v1/itsm/changes**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        meta: { page: 1, per_page: 20, total: 0 },
      }),
    })
  })

  // Mock notification preferences (default values)
  await page.route('**/api/v1/users/me/notification-preferences', (route) => {
    const method = route.request().method()
    if (method === 'GET' || method === 'PATCH') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_NOTIFICATION_PREFERENCES }),
      })
    } else {
      route.fulfill({ status: 405 })
    }
  })

  // Mock notification deliveries (ADMIN: empty list by default)
  await page.route('**/api/v1/notifications/deliveries**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        meta: { total: 0, page: 1, per_page: 20, pages: 0 },
      }),
    })
  })

  // Mock notification retry (default: no-op)
  await page.route('**/api/v1/notifications/retry', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { retried_count: 0, message: 'リトライ対象の通知がありません。' },
      }),
    })
  })
}

export const MOCK_NOTIFICATION_PREFERENCES = {
  email_enabled: true,
  slack_enabled: false,
  slack_webhook_url: null,
  events: {
    daily_report_submitted: { email: true, slack: false },
    safety_incident_created: { email: true, slack: true },
    change_request_pending_approval: { email: true, slack: false },
    incident_assigned: { email: true, slack: false },
    project_status_changed: { email: false, slack: false },
  },
}

// Login and navigate to dashboard
// authStore uses key "servicehub-auth" (from zustand persist config)
export async function loginAndNavigate(page: Page): Promise<void> {
  await setupAllApiMocks(page)

  // Set auth token + refresh token in localStorage before navigation
  await page.goto('/login')
  await page.evaluate(
    ({ token, refreshToken, user }) => {
      localStorage.setItem('servicehub-auth', JSON.stringify({
        state: { token, refreshToken, user },
        version: 0,
      }))
    },
    { token: MOCK_TOKEN, refreshToken: MOCK_REFRESH_TOKEN, user: MOCK_USER }
  )
  await page.goto('/dashboard')
  await page.waitForURL('**/dashboard')
}
