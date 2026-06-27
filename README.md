# Oxygen — Token Saver

إكستنشن **Cursor / VS Code** لتوفير توكنات الـ AI Agent — بدون التأثير على عمل Agent.

## كيف يعمل؟

Oxygen **سلبي بالكامل**: يقرأ ملفاتك، يستخرج هياكل مضغوطة (skeletons)، ويعرض التوفير — **لا يعدّل `.cursorignore`** ولا يحقن prompts ولا يتدخل في Agent.

```
فتح/تعديل ملف → استخراج skeleton → حفظ في .oxygen/skeletons/
                → تحديث شريط الحالة (O2 Oxygen)
                → فهرسة المشروع (اختياري تلقائي)
```

## الميزات

| الميزة | ماذا تفعل |
|--------|-----------|
| **Skeleton** | يستخرج توقيعات الدوال/classes/imports — توفير 70–95% |
| **Copy Context Bundle** | حزمة جاهزة للصق في Agent chat |
| **Copy File Skeleton** | هيكل الملف النشط للحافظة |
| **Index Workspace** | فهرسة المشروع → `.oxygen/project-map.md` |
| **Minify Selection** | ضغط الكود المحدد (يدوي) |
| **Save Focus Scope** | حفظ نطاق التركيز → `.oxygen/context-scope.json` (معلوماتي) |
| **Session Tracker** | تتبع التوفير بالتوكنات و $ في الشريط |

## التثبيت

```bash
npm run install:cursor
```

1. **أغلق Cursor بالكامل**
2. افتح Cursor → افتح مشروعك
3. افتح ملف كود
4. أسفل **يسار** الشاشة: `O2 Oxygen | -tok | $saved`

## الأوامر (`Ctrl+Shift+P`)

| الأمر | الاستخدام |
|--------|-----------|
| **Copy Context Bundle** | الصق في Agent بدل الملفات الكاملة |
| **Copy File Skeleton** | هيكل الملف النشط |
| **Index Workspace** | إعادة فهرسة المشروع |
| **Minify Selection** | ضغط التحديد → حافظة |
| **Cache Skeleton** | حفظ skeleton للملف النشط |
| **Save Focus Scope** | حفظ نطاق التركيز |
| **Copy Session Summary** | نسخ ملخص الجلسة |
| **Show Log** | فتح سجل Oxygen |

## ملفات يُنشئها Oxygen

```
.oxygen/
  skeletons/           ← هياكل مضغوطة (.skel.txt)
  project-map.md       ← خريطة التوكنات
  token-index.json     ← فهرس JSON
  context-scope.json   ← نطاق التركيز (معلوماتي)
  session-summary.md   ← ملخص الجلسة
  session-summary.json
```

## الإعدادات

| الإعداد | الافتراضي | الوصف |
|---------|-----------|--------|
| `oxygen.ui.showStatusBar` | `true` | شريط الحالة أسفل يسار |
| `oxygen.pricing.preset` | `composer` | نموذج التسعير للعرض |
| `oxygen.skeleton.autoCache` | `true` | حفظ skeletons تلقائياً |
| `oxygen.tokens.autoIndexOnOpen` | `true` | فهرسة عند فتح المشروع |
| `oxygen.scope.autoApply` | `true` | حفظ scope تلقائياً (لا يعدّل Agent) |
| `oxygen.session.autoSummary` | `true` | ملخص الجلسة كل 3 دقائق |

## هيكل المشروع

```
extension.js              ← نقطة الدخول
src/
  core/                   ← tokens, pricing, session
  skeleton/               ← محرك الاستخراج + extractors
  context/                ← bundle, project map, فهرسة
  scope/                  ← نطاق التركيز (metadata فقط)
  session/                ← ملخص الجلسة
  ui/statusBar.js         ← شريط O2 Oxygen
  oxygenCache.js          ← تخزين .oxygen/skeletons/
scripts/install-to-cursor.js
test/unit.smoke.js
```

## التطوير

```bash
npm run test:unit    # اختبارات
npm run lint         # ESLint
# F5 → Run Extension
```

---

**v1.0.1** — Token Saver only. Passive mode.
