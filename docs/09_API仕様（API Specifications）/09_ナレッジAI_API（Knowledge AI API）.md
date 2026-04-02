# 🤖 ナレッジ・AI API（Knowledge AI API）

## ナレッジ管理 エンドポイント

| メソッド | パス | 説明 |
|--------|------|------|
| GET/POST | `/api/v1/knowledge/articles` | ナレッジ一覧・作成 |
| GET/PUT | `/api/v1/knowledge/articles/{id}` | 詳細・更新 |
| GET | `/api/v1/knowledge/search` | 全文検索 |
| GET | `/api/v1/knowledge/similar` | 類似検索 |
| POST | `/api/v1/knowledge/generate` | AI自動生成 |

## AI支援 エンドポイント

| メソッド | パス | 説明 |
|--------|------|------|
| POST | `/api/v1/ai/chat` | Q&Aチャット |
| POST | `/api/v1/ai/voice-to-report` | 音声→日報変換 |
| POST | `/api/v1/ai/auto-tag` | 写真自動タグ |
| POST | `/api/v1/ai/document-generate` | 文書生成 |
| GET | `/api/v1/ai/usage-logs` | AI利用ログ |

## AI チャット例
```json
POST /api/v1/ai/chat
{
  "message": "高所作業の安全対策を教えてください",
  "context": {
    "project_id": "uuid",
    "user_id": "uuid"
  },
  "session_id": "chat-session-uuid"
}
```
**レスポンス**
```json
{
  "answer": "高所作業（2m以上）では...",
  "sources": [{"article_id": "uuid", "title": "高所作業安全基準"}],
  "confidence": 0.92,
  "ai_log_id": "uuid"
}
```

## AIガバナンス（必須）
- 全AI利用をログ記録（`/api/v1/ai/usage-logs`）
- PII（個人情報）は送信前にマスキング
- AI出力は必ず人間レビュー前提
