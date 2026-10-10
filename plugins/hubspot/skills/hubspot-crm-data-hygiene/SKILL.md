---
name: hubspot-crm-data-hygiene
description: "当需要审查 HubSpot 数据质量——包括缺失字段、过期记录、重复项、关联关系、负责人或清理任务——时使用。"
---

# HubSpot CRM Data Hygiene

Identify cleanup needs across contacts, companies, deals, and tickets. Follow [../hubspot/SKILL.md](../hubspot/SKILL.md) for access, URLs, pagination, and write approvals.

## Workflow

1. Call `get_user_details` and confirm read access to the requested object types.
2. Clarify issue classes: missing fields, stale records, duplicate-like records, owner gaps, associations, lifecycle/stage issues, or imports.
3. Discover properties with `search_properties`: contact email/phone/company/owner/lifecycle; company name/domain/website/owner; deal stage/pipeline/amount/close date; ticket subject/stage/priority/category/owner.
4. Use `get_properties` for enums, then `search_crm_objects` count queries with `NOT_HAS_PROPERTY`, `HAS_PROPERTY`, filters, and `associatedWith`.
5. For duplicate-like checks, prefer strong keys: contact email, company domain/website, phone, or deal name plus associated company. If aggregation is unavailable, sample and say so.
6. Fetch examples with `get_crm_objects` only when current values affect cleanup.

## Issue Classes

- Missing routing or identity fields.
- Stale activity, old modified dates, past close dates, or unresolved ticket age.
- Broken associations, inconsistent lifecycle/stage values, or duplicate-like records sharing strong identifiers.

## Output

Return coverage, top issues with counts, example URLs, why each issue matters, recommended fix, cleanup backlog, human-review items, and caveats. Do not auto-merge duplicates or overwrite fields. For writes, use the core confirmation table.
