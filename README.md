# Oxygen — Token Saver

إكستنشن **VS Code / Cursor** — موفر توكن احترافي للـ AI Agent.

## ماذا يفعل؟

| الميزة | التوفير |
|--------|---------|
| **Skeleton** لـ 15+ لغة | 70–95% من حجم الملف |
| **Context Bundle** | حزمة جاهزة للصق في Agent |
| **Project Map** | خريطة المشروع بالتوكنات |
| **Token Scope** | يحدّد نطاق التركيز (معلوماتي فقط — لا يعدّل Agent) |
| **Minify Selection** | يضغط الكود المحدد |
| **Session Tracker** | يتابع التوفير بالتوكن و $ |

## التثبيت

```bash
npm run install:cursor
```

أغلق Cursor بالكامل → افتح مشروعك → ابحث عن **`O2 Oxygen`** أسفل يسار الشاشة.

## الأوامر (`Ctrl+Shift+P`)

| الأمر | الاستخدام |
|--------|-----------|
| **Copy Context Bundle** | الصق في Agent بدل الملفات الكاملة |
| **Copy File Skeleton** | هيكل الملف النشط فقط |
| **Index Workspace** | فهرسة كل المشروع → `.oxygen/project-map.md` |
| **Minify Selection** | ضغط التحديد → حافظة |
| **Save Focus Scope** | حفظ نطاق التركيز → `.oxygen/context-scope.json` |
| **Copy Session Summary** | ملخص التوفير |

## الملفات المُنشأة

```
.oxygen/
  skeletons/          ← هياكل مضغوطة
  project-map.md      ← خريطة التوكنات
  token-index.json    ← فهرس JSON
  context-scope.json  ← نطاق السياق
  session-summary.md  ← ملخص الجلسة
```

## الإعدادات

- `oxygen.pricing.preset` — نموذج التسعير (composer, gpt4o, claude…)
- `oxygen.skeleton.autoCache` — تخزين تلقائي عند التعديل
- `oxygen.tokens.autoIndexOnOpen` — فهرسة عند فتح المشروع
- `oxygen.scope.autoApply` — حفظ نطاق التركيز تلقائيًا (لا يعدّل `.cursorignore`)

## التطوير

```bash
npm run test:unit
# F5 → Run Extension
```

---

**v1.0.0** — Token Saver only. Passive mode: never modifies `.cursorignore` or Agent behavior.
