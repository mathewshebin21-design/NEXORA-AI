"""ORM models. Every tenant-owned table carries `org_id` and is protected by RLS (see migrations)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


def _id() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _ts(nullable: bool = False, default=True) -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), nullable=nullable, default=utcnow if default else None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = _id()
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    failed_logins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[datetime | None] = _ts(nullable=True, default=False)
    email_verified_at: Mapped[datetime | None] = _ts(nullable=True, default=False)
    created_at: Mapped[datetime] = _ts()


class UserSession(Base):
    __tablename__ = "sessions"
    id: Mapped[uuid.UUID] = _id()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = _ts()
    last_seen_at: Mapped[datetime] = _ts()
    expires_at: Mapped[datetime] = _ts(default=False)
    revoked_at: Mapped[datetime | None] = _ts(nullable=True, default=False)
    ip: Mapped[str | None] = mapped_column(INET, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(400), nullable=True)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[uuid.UUID] = _id()
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    plan: Mapped[str] = mapped_column(String(32), nullable=False, default="trial")
    created_at: Mapped[datetime] = _ts()
    deletion_requested_at: Mapped[datetime | None] = _ts(nullable=True, default=False)
    deletion_requested_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class OrgMembership(Base):
    __tablename__ = "org_memberships"
    __table_args__ = (UniqueConstraint("org_id", "user_id"),)
    id: Mapped[uuid.UUID] = _id()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = _ts()


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (UniqueConstraint("org_id", "slug"),)
    id: Mapped[uuid.UUID] = _id()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), nullable=False)
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = _ts()
    deleted_at: Mapped[datetime | None] = _ts(nullable=True, default=False)


class WorkspaceMembership(Base):
    __tablename__ = "workspace_memberships"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id"),)
    id: Mapped[uuid.UUID] = _id()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(24), nullable=False)
    created_at: Mapped[datetime] = _ts()


class Invitation(Base):
    __tablename__ = "invitations"
    id: Mapped[uuid.UUID] = _id()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    org_role: Mapped[str] = mapped_column(String(16), nullable=False)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    workspace_role: Mapped[str | None] = mapped_column(String(24), nullable=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    invited_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = _ts()
    expires_at: Mapped[datetime] = _ts(default=False)
    accepted_at: Mapped[datetime | None] = _ts(nullable=True, default=False)
    revoked_at: Mapped[datetime | None] = _ts(nullable=True, default=False)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[uuid.UUID] = _id()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = _ts()
    updated_at: Mapped[datetime] = _ts()


class ApiKey(Base):
    __tablename__ = "api_keys"
    id: Mapped[uuid.UUID] = _id()
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    prefix: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = _ts()
    last_used_at: Mapped[datetime | None] = _ts(nullable=True, default=False)
    expires_at: Mapped[datetime | None] = _ts(nullable=True, default=False)
    revoked_at: Mapped[datetime | None] = _ts(nullable=True, default=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_api_key_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    ip: Mapped[str | None] = mapped_column(INET, nullable=True)
    created_at: Mapped[datetime] = _ts()


class UsageEvent(Base):
    __tablename__ = "usage_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    metric: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[int] = mapped_column(BigInteger, nullable=False, default=1)
    occurred_at: Mapped[datetime] = _ts()
