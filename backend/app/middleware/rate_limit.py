"""
Rate limiting — slowapi による IP ベースのレート制限。

認証エンドポイント (login / refresh) に対して厳格な制限を適用し、
ブルートフォース攻撃・クレデンシャルスタッフィングを防止する。
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Module-level singleton: app.state.limiter として登録する。
# key_func は X-Forwarded-For → remote_addr の順で IP を取得する。
limiter = Limiter(key_func=get_remote_address)
