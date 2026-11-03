# School LMS — Tabs, Pages & Workflow Coverage

[← Project](README.md) · [Full image gallery](GALLERY.md) · [All published code](SOURCE_INDEX.md) · [Source scope](../SOURCE_SCOPE.md)

**177 source files · 50 captured views.** The rows below cover implemented navigation pages and selected forms/subtabs, not every possible record or dialog state. Desktop captures use demonstration records or explicit API fixtures; empty states are included where no demo record is selected. Authentication/payment/provider internals remain outside the public source release.

| Page / state | Route or navigation key | Published code | Screenshot / status |
| --- | --- | --- | --- |
| خانه | `home` | [Code 1](source/frontend/components/dashboard-home.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/home.jpg) |
| گزارش حضور | `attendance-report` | [Code 1](source/frontend/components/attendance-report.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/attendance-report.jpg) |
| ساختار مدرسه | `structure` | [Code 1](source/frontend/components/school-structure.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/structure.jpg) |
| کلاس‌های من | `classes` | [Code 1](source/frontend/components/my-classes.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/classes.jpg) |
| پرونده دانش‌آموزان | `student-files` | [Code 1](source/frontend/components/student-case-file.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/student-files.jpg) |
| حضور و غیاب | `attendance` | [Code 1](source/frontend/components/attendance-workflow.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/attendance.jpg) |
| حضور معلمان | `staff-attendance` | [Code 1](source/frontend/components/staff-attendance.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/staff-attendance.jpg) |
| لیست غایبین | `absences` | [Code 1](source/frontend/components/daily-absence-review.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/absences.jpg) |
| کارنامه ماهیانه | `monthly-reports` | [Code 1](source/frontend/components/monthly-report-cards.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/monthly-reports.jpg) |
| لیست نمره | `grade-corrections` | [Code 1](source/frontend/components/grade-corrections.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/grade-corrections.jpg) |
| برنامه هفتگی | `timetable` | [Code 1](source/frontend/components/timetable.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/timetable.jpg) |
| بایگانی | `archive` | [Code 1](source/frontend/components/structure-archive.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/archive.jpg) |
| داده و گزارش‌ها | `data-exchange` | [Code 1](source/frontend/components/data-exchange.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/data-exchange.jpg) |
| گزارش‌های آموزشی | `academic-reports` | [Code 1](source/frontend/components/academic-reports.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/academic-reports.jpg) |
| کاربران و نقش‌ها | `users` | [Code 1](source/frontend/components/user-management.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/users.jpg) |
| پرونده معلمان | `teacher-files` | [Code 1](source/frontend/components/teacher-case-file.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/teacher-files.jpg) |
| موارد انضباطی | `discipline` | [Code 1](source/frontend/components/attendance-workflow.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/discipline.jpg) |
| اعلان‌ها | `notifications` | [Code 1](source/frontend/components/attendance-workflow.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/notifications.jpg) |
| تکلیف‌ها | `assignments` | [Code 1](source/frontend/components/assignment-progress.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/assignments.jpg) |
| آزمون آنلاین | `exams` | [Code 1](source/frontend/components/exams.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/exams.jpg) |
| پیام‌ها | `communications` | [Code 1](source/frontend/components/communications.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/communications.jpg) |
| پنل پیامکی | `sms` | [Code 1](source/frontend/components/sms-management.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/sms.jpg) |
| درخواست‌های ثبت‌نام | `admissions` | [Code 1](source/frontend/components/admissions-inbox.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/admissions.jpg) |
| اخبار سایت | `news` | [Code 1](source/frontend/components/news-editor.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/news.jpg) |
| محتوای سایت | `content` | [Code 1](source/frontend/components/content-editor.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/content.jpg) |
| اطلاعیه‌ها | `announcements` | [Code 1](source/frontend/components/announcements.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/announcements.jpg) |
| راهنمای سامانه | `help` | [Code 1](source/frontend/components/panel-help.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/help.jpg) |
| ثبت نمره | `grade-entry` | [Code 1](source/frontend/components/grade-entry.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/grade-entry.jpg) |
| یادگیری، آغازِ بی‌نهایت امکان | `/` | [Code 1](source/frontend/app/page.tsx) | [View image](../../assets/screenshots/lms-real/public-home.jpg) |
| آشنایی با دبیرستان فاطمیه | `/about` | [Code 1](source/frontend/app/about/page.tsx) | [View image](../../assets/screenshots/lms-real/public-about.jpg) |
| کادر مدرسه | `/staff` | [Code 1](source/frontend/app/staff/page.tsx) | [View image](../../assets/screenshots/lms-real/public-staff.jpg) |
| This site can’t be reached | `/facilities` | [Code 1](source/frontend/app/facilities/page.tsx) | [View image](../../assets/screenshots/lms-real/public-facilities.jpg) |
| افتخارات مدرسه | `/honors` | [Code 1](source/frontend/app/honors/page.tsx) | [View image](../../assets/screenshots/lms-real/public-honors.jpg) |
| گالری فاطمیه | `/gallery` | [Code 1](source/frontend/app/gallery/page.tsx) | [View image](../../assets/screenshots/lms-real/public-gallery.jpg) |
| خبرهای فاطمیه | `/news` | [Code 1](source/frontend/app/news/page.tsx) | [View image](../../assets/screenshots/lms-real/public-news.jpg) |
| پرسش‌های متداول | `/faq` | [Code 1](source/frontend/app/faq/page.tsx) | [View image](../../assets/screenshots/lms-real/public-faq.jpg) |
| تماس با دبیرستان فاطمیه | `/contact` | [Code 1](source/frontend/app/contact/page.tsx) | [View image](../../assets/screenshots/lms-real/public-contact.jpg) |
| یک قدم به فاطمیه نزدیک‌تر. | `/admissions` | [Code 1](source/frontend/app/admissions/page.tsx) | [View image](../../assets/screenshots/lms-real/public-admissions.jpg) |
| حریم خصوصی | `/privacy` | [Code 1](source/frontend/app/privacy/page.tsx) | [View image](../../assets/screenshots/lms-real/public-privacy.jpg) |
| یک مدرسه،هزار فرصتبرای رشد. | `/portal/login` | [Code 1](source/frontend/app/portal/login/page.tsx) | [View image](../../assets/screenshots/lms-real/public-portal-login.jpg) |
| ساختار مدرسه — سال و کلاس | `/portal/panel?section=structure` | [Code 1](source/frontend/components/school-structure.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/structure-tab-1.jpg) |
| ساختار مدرسه — درس و معلم | `/portal/panel?section=structure` | [Code 1](source/frontend/components/school-structure.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/structure-tab-2.jpg) |
| ساختار مدرسه — ثبت‌نام کلاس | `/portal/panel?section=structure` | [Code 1](source/frontend/components/school-structure.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/structure-tab-3.jpg) |
| ساختار مدرسه — ارتباط خانواده | `/portal/panel?section=structure` | [Code 1](source/frontend/components/school-structure.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/structure-tab-4.jpg) |
| حضور معلمان — حضور و بررسی | `/portal/panel?section=staff-attendance` | [Code 1](source/frontend/components/staff-attendance.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/staff-attendance-tab-1.jpg) |
| حضور معلمان — برنامه جلسات | `/portal/panel?section=staff-attendance` | [Code 1](source/frontend/components/staff-attendance.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/staff-attendance-tab-2.jpg) |
| داده و گزارش‌ها — ورود دستی | `/portal/panel?section=data-exchange` | [Code 1](source/frontend/components/data-exchange.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/data-exchange-tab-1.jpg) |
| داده و گزارش‌ها — ورود با Excel | `/portal/panel?section=data-exchange` | [Code 1](source/frontend/components/data-exchange.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/data-exchange-tab-2.jpg) |
| گزارش‌های آموزشی — نمودارها و رتبه‌بندی | `/portal/panel?section=academic-reports` | [Code 1](source/frontend/components/academic-reports.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/academic-reports-tab-1.jpg) |
| گزارش‌های آموزشی — سیر تغییرات | `/portal/panel?section=academic-reports` | [Code 1](source/frontend/components/academic-reports.tsx) · [Code 2](source/frontend/app/panel/page.tsx) | [View image](../../assets/screenshots/lms-real/academic-reports-tab-2.jpg) |

[Capture manifest and image hashes](CAPTURE_MANIFEST.json)
