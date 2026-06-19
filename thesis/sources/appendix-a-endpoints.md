# ملحق أ: جدول واجهات برمجة التطبيقات (API Endpoints)

**الإجمالي:** 89 endpoint

| # | الوحدة | الطريقة | المسار | الوصف |
|---|--------|---------|--------|-------|
| 1 | Admin | GET | `/api/v1/admin/audit-logs` | — |
| 2 | Admin | GET | `/api/v1/admin/scans` | — |
| 3 | Admin | POST | `/api/v1/admin/scans` | — |
| 4 | Admin | POST | `/api/v1/admin/scans/cancel-all` | Admin-only: cancel all scans that are Pending or Running. Marks each scan as Canceled, marks Pending/Running tools as Fa |
| 5 | Admin | DELETE | `/api/v1/admin/scans/{id}` | — |
| 6 | Admin | GET | `/api/v1/admin/scans/{id}` | — |
| 7 | Admin | PUT | `/api/v1/admin/scans/{id}` | — |
| 8 | Admin | GET | `/api/v1/admin/scans/{id}/export/pdf` | Exports scan report as PDF (admin version - any scan). |
| 9 | Admin | POST | `/api/v1/admin/scans/{id}/force-fail` | Admin-only operational endpoint to force-fail a stuck scan (e.g., a scan left Running due to a crash). This will set Sca |
| 10 | Admin | GET | `/api/v1/admin/users` | — |
| 11 | Admin | POST | `/api/v1/admin/users` | — |
| 12 | Admin | DELETE | `/api/v1/admin/users/{id}` | — |
| 13 | Admin | GET | `/api/v1/admin/users/{id}` | — |
| 14 | Admin | PUT | `/api/v1/admin/users/{id}` | — |
| 15 | AdminBilling | POST | `/api/v1/admin/billing/grant-plan` | Admin-only helper to grant a plan to a user (no Stripe). Useful for support and local testing. |
| 16 | AdminPlans | GET | `/api/v1/admin/plans` | List all plan definitions. |
| 17 | AdminPlans | GET | `/api/v1/admin/plans/user-plans` | List all user plan instances. |
| 18 | AdminPlans | DELETE | `/api/v1/admin/plans/user-plans/{id}` | Delete user plan. |
| 19 | AdminPlans | GET | `/api/v1/admin/plans/user-plans/{id}` | Get user plan details by ID. |
| 20 | AdminPlans | PUT | `/api/v1/admin/plans/user-plans/{id}` | Update user plan. |
| 21 | AdminPlans | DELETE | `/api/v1/admin/plans/{planName}` | Delete plan definition. |
| 22 | AdminPlans | GET | `/api/v1/admin/plans/{planName}` | Get plan definition by name. |
| 23 | AdminPlans | PUT | `/api/v1/admin/plans/{planName}` | Replace entire plan definition by plan name. |
| 24 | AdminQueue | GET | `/api/v1/admin/queue` | Get current VPS queue with estimated finish times. |
| 25 | AdminQueue | PUT | `/api/v1/admin/queue/reorder` | Reorder a job in the VPS queue. |
| 26 | AdminQueue | DELETE | `/api/v1/admin/queue/{vpsJobId}` | Delete a job from the VPS queue. |
| 27 | Ai | POST | `/api/v1/ai/scan-config` | Pre-scan: converts a user's intent into a strict scan configuration (AI-powered). |
| 28 | Ai | POST | `/api/v1/ai/scans/{scanId}/report` | Post-scan: generates a summarized vulnerability report (AI-powered) for an existing scan. |
| 29 | Auth | POST | `/api/v1/auth/login` | Step 1 of 2 for login. Validates credentials and sends a 6-digit verification code to the account email. Complete login  |
| 30 | Auth | POST | `/api/v1/auth/refresh` | Issues a new access token using a valid refresh token. |
| 31 | Auth | POST | `/api/v1/auth/register` | Step 1 of 2 for registration. Creates a pending account and sends a 6-digit verification code to the supplied email. Com |
| 32 | Auth | POST | `/api/v1/auth/verify-otp` | Step 2 of 2 for both registration and login. Submits the 6-digit code received by email together with the otpToken retur |
| 33 | Billing | POST | `/api/v1/billing/checkout/extra-credit` | — |
| 34 | Billing | POST | `/api/v1/billing/checkout/plan` | — |
| 35 | Billing | POST | `/api/v1/billing/purchase-extra-scan` | Purchase an extra scan credit without Stripe payment (direct purchase for testing/admin). |
| 36 | Billing | POST | `/api/v1/billing/purchase-plan` | Purchase or renew a plan without Stripe payment (direct purchase for testing/admin). |
| 37 | ExtensionScan | POST | `/api/extension/scan` | — |
| 38 | ExtensionScan | GET | `/api/extension/scan/{scanId}` | — |
| 39 | GuidedSetup | POST | `/api/v1/guided-setup` | Start a new guided setup session and receive the first question. |
| 40 | GuidedSetup | GET | `/api/v1/guided-setup/{sessionId}` | Get the current state of a guided setup session (for resume / display). |
| 41 | GuidedSetup | POST | `/api/v1/guided-setup/{sessionId}/answer` | Submit an answer to the current question and advance the wizard. Returns either the next question or the final scan reco |
| 42 | GuidedSetup | POST | `/api/v1/guided-setup/{sessionId}/create-scan` | Create a real scan from a completed session's recommendation. The session must be in Complete status. |
| 43 | JiraOAuth | GET | `/api/v1/jira/oauth/callback` | Handles the OAuth callback from Atlassian. This endpoint is hit by the user's browser as a redirect from Atlassian — no  |
| 44 | JiraOAuth | GET | `/api/v1/jira/oauth/developers` | Returns all locally mapped developer profiles for the authenticated user. |
| 45 | JiraOAuth | GET | `/api/v1/jira/oauth/developers/search` | Searches for Jira users by display name or email fragment on a specific site. |
| 46 | JiraOAuth | POST | `/api/v1/jira/oauth/developers/verify` | Verifies a Jira account exists on the site and creates/updates a local developer mapping. |
| 47 | JiraOAuth | DELETE | `/api/v1/jira/oauth/developers/{jiraAccountId}` | Soft-deletes a developer mapping. |
| 48 | JiraOAuth | PUT | `/api/v1/jira/oauth/developers/{jiraAccountId}/role` | Updates the custom role label for an existing developer mapping. |
| 49 | JiraOAuth | DELETE | `/api/v1/jira/oauth/disconnect` | Disconnects the Atlassian OAuth integration (removes stored tokens). |
| 50 | JiraOAuth | GET | `/api/v1/jira/oauth/initiate` | Returns the Atlassian OAuth authorization URL. The frontend should redirect the user's browser to this URL. |
| 51 | JiraOAuth | GET | `/api/v1/jira/oauth/projects` | Returns all Jira projects for a specific site (cloudId). |
| 52 | JiraOAuth | GET | `/api/v1/jira/oauth/sites` | Returns all Jira sites accessible by the connected Atlassian account. |
| 53 | JiraOAuth | GET | `/api/v1/jira/oauth/status` | Returns the current Atlassian OAuth connection status for the authenticated user. |
| 54 | JiraOAuth | POST | `/api/v1/jira/oauth/test-connection` | Performs a live connectivity test against the specified Jira site. |
| 55 | JiraProjects | GET | `/api/v1/jira-projects` | Get all Jira projects for the current user. |
| 56 | JiraProjects | POST | `/api/v1/jira-projects` | Create a new Jira project configuration. |
| 57 | JiraProjects | DELETE | `/api/v1/jira-projects/unlink-target/{targetId}` | Unlink a Jira project from a target. |
| 58 | JiraProjects | DELETE | `/api/v1/jira-projects/{id}` | Delete (soft delete) a Jira project. |
| 59 | JiraProjects | GET | `/api/v1/jira-projects/{id}` | Get a specific Jira project by ID. |
| 60 | JiraProjects | PUT | `/api/v1/jira-projects/{id}` | Update a Jira project configuration. |
| 61 | JiraProjects | POST | `/api/v1/jira-projects/{id}/link-target` | Link a Jira project to a target. |
| 62 | JiraProjects | POST | `/api/v1/jira-projects/{id}/test-connection` | Test Jira connection for a project. |
| 63 | Plans | GET | `/api/v1/plans` | Public list of available plans (prices, credits, max runtime, enabled tools). |
| 64 | Plans | GET | `/api/v1/plans/me` | Returns the current user's active plan + remaining credits. |
| 65 | Reports | GET | `/api/v1/reports/generated/{reportId}/download` | — |
| 66 | Reports | GET | `/api/v1/reports/generated/{reportId}/status` | — |
| 67 | Reports | GET | `/api/v1/reports/{scanId}` | — |
| 68 | Reports | GET | `/api/v1/reports/{scanId}/export` | — |
| 69 | Reports | POST | `/api/v1/reports/{scanId}/generate` | — |
| 70 | Scans | GET | `/api/v1/scans` | — |
| 71 | Scans | POST | `/api/v1/scans` | Creates a new security scan. |
| 72 | Scans | GET | `/api/v1/scans/{id}` | — |
| 73 | Scans | POST | `/api/v1/scans/{id}/cancel` | — |
| 74 | Scans | GET | `/api/v1/scans/{id}/export/pdf` | Exports scan report as PDF with Arabic support. |
| 75 | Scans | GET | `/api/v1/scans/{id}/tools` | — |
| 76 | Scans | GET | `/api/v1/scans/{id}/tools/{toolId}/estimated-finish-time` | Gets estimated finish time for a scan tool job. |
| 77 | Scans | GET | `/api/v1/scans/{id}/vulnerabilities` | — |
| 78 | Scans | POST | `/api/v1/scans/{scanId}/jira-tickets` | Create Jira tickets for an existing scan (manual/retroactive ticket creation). |
| 79 | Scans | GET | `/internal/scans/{scanId}/findings` | INTERNAL ONLY: Get raw findings for a scan (for report generation microservice). Requires X-Internal-Service-Token heade |
| 80 | Scans | GET | `/internal/scans/{scanId}/trend` | INTERNAL ONLY: Get trend data for a scan (for report generation microservice). Requires X-Internal-Service-Token header. |
| 81 | StripeWebhook | POST | `/api/v1/stripe/webhook` | — |
| 82 | Targets | GET | `/api/v1/targets` | — |
| 83 | Targets | POST | `/api/v1/targets` | — |
| 84 | Targets | DELETE | `/api/v1/targets/{id}` | — |
| 85 | Targets | DELETE | `/api/v1/targets/{id}/browser-auth` | Remove browser-based auth configuration from a target. |
| 86 | Targets | PUT | `/api/v1/targets/{id}/browser-auth` | Set browser-based login credentials for a target (for authenticated scanning). Credentials are encrypted and used by the |
| 87 | Users | GET | `/api/v1/users/me` | — |
| 88 | Users | PUT | `/api/v1/users/me` | — |
| 89 | VpsWebhook | POST | `/api/v1/vps/webhook` | Receives webhook callbacks from VPS when a job completes. Authenticates using Bearer token (same token used for VPS API  |