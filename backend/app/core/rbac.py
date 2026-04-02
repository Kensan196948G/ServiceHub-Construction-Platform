"""
RBACロール定義・権限管理
ISO20000/SoD準拠
"""
from enum import Enum
from functools import wraps
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.api.v1.deps import get_current_user
from app.models.user import User


class UserRole(str, Enum):
    ADMIN = "ADMIN"                          # システム管理者（全権限）
    PROJECT_MANAGER = "PROJECT_MANAGER"      # 工事担当者（案件・日報・原価）
    SITE_SUPERVISOR = "SITE_SUPERVISOR"      # 現場管理者（日報・写真・安全）
    COST_MANAGER = "COST_MANAGER"           # 原価管理担当（原価参照）
    IT_OPERATOR = "IT_OPERATOR"             # IT運用担当（ITSM操作）
    VIEWER = "VIEWER"                        # 閲覧のみ


# ロール階層（上位ロールは下位の権限を包含）
ROLE_HIERARCHY: dict[UserRole, set[UserRole]] = {
    UserRole.ADMIN: {
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR,
        UserRole.COST_MANAGER, UserRole.IT_OPERATOR, UserRole.VIEWER,
    },
    UserRole.PROJECT_MANAGER: {
        UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.COST_MANAGER, UserRole.VIEWER,
    },
    UserRole.SITE_SUPERVISOR: {UserRole.SITE_SUPERVISOR, UserRole.VIEWER},
    UserRole.COST_MANAGER: {UserRole.COST_MANAGER, UserRole.VIEWER},
    UserRole.IT_OPERATOR: {UserRole.IT_OPERATOR, UserRole.VIEWER},
    UserRole.VIEWER: {UserRole.VIEWER},
}


def require_roles(*allowed_roles: UserRole) -> Callable:
    """ロールベースアクセス制御デコレータ"""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = UserRole(current_user.role)
        effective_roles = ROLE_HIERARCHY.get(user_role, {user_role})
        if not any(role in effective_roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"権限が不足しています。必要ロール: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return role_checker
