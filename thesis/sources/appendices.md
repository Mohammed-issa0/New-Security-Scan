# الملاحق

## ملحق ب: دليل تشغيل المشروع

### المتطلبات
- Node.js 18+
- npm

### التشغيل
```bash
npm install
npm run dev
```
يفتح التطبيق على `http://localhost:3000`

### متغيرات البيئة (.env.local)
- `API_BASE_URL` — عنوان Backend (افتراضي: backend.blackbrains.tech)
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` — لاختبارات Playwright

### الاختبار
```bash
npm run test:e2e
```

## ملحق ج: كود نموذجي — مخطط Zod للفحص

```typescript
export const scanFormSchema = z.object({
  name: z.string().min(1),
  targets: z.string().min(1),
  tool: z.enum(['ffuf', 'nmap', 'zap', 'wpscan', 'sqlmap', 'xss', 'ssl']),
  tool_depth: z.enum(['light', 'deep', 'aggressive']).default('light'),
  scopeSigned: z.boolean(),
  target_config: z.object({
    headers: z.array(z.object({ name: z.string(), value: z.string() })),
    authentication: z.object({
      token: z.string().optional(),
      cookies: z.array(z.object({ name: z.string(), value: z.string() })),
    }),
  }),
});
```

## ملحق د: كود نموذجي — BFF Proxy

```typescript
export async function proxyToBackend(options) {
  const backendUrl = new URL(options.backendPath, getBackendBase());
  const backendResponse = await fetch(backendUrl.toString(), {
    method: options.method,
    headers: createBackendHeaders(options.request, !!options.body),
    body: options.body,
    cache: 'no-store',
  });
  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: backendResponse.headers,
  });
}
```

## ملحق هـ: كود نموذجي — تجديد JWT

```typescript
if (response.status === 401 && tokens) {
  const newAccessToken = await refreshTokens();
  headers.set('Authorization', `Bearer ${newAccessToken}`);
  response = await fetch(url, { ...options, headers });
}
```

*ملحق أ (جدول Endpoints الكامل) في ملف appendix-a-endpoints.md يُولَّد آلياً من data.json.*
