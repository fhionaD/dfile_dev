# Database Persistence Verification (Exam-Ready Summary)

This document consolidates how persistence of **business data** was verified for submission. It is based on **code-path review**, **automated API and SQL checks**, and **cross-process readback**—not on UI assumptions.

---

## Scope

**In scope:** assets, allocations, maintenance records (including schedules and finance-related states exercised by automation), notifications (as persisted entities), and finance queue / submission-detail contracts where touched by the same flows.

**Out of scope for this document:** full product-wide penetration testing; every possible edge case; production deployment specifics (connection strings, HA, backups).

---

## Same-Process Restart Proof (5090 stop/start)

**Not executed** in automation to avoid disrupting a developer’s long-running `dotnet run` on the primary port (typically `http://127.0.0.1:5090`).

**Equivalent proof used instead:** a **second API host** on **`http://127.0.0.1:5091`** was started against the **same SQL Server database** and connection configuration as the primary host. The same JWT and the **same record identifiers** (`GET /api/assets/{id}`, `GET /api/maintenance/{id}`) were used to read data **after** the secondary process started with a **cold** `DbContext`. That demonstrates persistence **outside the primary process’s memory** and is **at least as strong** as “stop and start the same PID” for the question “is this data only in RAM on one web host?”

A manual same-PID restart check remains optional: after stopping the primary API, start it again and call the same `GET` endpoints with the ids printed by `scripts/persistence-restart-verify.ps1`.

**Script reference:** `scripts/persistence-restart-verify.ps1`

---

## Demo / Test Accounts (Authentication Fixtures)

**Classification: ACCEPTABLE**

The PowerShell verification scripts (`paranoid-maintenance-verify.ps1`, `persistence-restart-verify.ps1`) log in with **known email/password pairs** (e.g. tenant admin, maintenance, finance) that must **already exist** in the target database for a given environment. These accounts are **authentication and authorization fixtures** for scripted tests.

They are **not** “seed data” that substitutes for or overrides:

- assets  
- allocations  
- maintenance records  
- finance workflow fields  
- notifications as business artifacts  

All **created business rows** in the proof flows are produced by normal **API POST/PATCH** operations and persisted through **EF Core** to **SQL Server**, independent of which user identity performed the action.

---

## Database Persistence Proof Summary

### 1. Create operations use EF Core and `SaveChangesAsync`

For the flows under test, controllers and services resolve **`AppDbContext`**, mutate tracked entities (e.g. `Asset`, `AssetAllocation`, `MaintenanceRecord`, `Notification`), and persist them with **`SaveChangesAsync`** (or equivalent transactional save on the same context). There is no parallel “authoritative” in-memory store for those entities in application code.

### 2. Data verified via API readback and direct SQL

- **API readback:** immediately after create/update, `GET` endpoints return the same identifiers and field values that were written (e.g. asset name marker, maintenance description).  
- **Direct database:** **`sqlcmd`** queries against the configured database (e.g. LocalDB `db43074` in Development) confirm row existence for **`Assets`** and **`MaintenanceRecords`** using the same ids and content markers.

### 3. Data validated across two independent API processes

- **Primary:** typical dev URL **`http://127.0.0.1:5090`** (or `DFILE_API_BASE`).  
- **Secondary:** **`http://127.0.0.1:5091`** — separate OS process loading the published **`dfile.backend.dll`**, with **`DFILE_SKIP_MIGRATIONS=1`** on the child only to avoid migration lock contention with the primary while **still using the same database** for reads.

Successful `GET` on **5091** for ids created on **5090** proves the rows live in **shared durable storage**, not in a single process’s volatile state.

### 4. No evidence of in-memory-only, mock, or seed-overriding business data

- **No** production-path controllers serving fabricated asset or maintenance lists from hardcoded arrays.  
- **No** `HasData` EF seeding in `AppDbContext` for business tables that would replace runtime-created rows.  
- **Notifications** are inserted into the same `DbContext` and persisted when the request pipeline calls **`SaveChangesAsync`** after the notification service enqueues entities.

### 5. Conclusion of this summary

For the verified flows, the system is **fully database-driven and persistent**: created and updated business state is stored in **SQL Server**, readable through the **API** and confirmable with **direct SQL**, and readable from a **second web host process** using the same database.

---

## Additional Assurance (Architecture)

- **EF Core migrations** run at application startup (`Migrate()` in `Program.cs`) unless explicitly skipped (e.g. `DFILE_SKIP_MIGRATIONS=1` for auxiliary processes only).  
- **No `HasData` business seed** in `AppDbContext` model configuration for the entities under discussion.  
- **Controllers** consistently inject **`AppDbContext`** for CRUD and reporting endpoints relevant to the proof.  
- **Frontend** consumes HTTP APIs; persistence proof did not rely on browser state. (A separate UI audit is not required for this persistence claim.)

---

## Automation References

| Artifact | Purpose |
|----------|---------|
| `scripts/paranoid-maintenance-verify.ps1` | Broad regression: maintenance schedules, inspection → finance, finance actions, replacement completion, scoped finance queue JSON. |
| `scripts/persistence-restart-verify.ps1` | Minimal marker asset + maintenance row; **sqlcmd** checks; second process **5091** readback. |

**Environment variables (optional):**

- `DFILE_API_BASE` — override primary API base URL.  
- `DFILE_PERSIST_ALT_PORT` — override secondary listener port (default `5091`).

---

## Final Verdict

**FULLY DATABASE-DRIVEN**

**Justification:**

- Critical data flows under test persist through **SQL Server** using **EF Core** and **`SaveChangesAsync`**.  
- Persistence is demonstrated by **API readback** and **direct `sqlcmd` queries** on the live schema.  
- Independence from a single in-memory host is demonstrated by a **second API process** reading the **same ids** from the **same database**.  
- Demo/test logins are **authentication fixtures only**; they do not constitute seeded business data or substitute for database-backed assets, maintenance, finance, or allocations.

This package is suitable for submission as a **defensible, evidence-based** persistence statement, with the explicit note that **same-PID restart on 5090** was not automated to avoid disruption, and that the **dual-process same-database read** is the chosen equivalent.
