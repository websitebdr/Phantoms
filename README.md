# موقع عيلة فانتومز (سيرفر كيان)

## التشغيل
1. ثبّت Node.js 18 أو أحدث.
2. `npm install`
3. انسخ `.env.example` إلى `.env` واملأه (شرح كل متغير جواه).
4. شغّل: `node --env-file=.env server.js` (أو حط المتغيرات في لوحة الاستضافة).
5. افتح http://localhost:3000

## إعداد ديسكورد
1. https://discord.com/developers/applications > New Application.
2. OAuth2: انسخ Client ID و Client Secret.
3. OAuth2 > Redirects: ضيف نفس قيمة REDIRECT (مثلاً https://دومينك.com/callback).
4. في سيرفر ديسكورد بتاع العيلة اعمل 6 رتب: Boss, Co-Boss, Manager, Admin, Member, Regular.
5. فعّل Developer Mode (Settings > Advanced)، وبكليك يمين انسخ ID السيرفر وIDs الرتب
   وحطهم في GUILD_ID و ROLE_IDS بالترتيب (مفصولين بفاصلة).
6. حط الـ ID بتاعك في OWNER_ID عشان تدخل Boss من أول مرة.

## الصلاحيات
- رتبة العضو بتتحدد من رتبه في ديسكورد عند تسجيل الدخول (وبتتسجل تلقائي في قائمة العيلة).
- لوحة التحكم: Boss, Co-Boss, Manager, Admin.
- تعديل محتوى الموقع: Boss, Co-Boss, Manager.
- تغيير/حذف رتبة عضو: بس لو رتبته أقل من رتبتك (الـ Boss يقدر مع الجميع).
- البيانات محفوظة في data.json (خد منه نسخة احتياطية).

## الاستضافة
ارفع الفولدر على Render أو Railway أو VPS، واضبط NODE_ENV=production وكل متغيرات .env،
وتأكد إن الموقع على HTTPS.
