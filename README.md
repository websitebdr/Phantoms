# 🦅 بوابة عائلة فانتومز (PHANTOMS) - سيرفر كيان رول بلاي (FiveM)

موقع رسمي وبوابة متكاملة لعصابة/عائلة **فانتومز (PHANTOMS)** على سيرفر كيان رول بلاي، يشمل نظام التقديم، رتب ديسكورد، صناع المحتوى، والبثوث المباشرة، وقوانين وتاريخ العائلة.

---

## 🌟 المميزات الرئيسية للموقع:

1. **نظام التقديم في العائلة (Recruitment & Applications)**:
   - نموذج تقديم رول بلاي احترافي (الاسم والشخصية، ساعات FiveM، الخبرات، التخصص، وسيناريوهات FearRP).
   - ربط إلزامي بحساب ديسكورد لمنع التزوير وسحب بيانات المتقدم تلقائياً.
   - تنبيهات فورية لقناة التقديمات في سيرفر الديسكورد عبر **Discord Webhook** بقالب إمبد (Embed) منسق ومميز.
   - شاشة متابعة للمتقدم يرى فيها حالة طلبه: (قيد المراجعة ⏳ / تم القبول 🎉 / مرفوض ❌) مع ملاحظات الإدارة.

2. **ربط الديسكورد والرتب (Discord OAuth2 & Roles)**:
   - تسجيل دخول بضغطة زر عبر Discord OAuth2.
   - جلب وتحديث أفتار المستخدم الحقيقي ورتبته تلقائياً من سيرفر الديسكورد (`GUILD_ID`).
   - تصنيف الصلاحيات التلقائي:
     - **Boss (0)**: تحكم كامل بكل شيء.
     - **Co-Boss (1) & Manager (2)**: تعديل محتوى الموقع وقبول/رفض التقديمات وإدارة الرتب الأدنى.
     - **Admin (3)**: مراجعة التقديمات وإدارة الأعضاء.
     - **Member (4) & Regular (5)**: أعضاء رسميون.
     - **Guest**: متقدم أو زائر.

3. **صناع المحتوى والبثوث المباشرة (Creators & Streams)**:
   - قسم خاص بالستريمرز وصناع محتوى العائلة على (Twitch, YouTube, Kick, TikTok).
   - روابط مباشرة لقنوات البث وبطاقات تفاعلية مميزة.
   - تحكم كامل من لوحة الإدارة لإضافة أو حذف الستريمرز.

4. **معلومات وقوانين وتاريخ العائلة (Gang Lore & Rules)**:
   - قصة وتاريخ تأسيس فانتومز في مدينة كيان.
   - بنود وقوانين العائلة الصارمة (الولاء، الاشتباكات، قواعد الرول بلاي).
   - إحصائيات سريعة للعائلة (عدد الأعضاء، الرتب، السيطرة).

5. **لوحة تحكم إدارية متكاملة (Admin Staff Panel)**:
   - مراجعة طلبات التقديم مع أزرار قبول/رفض وتعيين الرتبة بضغطة زر.
   - إدارة قائمة الأعضاء وتعديل رتبهم أو حذفهم.
   - تعديل نصوص الموقع والقوانين وشعار العائلة وحالة فتح/إغلاق التقديم.
   - ضبط رابط الويب هوك وتجربته مباشرة من لوحة التحكم.

---

## 🚀 طريقة التشغيل والتركيب

### 1. المتطلبات:
- تثبيت [Node.js](https://nodejs.org/) (إصدار 18 أو أحدث).

### 2. تثبيت الحزم:
افتح موجه الأوامر (CMD أو PowerShell) داخل مجلد الموقع واكتب:
```bash
npm install
```

### 3. إعداد ملف البيئة (.env):
قم بإنشاء ملف باسم `.env` بجانب ملف `server.js` (أو انسخ من `.env.example`) وضع البيانات التالية:

```env
# من Discord Developer Portal > OAuth2
CLIENT_ID=your_discord_client_id
CLIENT_SECRET=your_discord_client_secret

# رابط التحويل (Redirect URI) - يجب أن يطابق ما وضعته في ديسكورد تماماً
REDIRECT=http://localhost:3000/callback

# آيدي سيرفر ديسكورد العائلة (انسخه عبر Developer Mode)
GUILD_ID=your_guild_id

# آيديات رتب ديسكورد بالترتيب من الأعلى للأدنى مفصولة بفواصل:
# Boss, Co-Boss, Manager, Admin, Member, Regular
ROLE_IDS=id1,id2,id3,id4,id5,id6

# آيدي حسابك في ديسكورد (يدخلك برتبة Boss فوراً حتى قبل إعداد الرتب)
OWNER_ID=your_discord_user_id

# نص تشفير الجلسات (أي نص عشوائي طويل)
SECRET=change-this-to-any-random-long-secret-key-12345

# رابط سيرفر الديسكورد للعصابة (رابط الدعوة المباشر)
DISCORD_INVITE=https://discord.gg/your-invite

# رابط ويب هوك قناة التقديمات في ديسكورد (Discord Webhook)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# منفذ التشغيل
PORT=3000
```

### 4. تشغيل الموقع محلياً:
```bash
node server.js
```
ثم افتح المتصفح على: `http://localhost:3000`

---

## 🛠️ دليل إعداد ديسكورد (Discord Developer Portal):

1. ادخل إلى: [Discord Developer Portal](https://discord.com/developers/applications).
2. اضغط **New Application** واكتب اسماً مثل `Phantoms Portal`.
3. اذهب إلى قائمة **OAuth2**:
   - انسخ `Client ID` وضعه في `CLIENT_ID`.
   - اضغط `Reset Secret` وانسخ `Client Secret` وضعه في `CLIENT_SECRET`.
   - في قسم **Redirects** اضغط **Add Redirect** وضع:
     `http://localhost:3000/callback` (وعند رفع الموقع أضف رابط دومينك مثل: `https://yourdomain.com/callback`).
4. **جلب الـ IDs من ديسكورد**:
   - في تطبيق الديسكورد، افتح **Settings > Advanced** وفعّل **Developer Mode**.
   - كليك يمين على سيرفر العائلة > **Copy Server ID** وضعه في `GUILD_ID`.
   - كليك يمين على حسابك الشخصي > **Copy User ID** وضعه في `OWNER_ID`.
   - اذهب إلى إعدادات السيرفر > **Roles**، وكليك يمين على كل رتبة > **Copy Role ID** وضعها في `ROLE_IDS` بالترتيب:
     `Boss_ID,CoBoss_ID,Manager_ID,Admin_ID,Member_ID,Regular_ID`.
5. **إنشاء ويب هوك التقديمات (Webhook)**:
   - في سيرفر الديسكورد، افتح إعدادات القناة المخصصة للتقديمات > **Integrations > Webhooks**.
   - اضغط **New Webhook**، وانسخ الرابط وضعه في `DISCORD_WEBHOOK_URL` أو من خلال لوحة التحكم داخل الموقع.

---

## 🌐 النشر والاستضافة (Deployment):

- **على Vercel**: الموقع مهيأ بملف `vercel.json` ومجلد `api/index.js`، ويمكنك ربط قاعدة بيانات سحابية مجانية عبر Upstash Redis (إضافة `UPSTASH_REDIS_REST_URL` و `UPSTASH_REDIS_REST_TOKEN`).
- **على VPS / Render / Railway**: قم برفع الملفات، وتعيين متغيرات البيئة وتشغيل `node server.js`، مع تفعيل `NODE_ENV=production` و HTTPS.

---
© 2026 عائلة فانتومز (PHANTOMS) · سيرفر كيان رول بلاي.
