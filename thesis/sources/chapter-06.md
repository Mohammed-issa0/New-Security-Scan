# الفصل السادس: التنفيذ — الخلفية (Backend API)

> التحليل مبني على مواصفة OpenAPI 3.0.1 في ملف `data.json` بعنوان **Cyber Security Testing Platform API v1**.

## 6.1 نظرة عامة

- **النمط:** RESTful API
- **المصادقة:** Bearer JWT في رأس Authorization
- **عدد المسارات:** 67 endpoint (بالإضافة إلى مسارين extension)
- **صيغة التبادل:** JSON (application/json)
- **رموز الحالة:** 200 نجاح، 202 قبول غير متزامن (إنشاء فحص)، 400 خطأ تحقق، 401 غير مصرّح

## 6.2 وحدة المصادقة (Auth)

| Method | Path | الوظيفة |
|--------|------|---------|
| POST | /api/v1/auth/register | تسجيل مستخدم → OTP challenge |
| POST | /api/v1/auth/login | دخول → OTP challenge |
| POST | /api/v1/auth/verify-otp | التحقق → AuthResponse |
| POST | /api/v1/auth/refresh | تجديد accessToken |

**AuthResponse:** userId، fullName، email، accessToken، refreshToken، accessTokenExpiresAt، refreshTokenExpiresAt.

## 6.3 وحدة المستخدمين (Users)

| Method | Path | الوظيفة |
|--------|------|---------|
| GET | /api/v1/users/me | الملف الشخصي |
| PUT | /api/v1/users/me | تحديث الملف |

## 6.4 وحدة الأهداف (Targets)

| Method | Path | الوظيفة |
|--------|------|---------|
| GET/POST | /api/v1/targets | قائمة / إنشاء |
| DELETE | /api/v1/targets/{id} | حذف |
| PUT/DELETE | /api/v1/targets/{id}/browser-auth | مصادقة المتصفح |

**CreateTargetRequest:** `{ "url": "https://example.com" }`

## 6.5 وحدة الفحوصات (Scans)

### إنشاء فحص — CreateScanRequest

يدعم صيغتين:
- **جديدة:** name، targets[]، tool، targetConfig، toolConfig، extraArgs، toolDepths، timeoutMinutes
- **قديمة (Legacy):** targetId، toolNames[]

**الأدوات المدعومة:** zap، ffuf، sqlmap، nmap، xss، ssl (وwpscan في الواجهة).

### مسارات الفحص

| Method | Path | الوظيفة |
|--------|------|---------|
| GET/POST | /api/v1/scans | قائمة / إنشاء (202) |
| GET | /api/v1/scans/{id} | تفاصيل |
| POST | /api/v1/scans/{id}/cancel | إلغاء |
| GET | /api/v1/scans/{id}/tools | حالة الأدوات |
| GET | /api/v1/scans/{id}/vulnerabilities | الثغرات |
| GET | /api/v1/scans/{id}/tools/{toolId}/estimated-finish-time | ETA |
| GET | /api/v1/scans/{id}/export/pdf | PDF |
| POST | /api/v1/scans/{scanId}/jira-tickets | تذاكر Jira |

**ScanStatus:** قيم عددية 1–6 (Pending، Running، Completed، Failed، Canceled، ...).

### Webhook VPS

`POST /api/v1/vps/webhook` — يستقبل إشعار اكتمال المهمة من VPS مع مصادقة Bearer.

## 6.6 وحدة التقارير (Reports)

| Method | Path | الوظيفة |
|--------|------|---------|
| GET | /api/v1/reports/{scanId} | تقرير الفحص |
| GET | /api/v1/reports/{scanId}/export | تصدير |
| POST | /api/v1/reports/{scanId}/generate | توليد غير متزامن |
| GET | /api/v1/reports/generated/{reportId}/status | حالة التوليد |
| GET | /api/v1/reports/generated/{reportId}/download | تحميل PDF |

## 6.7 وحدة الباقات والفوترة

### Plans

| Method | Path | الوظيفة |
|--------|------|---------|
| GET | /api/v1/plans | باقات عامة |
| GET | /api/v1/plans/me | باقة المستخدم النشطة |

**PlanDefinitionBody** (أهم الحقول):
- included_scan_credits، max_runtime_minutes
- allowed_tools، tools (profiles)
- restrictions: allow_auth_scanning، allow_bruteforce
- depth_limits: per_scan، total
- max_concurrent_scans، extra_credit rules

**ActivePlanResponse:** remainingCredits، canBuyExtraCredit، expiresAt، ...

### Billing

| Method | Path | الوظيفة |
|--------|------|---------|
| POST | /api/v1/billing/checkout/plan | Stripe checkout لباقة |
| POST | /api/v1/billing/checkout/extra-credit | شراء رصيد إضافي |
| POST | /api/v1/billing/purchase-plan | شراء مباشر |
| POST | /api/v1/billing/purchase-extra-scan | رصيد إضافي مباشر |
| POST | /api/v1/stripe/webhook | Webhook Stripe |

## 6.8 وحدة Jira

### Jira OAuth (12 endpoint)

initiate → callback → status → disconnect → sites → projects → test-connection → developers (search, verify, CRUD, role).

### Jira Projects (7 endpoint)

CRUD مشاريع، link-target، unlink-target، test-connection.

**CreateJiraTicketsResponse:** createdTickets، skippedCount، failedCount، errors.

## 6.9 وحدة الذكاء الاصطناعي (Ai)

| Method | Path | الوظيفة |
|--------|------|---------|
| POST | /api/v1/ai/scan-config | اقتراح إعداد فحص |
| POST | /api/v1/ai/scans/{scanId}/report | تقرير ما بعد الفحص |

**AiScanConfigResponse:** recommendedToolNames، ai (JSON خام)، tokenUsage.

## 6.10 وحدة Guided Setup

| Method | Path | الوظيفة |
|--------|------|---------|
| POST | /api/v1/guided-setup | بدء جلسة |
| GET | /api/v1/guided-setup/{sessionId} | حالة الجلسة |
| POST | .../answer | إجابة سؤال |
| POST | .../create-scan | إنشاء فحص من التوصية |

## 6.11 وحدة الإدارة (Admin)

| المجال | العمليات |
|--------|----------|
| Users | list، get، create، update، delete |
| Scans | list، get، update، delete، force-fail، cancel-all، export/pdf |
| Audit Logs | list (paginated) |
| Queue | status، delete job، reorder |
| Plans | CRUD definitions، user-plans CRUD |
| Billing | grant-plan |

## 6.12 امتداد المتصفح (ExtensionScan)

| Method | Path | الوظيفة |
|--------|------|---------|
| POST | /api/extension/scan | فحص من امتداد |
| GET | /api/extension/scan/{scanId} | حالة + تقرير |

## 6.13 نموذج الثغرة (Vulnerability)

الحقول: id، scanId، toolName، name، description، affectedResource، severity (1–4)، cvssScore، recommendation، jiraTickets[].

## 6.14 ملخص تقني للـ Backend

يُبنى الـ Backend (مستنتجاً) على ASP.NET Core مع:
- Entity Framework لقاعدة البيانات
- JWT Bearer Authentication
- تكامل Stripe SDK
- Atlassian OAuth 2.0
- طابور Jobs على VPS

التفاصيل الكاملة لـ 67 endpoint في **ملحق أ**.
