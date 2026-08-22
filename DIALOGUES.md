# EDECS e-learning — حوارات ورسائل النظام

**مصدر الحقيقة للترجمة:** [`src/i18n/en.json`](src/i18n/en.json) و [`src/i18n/ar.json`](src/i18n/ar.json)

الاستخدام في الكود:
```js
import { useLanguage } from "../context/LanguageContext";
const { t, lang, setLang } = useLanguage();
t("auth.loginTitle");
t("welcome.title", { userName });
```

- اللغة الافتراضية: **عربي** (`ar`)، محفوظة في `localStorage` تحت `edel_lang`
- مبدّل اللغة: زر `عربي | EN` في Navbar وصفحات Login / Reset Password
- **لا يوجد قلب RTL** — الشكل وأماكن العناصر كما هي
- محتوى Firebase (أسئلة، مهام، أوصاف دورات) يبقى كما أدخله الإدمن

## أقسام المفاتيح

| Namespace | الاستخدام |
|-----------|-----------|
| `common` | مشترك (تحميل، حفظ، إلغاء، …) |
| `session` | مودال الخمول |
| `auth` | تسجيل الدخول واستعادة كلمة المرور |
| `errors` | 404 وأخطاء الجلب |
| `nav` | عناوين الشريط الجانبي |
| `password` | تغيير كلمة المرور |
| `welcome` | الصفحة الرئيسية |
| `tasks` | المهام والإشعارات والأرشيف |
| `exam` | الامتحان |
| `userSubmissions` | تسليماتي |
| `certificate` | الشهادة |
| `courses` | إدارة الدورات والمحتوى |
| `courseDetail` | تفاصيل الدورة |
| `courseManagement` | تعيين الدورات |
| `admin` | لوحة الإدارة |
| `bulkUpload` | رفع المستخدمين بالجملة |
| `sites` / `departments` | المواقع والأقسام |
| `logs` | السجلات |
| `submissionsReport` | تقارير التسليمات |
| `userProgress` | تقدم المستخدمين |
| `email` | نموذج البريد |
| `notifications` | نافذة الإشعارات |

استُبعدت صفحات ميتة: Sign Up / AddQuestionPage / EmailList.
