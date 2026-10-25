"""Request/response schemas. Response models never include secrets or hashes."""

import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr, Field

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")

OrgRole = Literal["owner", "admin", "member"]
InvitableOrgRole = Literal["admin", "member"]
WorkspaceRole = Literal["workspace_admin", "strategist", "media_buyer", "lifecycle", "analyst", "client_viewer"]
AttributionModel = Literal["first_touch", "last_touch", "linear", "time_decay", "position_based"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def _clean_name(v: str) -> str:
    v = " ".join(v.split())
    if not v:
        raise ValueError("must not be blank")
    return v


CleanStr = Annotated[str, AfterValidator(_clean_name)]
# PostgreSQL INET columns come back as ipaddress objects; serialise them as strings.
IpStr = Annotated[str | None, BeforeValidator(lambda v: None if v is None else str(v))]


# ------------------------------------------------------------------ auth
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    name: CleanStr = Field(min_length=1, max_length=120)
    org_name: CleanStr = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class UserOut(ORM):
    id: uuid.UUID
    email: str
    name: str
    created_at: datetime


class MembershipOut(BaseModel):
    org_id: uuid.UUID
    org_name: str
    org_slug: str
    role: OrgRole
    deletion_requested_at: datetime | None


class MeOut(BaseModel):
    user: UserOut
    memberships: list[MembershipOut]


class SessionOut(ORM):
    id: uuid.UUID
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    ip: IpStr
    user_agent: str | None
    current: bool = False


# ------------------------------------------------------------------ orgs
class OrgCreate(BaseModel):
    name: CleanStr = Field(min_length=1, max_length=120)


class OrgUpdate(BaseModel):
    name: CleanStr = Field(min_length=1, max_length=120)


class OrgOut(ORM):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    created_at: datetime
    deletion_requested_at: datetime | None


class OrgDetail(OrgOut):
    role: OrgRole
    permissions: list[str]


class ConfirmIn(BaseModel):
    confirm: str = Field(min_length=1, max_length=120)


# ------------------------------------------------------------------ members
class MemberOut(BaseModel):
    user_id: uuid.UUID
    email: str
    name: str
    role: OrgRole
    joined_at: datetime
    workspaces: list[dict]


class MemberRoleUpdate(BaseModel):
    role: OrgRole


# ------------------------------------------------------------------ invitations
class InvitationCreate(BaseModel):
    email: EmailStr
    org_role: InvitableOrgRole = "member"
    workspace_id: uuid.UUID | None = None
    workspace_role: WorkspaceRole | None = None


class InvitationOut(ORM):
    id: uuid.UUID
    email: str
    org_role: str
    workspace_id: uuid.UUID | None
    workspace_role: str | None
    created_at: datetime
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None
    status: str = "pending"


class InvitationCreated(InvitationOut):
    accept_url: str
    delivery: str = "manual"  # email delivery is not configured; share the link securely


class InvitationLookup(BaseModel):
    org_name: str
    email: str
    org_role: str
    expires_at: datetime
    status: str


class InvitationAccept(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    # Required only when the invitee has no account yet
    name: str | None = Field(default=None, max_length=120)
    password: str | None = Field(default=None, max_length=256)


# ------------------------------------------------------------------ workspaces
class WorkspaceSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    timezone: str = Field(default="UTC", max_length=64)
    fiscal_year_start_month: int = Field(default=1, ge=1, le=12)
    default_attribution_model: AttributionModel = "position_based"
    data_retention_months: int = Field(default=25, ge=1, le=120)
    brand_name: str = Field(default="", max_length=120)


class WorkspaceCreate(BaseModel):
    name: CleanStr = Field(min_length=1, max_length=120)
    settings: WorkspaceSettings = WorkspaceSettings()


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    settings: WorkspaceSettings | None = None


class WorkspaceOut(ORM):
    id: uuid.UUID
    org_id: uuid.UUID
    name: str
    slug: str
    settings: dict
    is_demo: bool
    created_at: datetime


class WorkspaceDetail(WorkspaceOut):
    role: str | None
    permissions: list[str]


class WorkspaceMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: WorkspaceRole


class WorkspaceMemberUpdate(BaseModel):
    role: WorkspaceRole


class WorkspaceMemberOut(BaseModel):
    user_id: uuid.UUID
    email: str
    name: str
    role: str
    org_role: str


# ------------------------------------------------------------------ projects
class ProjectCreate(BaseModel):
    name: CleanStr = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=4000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    status: Literal["active", "paused", "archived"] | None = None


class ProjectOut(ORM):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str
    status: str
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


# ------------------------------------------------------------------ api keys
class ApiKeyCreate(BaseModel):
    name: CleanStr = Field(min_length=1, max_length=120)
    scopes: list[Literal["workspace:read", "projects:read", "projects:write", "audit:read"]] = Field(min_length=1)
    expires_in_days: int | None = Field(default=90, ge=1, le=365)


class ApiKeyOut(ORM):
    id: uuid.UUID
    name: str
    prefix: str
    scopes: list[str]
    created_at: datetime
    last_used_at: datetime | None
    expires_at: datetime | None
    revoked_at: datetime | None


class ApiKeyCreated(ApiKeyOut):
    key: str  # shown exactly once


# ------------------------------------------------------------------ audit / usage
class AuditOut(ORM):
    id: int
    workspace_id: uuid.UUID | None
    actor_user_id: uuid.UUID | None
    actor_api_key_id: uuid.UUID | None
    actor_label: str | None = None
    action: str
    target_type: str | None
    target_id: str | None
    details: dict
    ip: IpStr
    created_at: datetime


class AuditPage(BaseModel):
    items: list[AuditOut]
    next_cursor: int | None


class UsageMetric(BaseModel):
    metric: str
    used: int
    limit: int | None


class UsageOut(BaseModel):
    plan: str
    period_start: datetime
    period_end: datetime
    metrics: list[UsageMetric]
    billing_connected: bool = False
