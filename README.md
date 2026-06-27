# Oxygen-AIAgent

إكستنشن **VS Code** — يعمل على **Cursor** وأي IDE يدعم إضافات VS Code.

## v0.2.0 — Phase 2

### وضع توفير التوكنز
- **Skeleton** لكل اللغات + **Go / Rust / SQL** محسّنة
- **Geo-Fencing** تلقائي من الملف النشط
- **Flop-Stop** تنبيهي
- **عداد $** في الشريط السفلي مع **نموذج تسعير**

### رادار الهلوسة الذكي
يكتشف في الملف النشط:
- مسارات/imports **غير موجودة**
- **أقواس/quotes** غير متوازنة
- **تكرار** أسطر أو دوال
- عبارات **placeholder** شائعة

عند تجاوز الحد → تنبيه + **Agent Compass** أو **تطهير السياق**.

### ملخص الجلسة التلقائي
- يُحدَّث في `.oxygen/session-summary.md` كل ~3 دقائق وعند التعديل
- أمر **Copy Session Summary** ينسخ الملخص للحافظة
- يتضمن: التوفير، الملفات، التنبيهات، prompt جاهز

---

## التسعير (مخصص)

الافتراضي: **`composer`** — Cursor Composer (~**$1.25**/1M input)

```json
"oxygen.pricing.preset": "composer"
```

| Preset | Input / 1M |
|--------|------------|
| `composer` | $1.25 |
| `gpt4o` | $2.50 |
| `gpt4oMini` | $0.15 |
| `claudeSonnet` | $3.00 |
| `claudeHaiku` | $0.80 |
| `geminiFlash` | $0.10 |
| `deepseek` | $0.27 |
| `custom` | `oxygen.pricing.inputPerMillion` |

---

## الأوامر

| الأمر | الوصف |
|--------|--------|
| Copy Skeleton | نسخ هيكل الملف |
| Generate & Cache Skeleton | حفظ في `.oxygen/skeletons/` |
| Apply Geo-Fence | سياج السياق |
| Sync .agent_backbone | مزامنة القواعد |
| Purify Context | تطهير + prompt نظيف |
| **Copy Session Summary** | ملخص الجلسة |
| Open Agent Compass | رادار + حقن مصل |

---

## الإعدادات الجديدة

- `oxygen.pricing.preset` — نموذج التسعير
- `oxygen.hallucination.enabled` — رادار الهلوسة
- `oxygen.hallucination.warningThreshold` — افتراضي 30
- `oxygen.hallucination.criticalThreshold` — افتراضي 55
- `oxygen.session.autoSummary` — ملخص تلقائي
- `oxygen.session.summaryIntervalMinutes` — افتراضي 3

---

## التشغيل

```bash
npm install
npm run test:unit
# F5 → Run Extension
```

---

## Release Notes

### 0.2.0
- Smart hallucination radar
- Auto session summary
- Go / Rust / SQL skeletons
- Multi-model pricing presets

### 0.1.0
- Phase 1 foundation
