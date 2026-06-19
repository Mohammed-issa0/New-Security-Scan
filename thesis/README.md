# أطروحة مشروع التخرج — New-Security-Scan

## الملفات النهائية

| الملف | الوصف |
|-------|--------|
| `اطروحة_مشروع_التخرج.docx` | الأطروحة الكاملة بالعربية (RTL) |
| `عرض_المناقشة.pptx` | عرض PowerPoint للمناقشة (~27 شريحة) |

## قبل التسليم — عدّل بياناتك

افتح [`config.json`](config.json) واستبدل:

- `university`, `faculty`, `department`
- `student_name`, `supervisor_name`
- `dedication`, `acknowledgment`

ثم أعد التوليد:

```powershell
py thesis/generate.py
```

## إعادة التوليد الكامل

```powershell
# 1) استخراج جدول API من data.json
py thesis/extract_endpoints.py

# 2) مخططات PNG
py thesis/generate_diagrams.py

# 3) لقطات شاشة (يتطلب npm run dev)
node thesis/capture_screenshots.mjs

# 4) Word + PowerPoint
py thesis/generate.py
```

## المتطلبات

```powershell
py -m pip install -r thesis/requirements.txt
npx playwright install chromium
```

## هيكل المحتوى

- `sources/` — فصول Markdown (1–9) + مراجع + ملاحق
- `diagrams/` — 10 مخططات معمارية
- `screenshots/` — 12 لقطة شاشة من التطبيق
- `sources/appendix-a-endpoints.md` — جدول 89 endpoint من `data.json`

## الفصول

1. المقدمة والإطار العام
2. الإطار النظري والدراسات السابقة
3. تحليل المتطلبات
4. التصميم والهندسة المعمارية
5. التنفيذ — الواجهة الأمامية
6. التنفيذ — الخلفية (Backend API)
7. الاختبار والتحقق
8. النتائج والمناقشة
9. الخاتمة والتوصيات
+ المراجع والملاحق
