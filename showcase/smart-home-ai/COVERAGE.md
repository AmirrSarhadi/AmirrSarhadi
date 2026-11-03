# Smart Home AI — Tabs, Pages & Workflow Coverage

[← Project](README.md) · [Full image gallery](GALLERY.md) · [All published code](SOURCE_INDEX.md) · [Source scope](../SOURCE_SCOPE.md)

**5 source files · 6 captured views.** The rows below cover implemented navigation pages and selected forms/subtabs, not every possible record or dialog state. Desktop captures use demonstration records or explicit API fixtures; empty states are included where no demo record is selected. Authentication/payment/provider internals remain outside the public source release.

The plan is newly drawn and fictional. The proposal view contains an explicitly labelled synthetic response, not output from an AI model. No external AI/provider request was made.

| Page / state | Route or navigation key | Published code | Screenshot / status |
| --- | --- | --- | --- |
| دریافت پلان و بازکردن پروژه | `start` | [Code 1](source/smart-home-ai/web/app.js) · [Code 2](source/smart-home-ai/web/index.html) | [View image](../../assets/screenshots/smart-home-ai/start.jpg) |
| بازبینی پلان و فضاهای نمایشی | `plan-review` | [Code 1](source/smart-home-ai/web/plan-editor.js) · [Code 2](source/smart-home-ai/web/index.html) | [View image](../../assets/screenshots/smart-home-ai/plan-review.jpg) |
| اصلاح نام و محدوده فضا | `space-edit` | [Code 1](source/smart-home-ai/web/plan-editor.js) · [Code 2](source/smart-home-ai/web/index.html) | [View image](../../assets/screenshots/smart-home-ai/space-edit.jpg) |
| تأیید بازبینی پلان | `review-confirmed` | [Code 1](source/smart-home-ai/web/plan-editor.js) · [Code 2](source/smart-home-ai/web/index.html) | [View image](../../assets/screenshots/smart-home-ai/review-confirmed.jpg) |
| فرم نیازهای ساختمان | `requirements` | [Code 1](source/smart-home-ai/web/app.js) · [Code 2](source/smart-home-ai/web/index.html) | [View image](../../assets/screenshots/smart-home-ai/requirements.jpg) |
| نمایش پیشنهاد و سناریوها — پاسخ کاملاً ساختگی | `proposal-demo` | [Code 1](source/smart-home-ai/web/app.js) · [Code 2](source/smart-home-ai/web/index.html) | [View image](../../assets/screenshots/smart-home-ai/proposal-demo.jpg) |

[Capture manifest and image hashes](CAPTURE_MANIFEST.json)
