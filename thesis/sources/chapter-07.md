# الفصل السابع: الاختبار والتحقق

## 7.1 استراتيجية الاختبار

| المستوى | الأداة | النطاق |
|---------|--------|--------|
| E2E | Playwright | مسارات المستخدم الرئيسية |
| يدوي | المتصفح | واجهة عربية/إنجليزية |
| عقد API | OpenAPI + endpoints.ts | مطابقة المسارات والأنواع |
| دخاني (Smoke) | smoke.spec.ts | قبل كل إصدار |

## 7.2 بيئة الاختبار

- **Frontend:** `http://localhost:3000` (npm run dev)
- **Backend:** `backend.blackbrains.tech` عبر Proxy
- **متغيرات E2E:** E2E_USER_EMAIL، E2E_USER_PASSWORD، E2E_ADMIN_EMAIL، E2E_ADMIN_PASSWORD، E2E_JIRA_*

## 7.3 اختبارات E2E (smoke.spec.ts)

| الاختبار | الوصف |
|----------|-------|
| login flow test | دخول → توجيه /scans |
| create target test | إنشاء URL جديد |
| create scan test | فحص جديد → صفحة التفاصيل |
| report export test | تحميل PDF |
| Jira config test | إنشاء إعداد Jira (يتطلب env) |
| Jira developer mapping | بحث، تحقق، دور، حذف (mocked APIs) |
| admin smoke test | 7 مسارات admin بدون خطأ |

## 7.4 جدول حالات الاختبار

| ID | السيناريو | الخطوات | المتوقع | الحالة |
|----|-----------|---------|---------|--------|
| TC-01 | تسجيل دخول | email+password → submit | /scans | Pass* |
| TC-02 | إنشاء هدف | targets → create URL | ظهور في القائمة | Pass* |
| TC-03 | إنشاء فحص | scans/new → submit | /scans/{uuid} | Pass* |
| TC-04 | تصدير PDF | تفاصيل → export | ملف .pdf | Pass* |
| TC-05 | واجهة عربية | /ar/ | نص عربي RTL | Pass |
| TC-06 | حماية admin | مستخدم عادي → /admin | redirect | Pass |
| TC-07 | Jira dev map | بحث → verify → role | تحديث القائمة | Pass (mock) |
| TC-08 | Admin routes | 7 صفحات admin | main visible | Pass* |

*يتطلب بيانات اعتماد E2E واتصال Backend.

## 7.5 التحقق من العقد (Contract Validation)

تمت مقارنة `lib/api/endpoints.ts` مع مسارات `data.json`:
- جميع مسارات auth، users، targets، scans، reports، plans، billing، jira، ai، guided-setup، admin **مغطاة**
- أسماء المسارات متطابقة تحت `/api/v1/`
- أنواع TypeScript في `lib/api/types.ts` و `lib/admin/types.ts` تتوافق مع schemas الرئيسية

## 7.6 اختبار الأداء (ملاحظات)

- إنشاء الفحص يعيد 202 فوراً (لا انتظار تنفيذ VPS) — تجربة مستخدم جيدة
- refetchInterval في صفحة التفاصيل والإدارة يوازن بين الحداثة والحمل
- Proxy يستخدم `cache: 'no-store'` لبيانات حية

## 7.7 قيود الاختبار

1. اعتماد على Backend خارجي قد يكون غير متاح أثناء الاختبار المحلي.
2. بعض الاختبارات تُتخطى (test.skip) بدون متغيرات بيئة.
3. لا توجد اختبارات وحدة (Unit) منفصلة للمكونات — فرصة تحسين مستقبلية.
4. فحص Jira الحقيقي يتطلب بيانات Atlassian صالحة.

## 7.8 معايير القبول

اعتُبر المشروع ناجحاً في الاختبار عند:
- مرور جميع smoke tests المتاحة
- إمكانية عرض دورة فحص كاملة يدوياً
- تصدير PDF بنجاح
- وصول Admin لجميع صفحات لوحة التحكم
