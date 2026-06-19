# الفصل الخامس: التنفيذ — الواجهة الأمامية

## 5.1 بيئة التطوير والتقنيات

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| Next.js | 14.2.16 | إطار التطبيق، App Router، API Routes |
| React | 18 | واجهة المستخدم |
| TypeScript | 5 | أمان الأنواع |
| TanStack Query | 5.96 | إدارة حالة الخادم |
| Zod | 3.23 | التحقق من النماذج |
| react-hook-form | 7.53 | إدارة نماذج الفحص |
| next-intl | 3.26 | الترجمة ar/en |
| Framer Motion | 11 | حركات واجهة |
| Tailwind CSS | 3.4 | تنسيق |
| Sonner | 2.0 | إشعارات |
| Playwright | 1.53 | اختبارات E2E |

**أوامر التشغيل:** `npm run dev` (تطوير)، `npm run build` (إنتاج)، `npm run test:e2e` (اختبار).

## 5.2 نظام المصادقة

### تدفق OTP

1. `authService.login()` → `OtpChallengeResponse` (otpToken, maskedEmail)
2. المستخدم يُدخل الرمز في `/verify-otp`
3. `authService.verifyOtp()` → `AuthResponse` مع accessToken وrefreshToken
4. `tokenStore.setTokens()` يحفظ التوكنات مع تواريخ الانتهاء

### تجديد الجلسة (client.ts)

- تجديد استباقي إذا انتهى accessToken
- عند 401: محاولة refresh ثم إعادة الطلب
- عند فشل refresh: مسح الجلسة وتوجيه لـ login

### الحماية

- `AuthGuard` يلفّ تخطيط `(app)/layout.tsx`
- `AdminGuard` في تخطيط الإدارة
- `middleware.ts` يفحص JWT cookie لمسارات `/admin`

## 5.3 إدارة الأهداف

صفحة `targets/page.tsx` تتيح:
- إنشاء هدف جديد (URL)
- عرض قائمة paginated
- حذف هدف
- إعداد Browser Auth (`PUT /targets/{id}/browser-auth`)

الأهداف تُستخدم في ScanForm عبر `select[name="targetId"]`.

## 5.4 نموذج إنشاء الفحص

### مخطط Zod (schema.ts)

الحقول الرئيسية: name، targets، tool (enum 7 قيم)، tool_depth، scopeSigned، timeoutMinutes، target_config (headers, authentication)، zap_config، ffuf_config، extra_args، has_captcha.

### بناء الحمولة (mappers.ts)

`buildPayload()` يحوّل قيم النموذج إلى `CreateScanRequest` متوافق مع Backend (camelCase → targetConfig, toolConfig).

### ScanForm.tsx

- يجلب الباقة الحالية (`plansService.me()`) لعرض القيود
- يدعم اقتراح AI (`ai/scan-config`)
- يعرض JsonPreviewDialog للمراجعة قبل الإرسال
- عند النجاح يوجّه لـ `/scans/{id}`

## 5.5 صفحة تفاصيل الفحص

ملف `scans/[id]/page.tsx` (~896 سطر) يتضمن:

- **Overview:** حالة الفحص، أوقات البدء/الانتهاء، إلغاء
- **Tools:** قائمة أدوات مع ETA لكل أداة (`getToolEstimatedFinishTime`)
- **Vulnerabilities:** جدول ثغرات مع severity وCVSS
- **Report:** توليد AI report، تصدير PDF، إنشاء Jira tickets

يستخدم `useQuery` مع `refetchInterval` لتحديث الحالة أثناء التشغيل.

## 5.6 المساعد الذكي (FloatingAssistant)

مكوّن في Landing ويمكن فتحه كدردشة:
- `guidedSetupService.start()` يبدأ جلسة
- أسئلة متتابعة عبر `answer()`
- عند اكتمال التوصية: `createScan()`
- يحفظ الحالة في `localStorage` تحت `securityscan.ai-assistant.state`

## 5.7 التعدد اللغوي

- `middleware.ts` + `next-intl` للتوجيه `/ar/*` و `/en/*`
- ملفات ترجمة شاملة في `messages/ar.json` (800+ مفتاح)
- خط عربي في Landing: `font-arabic`
- `LanguageSwitcher` في Navbar

## 5.8 لوحة الإدارة

| الصفحة | الخدمة | الميزات |
|--------|--------|---------|
| admin/page.tsx | adminService | إحصائيات حية كل 5 ثوانٍ للطابور |
| admin/users | users CRUD | إنشاء، تعديل، حذف |
| admin/scans | scans admin | force-fail، export PDF |
| admin/queue | queue | حذف، reorder |
| admin/plans | plans | تعريف باقات، user-plans |
| admin/audit-logs | audit | سجل Actions |
| admin/billing | grant-plan | منح باقة يدوياً |

## 5.9 طبقة endpoints.ts

ملف مركزي (249 سطر) يعرّف كل استدعاءات API بأنواع TypeScript. يضمن **عقداً واحداً** بين الواجهة والوثيقة OpenAPI.

## 5.10 معالجة الأخطاء

- `ApiRequestError` يحمل status وpayload
- `AsyncStates` (Loading, Error, Empty) في الصفحات
- `toast` من Sonner للإشعارات
- `AppErrorFallback` و `error.tsx` لأخطاء Next.js
