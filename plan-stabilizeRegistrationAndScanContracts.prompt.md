## Plan: Stabilize Registration and Scan Contracts

هدف الخطة هو إغلاق الفجوات بين Swagger والتنفيذ الحالي في مساري التسجيل وإنشاء الـ scan، مع تقليل الـ drift بين الـ form والـ proxy routes والـ backend contract.

**Phase 1: Scope and Contract Review**
1. تثبيت النطاق الحالي على `register` و`create scan` فقط، واستبعاد أي صفحات أو flows أخرى إلا إذا ظهرت تبعية مباشرة.
2. مراجعة Swagger في `data.json` لمساري `/api/v1/auth/register` و`/api/v1/scans` واستخراج الحقول المتوقعة والاستجابات المطلوبة.
3. مقارنة الحقول الفعلية في المشروع مع العقد المرجعي لتحديد الفجوات: `RegisterRequest`, `CreateScanRequest`, `toolDepths`, وصيغ `camelCase` مقابل `snake_case`.
4. تحديد ما إذا كان الإنفاذ المطلوب على scans يجب أن يبقى في frontend proxy route أو يُنقل لاحقًا إلى backend.

**Phase 2: Registration Flow**
1. تثبيت قاعدة الأولوية النهائية للاسم: `fullName` أولًا، ثم `firstName + lastName` إذا كان `fullName` غير موجود.
2. التأكد من أن validation في صفحة التسجيل يرفض الحالات الناقصة ويقبل الحالات الثلاث الصحيحة: full name فقط، split name فقط، أو الثلاثة معًا.
3. توحيد شكل الـ payload بين الصفحة و`authService` وroute `/api/v1/auth/register` حتى لا يحدث تطبيع مكرر أو متضارب.
4. تحديث الرسائل والترجمات الخاصة بالتسجيل حتى تعكس السلوك الحقيقي للمستخدم.
5. اختبار حالات الحافة: حقول فارغة، split name ناقص، full name مع split name معًا، وتأكيد أن `fullName` يأخذ الأولوية.

**Phase 3: Scan Creation Contract**
1. مراجعة `CreateScanRequest` الحالي ومقارنته بعقد Swagger لتحديد أي حقول ناقصة أو مختلفة.
2. فحص `buildPayload` و`scanFormSchema` للتأكد أن جميع الحقول المرسلة من الواجهة تتوافق مع العقد الجديد.
3. تحديد هل `toolDepths` يحتاج إضافة فعلية في types/mappers/schema أو يبقى خارج التنفيذ الحالي.
4. توحيد camelCase داخل TypeScript payloads، واعتبار أي snake_case في Swagger مجرد reference format أو naming داخلي للباكند.
5. التأكد من أن `has_captcha` يبقى frontend-only ما لم يكن له مقابل صريح في العقد.

**Phase 4: Concurrency Enforcement**
1. الإبقاء على إنفاذ `max_concurrent_scans` داخل route إنشاء الـ scan قبل forwarding إلى الباكند.
2. التأكد من أن العدّ يعتمد فقط على scans بحالتي `Pending` و`Running`.
3. تثبيت معنى `0` = unlimited، وعدم رفض الإنشاء إذا كانت قيمة الحد صفرًا أو غير معرفة.
4. جعل رسالة الرفض واضحة للمستخدم عندما يتم تجاوز الحد.
5. التحقق من أن المسار نفسه يعمل أيضًا مع guided setup create-scan حتى لا توجد ثغرة التفاف.
6. مراجعة سيناريوهات الفشل: تعذر قراءة الخطة، تعذر عدّ scans، أو عدم القدرة على تحديد الحد.

**Phase 5: Cleanup and Alignment**
1. تنظيف أي validation أو hints أو translation keys مرتبطة بالتسجيل أو إنشاء الـ scan حتى لا تكرر نفس القاعدة في أكثر من مكان.
2. إزالة أي توضيحات قديمة أو مضللة داخل التعليقات أو النصوص إذا كانت تعطي انطباعًا مختلفًا عن السلوك النهائي.
3. التأكد من أن ملفات type definitions تعكس فعليًا ما تستخدمه الواجهة وما يتوقعه الـ backend.

**Phase 6: Verification**
1. تشغيل `get_errors` على جميع الملفات المعدلة بعد أي تغيير.
2. اختبار التسجيل يدويًا في ثلاث حالات: `fullName` فقط، `firstName + lastName` فقط، والثلاثة معًا.
3. اختبار إنشاء scan من `/scans/new` والتحقق من أن الـ payload الناتج يطابق العقد وأن proxy route يمرره كما هو.
4. اختبار الحد التزامني عبر محاكاة وجود scans نشطة والتأكد من الرفض الصحيح عند تجاوز الحد.
5. إذا كانت E2E متاحة، تشغيل smoke على `/register`, `/scans/new`, و`/scans`.

**Relevant files**
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/app/[locale]/(auth)/register/page.tsx` — validation وواجهة التسجيل.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/app/api/v1/auth/register/route.ts` — تطبيع payload قبل إرساله للباكند.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/lib/api/types.ts` — `RegisterRequest` وطلبات الـ scan.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/lib/scans/schema.ts` — validation الخاصة بإنشاء scan.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/lib/scans/mappers.ts` — بناء payload الفعلي للـ scan.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/app/api/v1/_scan-concurrency.ts` — إنفاذ حد التزامن.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/app/api/v1/scans/route.ts` — proxy إنشاء scan.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/app/api/v1/guided-setup/[sessionId]/create-scan/route.ts` — الإنفاذ لمسار guided setup.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/messages/en.json` — نصوص واجهة التسجيل.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/messages/ar.json` — نصوص واجهة التسجيل.
- `c:/Users/ZainTech/Desktop/مشروع التخرج/New-Security-Scan/data.json` — Swagger المرجعي للعقود.

**Decisions**
- الأولوية النهائية للاسم في التسجيل هي: `fullName` أولًا، ثم توليد الاسم من `firstName + lastName`.
- الإنفاذ على scans يتم عند إنشاء scan في route محلي قبل forward إلى الباكند.
- تفسير `max_concurrent_scans = 0` هو unlimited.
- توحيد أسماء الحقول داخل المشروع يبقى camelCase في الـ TypeScript payloads، بينما أي snake_case في Swagger يُعامل كمرجع توثيقي أو صيغة backend داخلية فقط.

**Further Considerations**
1. هل تريد أن يكون التركيز التالي على إنهاء التسجيل أولًا ثم scans، أم العمل عليهما بالتوازي؟
2. هل تريد إضافة مرحلة مستقلة لاحقًا لتنظيف Jira/report contracts إذا اتضح أنها تحتاج توحيدًا مشابهًا؟