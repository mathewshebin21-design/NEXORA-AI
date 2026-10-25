"""Role → permission model.

Two layers:
- Organisation roles: owner, admin, member.
- Workspace roles (client workspaces): workspace_admin, strategist, media_buyer, lifecycle, analyst, client_viewer.

Org owners and admins hold every workspace permission in every workspace of their org.
Members hold only what their workspace role grants, and only in workspaces they are assigned to.
"""

from enum import StrEnum


class P(StrEnum):
    # organisation scope
    ORG_UPDATE = "org.update"
    ORG_DELETE = "org.delete"
    ORG_EXPORT = "org.export"
    MEMBERS_MANAGE = "members.manage"
    INVITATIONS_MANAGE = "invitations.manage"
    WORKSPACES_CREATE = "workspaces.create"
    AUDIT_READ_ORG = "audit.read_org"
    USAGE_READ = "usage.read"
    # workspace scope
    WS_READ = "workspace.read"
    WS_UPDATE = "workspace.update"
    WS_DELETE = "workspace.delete"
    WS_MEMBERS_MANAGE = "workspace.members.manage"
    PROJECTS_READ = "projects.read"
    PROJECTS_WRITE = "projects.write"
    API_KEYS_MANAGE = "api_keys.manage"
    AUDIT_READ = "audit.read"
    EXPORT = "workspace.export"
    REPORTS_READ_APPROVED = "reports.read_approved"


ORG_ROLES = ("owner", "admin", "member")
WORKSPACE_ROLES = ("workspace_admin", "strategist", "media_buyer", "lifecycle", "analyst", "client_viewer")

_WS_ALL = {
    P.WS_READ,
    P.WS_UPDATE,
    P.WS_DELETE,
    P.WS_MEMBERS_MANAGE,
    P.PROJECTS_READ,
    P.PROJECTS_WRITE,
    P.API_KEYS_MANAGE,
    P.AUDIT_READ,
    P.EXPORT,
    P.REPORTS_READ_APPROVED,
}

ORG_ROLE_PERMISSIONS: dict[str, set[P]] = {
    "owner": {P.ORG_UPDATE, P.ORG_DELETE, P.ORG_EXPORT, P.MEMBERS_MANAGE, P.INVITATIONS_MANAGE, P.WORKSPACES_CREATE, P.AUDIT_READ_ORG, P.USAGE_READ}
    | _WS_ALL,
    "admin": {P.ORG_UPDATE, P.MEMBERS_MANAGE, P.INVITATIONS_MANAGE, P.WORKSPACES_CREATE, P.AUDIT_READ_ORG, P.USAGE_READ} | _WS_ALL,
    "member": set(),
}

WORKSPACE_ROLE_PERMISSIONS: dict[str, set[P]] = {
    "workspace_admin": _WS_ALL - {P.WS_DELETE},
    "strategist": {P.WS_READ, P.PROJECTS_READ, P.PROJECTS_WRITE, P.REPORTS_READ_APPROVED},
    "media_buyer": {P.WS_READ, P.PROJECTS_READ, P.PROJECTS_WRITE, P.REPORTS_READ_APPROVED},
    "lifecycle": {P.WS_READ, P.PROJECTS_READ, P.PROJECTS_WRITE, P.REPORTS_READ_APPROVED},
    "analyst": {P.WS_READ, P.PROJECTS_READ, P.PROJECTS_WRITE, P.AUDIT_READ, P.EXPORT, P.REPORTS_READ_APPROVED},
    "client_viewer": {P.WS_READ, P.REPORTS_READ_APPROVED},
}

API_KEY_SCOPES = ("workspace:read", "projects:read", "projects:write", "audit:read")


def org_permissions(org_role: str) -> set[P]:
    return set(ORG_ROLE_PERMISSIONS.get(org_role, set()))


def workspace_permissions(org_role: str, workspace_role: str | None) -> set[P]:
    perms = {p for p in org_permissions(org_role) if p in _WS_ALL}
    if workspace_role:
        perms |= WORKSPACE_ROLE_PERMISSIONS.get(workspace_role, set())
    return perms
