# الفصل الرابع: التصميم والهندسة المعمارية

## 4.1 الهندسة المعمارية العامة

تتبع المنصة نمط **ثلاثي الطبقات** مع طبقة BFF:

1. **طبقة العرض:** Next.js في المتصفح (React Client Components + Server Components).
2. **طبقة BFF:** مسارات `app/api/v1/*` في Next.js تعمل كـ Reverse Proxy.
3. **طبقة الأعمال:** Cyber Security Testing Platform API (REST).
4. **طبقة التنفيذ:** عمال VPS يشغّلون أدوات الفحص ويرسلون Webhooks.

**تدفق إنشاء فحص:**
المستخدم → ScanForm → scansService → client.post('/scans') → BFF Proxy → Backend API → Queue → VPS Worker → Webhook → تحديث الحالة والثغرات.

## 4.2 تصميم الواجهة الأمامية

### هيكل المجلدات (App Router)

```
app/[locale]/
  (auth)/login, register, verify-otp
  (app)/scans, targets, profile, billing, settings/jira, jira/projects
  admin/users, scans, queue, plans, billing, audit-logs
  page.tsx (Landing)
```

### طبقات البرمجيات

| الطبقة | المسار | المسؤولية |
|--------|--------|-----------|
| Pages | app/[locale]/ | تجميع الواجهة والتوجيه |
| Components | components/ | مكونات قابلة لإعادة الاستخدام |
| Services | lib/*/ *Service.ts | منطق الأعمال في الواجهة |
| API Client | lib/api/client.ts | HTTP + JWT refresh |
| Endpoints | lib/api/endpoints.ts | تعريف مسارات API |
| Types | lib/api/types.ts | أنواع TypeScript |

## 4.3 تصميم BFF Proxy

الملف `_backend-proxy.ts` يوجّه الطلبات إلى `API_BASE_URL` أو `https://backend.blackbrains.tech` افتراضياً. يمرّر:
- `Authorization` (JWT)
- `X-Forwarded-Host` و `X-Forwarded-Proto`
- `X-Internal-Service-Token` عند الحاجة

المسار `[...path]/route.ts` يلتقط كل طلبات `/api/v1/*` ويعيد الاستجابة كما هي (بما فيها Blob لملفات PDF).

## 4.4 تصميم Backend (من OpenAPI)

الوحدات الوظيفية (Tags) في `data.json`:

| الوحدة | عدد المسارات التقريبي | الوظيفة |
|--------|----------------------|---------|
| Admin | 15 | إدارة مستخدمين وفحوصات |
| Scans | 12 | دورة حياة الفحص |
| JiraOAuth | 12 | OAuth مع Atlassian |
| JiraProjects | 7 | مشاريع Jira |
| Auth | 4 | مصادقة |
| GuidedSetup | 4 | مساعد الإعداد |
| Billing | 4+ | دفع Stripe |
| Reports | 5 | تقارير |
| Targets | 5 | أهداف |
| Plans | 2 | باقات |
| Ai | 2 | ذكاء اصطناعي |
| Users | 2 | ملف المستخدم |
| ExtensionScan | 2 | امتداد متصفح |
| Webhooks | 2 | Stripe + VPS |

## 4.5 نموذج البيانات (ERD)

**الكيانات الرئيسية:**
- **User:** مستخدم المنصة.
- **WebsiteTarget:** URL مُسجَّل للفحص.
- **Scan:** طلب فحص واحد.
- **ScanTool:** أداة مُشغَّلة ضمن فحص.
- **Vulnerability:** ثغرة مكتشفة.
- **UserPlan / PlanDefinition:** باقة المستخدم وتعريفها.
- **JiraProject / JiraTicket:** تكامل Jira.
- **AuditLog:** سجل تدقيق إداري.
- **GuidedSetupSession:** جلسة المساعد الذكي.

**العلاقات:**
- User 1—N WebsiteTarget
- User 1—N Scan
- Scan 1—N ScanTool
- Scan 1—N Vulnerability
- Vulnerability 1—N JiraTicket
- User 1—1 UserPlan (نشط)
- JiraProject N—N WebsiteTarget (ربط)

## 4.6 مخططات التسلسل

### تدفق المصادقة

1. POST /auth/login → OtpChallenge (otpToken)
2. POST /auth/verify-otp → AuthResponse (tokens)
3. client.ts يخزّن التوكنات ويجدّدها عبر /auth/refresh

### تدفق الفحص الكامل

1. POST /scans → 202 + scanId
2. Backend يُدخل Job في الطابور
3. VPS يسحب المهمة ويشغّل الأداة
4. POST /vps/webhook → تحديث ScanTool + Vulnerabilities
5. GET /scans/{id}/vulnerabilities → عرض للمستخدم

## 4.7 تصميم واجهة المستخدم

### صفحة الهبوط (Landing)
أقسام: Hero، Features، Tools، Plans، HowItWorks، AuthHighlight، Trust، Personas، CTA، Footer + FloatingAssistant.

### نموذج الفحص (ScanForm)
أقسام: AI Assistant، General Config، Connection Settings، Tool Config، Advanced (extra_args)، CAPTCHA warning، Scan Summary.

### صفحة التفاصيل
تبويبات: Overview، Tools (مع ETA)، Vulnerabilities، Report (AI + PDF).

### لوحة الإدارة
شريط جانبي + صفحات: Overview، Users، Scans، Audit Logs، Queue، Plans، Billing.

## 4.8 تصميم الأمان

| الآلية | التطبيق |
|--------|---------|
| OTP | بعد login/register قبل إصدار JWT |
| JWT Refresh | proactive + on 401 في client.ts |
| Admin RBAC | middleware.ts يفحص claim admin في JWT |
| AuthGuard | يحمي صفحات (app) |
| Plan Enforcement | Backend يرفض طلبات تتجاوز الباقة |
| Scope Signing | scopeSigned إلزامي أخلاقياً/قانونياً |

## 4.9 قرارات التصميم (Design Decisions)

| القرار | البديل المرفوض | المبرر |
|--------|----------------|--------|
| BFF Proxy | اتصال مباشر من المتصفح | إخفاء Backend URL، CORS، cookies |
| Single-tool per scan | Multi-tool في طلب واحد | بساطة الطابور والفوترة |
| next-intl | i18n يدوي | دعم RTL وترجمة منظمة |
| React Query | Redux | cache وrefetch للفحوصات الحية |
| Zod validation | validation يدوي | عقد قريب من Backend |
