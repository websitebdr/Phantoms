const express = require("express");
const session = require("cookie-session");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  CLIENT_ID = "",
  CLIENT_SECRET = "",
  REDIRECT = "http://localhost:3000/callback",
  GUILD_ID = "",
  OWNER_ID = "",
  SECRET = "phantoms-super-secret-key-2026",
  DISCORD_WEBHOOK_URL = "",
  DISCORD_INVITE = "https://discord.gg/"
} = process.env;

const ROLE_IDS = (process.env.ROLE_IDS || "").split(",").map(s => s.trim());
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data.json");

// الرتب: 0 Boss, 1 Co-Boss, 2 Manager, 3 Admin, 4 Member, 5 Regular
const PANEL_MAX = 3;   // الرتب المصرح لها بدخول لوحة التحكم (0..3)
const SITE_MAX = 2;    // الرتب المصرح لها بتعديل نصوص الموقع والقوانين (0..2)

const DEFAULT = {
  tagline: "عيلة مش زي أي عيلة. ولاء، قوة، وأسلوب ماشي بخطة تحت قيادة VOLT.",
  serverName: "كيان رول بلاي",
  discordInvite: DISCORD_INVITE || "https://discord.gg/",
  about: "فانتومز (PHANTOMS) عائلة رول بلاي عريقة على سيرفر كيان، تأسست بهدف بناء اسم وهيبة تُحترم في كل شبر بالمدينة. نؤمن بأن الذكاء والولاء والترابط الأخوي أهم من مجرد حمل السلاح، ونسعى دائماً لتقديم أفضل سيناريوهات الرول بلاي والسيطرة باحترافية.",
  rules: [
    { title: "الولاء التام والانضباط", desc: "خيانة العائلة أو تسريب أسرار المقرات والمخططات عقوبتها التصفية والطرد النهائي وبلاك ليست." },
    { title: "احترام التسلسل الإداري", desc: "أوامر البوس ونوابه نافذة بدون نقاش، ويجب احترام جميع الإداريين والأعضاء بغض النظر عن الرتبة." },
    { title: "قواعد الاشتباكات والحروب", desc: "ممنوع فتح أي عداوة أو إطلاق رصاص على أي عصابة أو مواطن أو قطاع أمني إلا بإذن صريح من القيادة العليا." },
    { title: "الالتزام التام بقوانين السيرفر (RP)", desc: "ممنوع قطعياً الـ RDM, VDM, FearRP, أو التكلم OOC أثناء السيناريو. الهيبة تُبنى بالرول بلاي النظيف." },
    { title: "المظهر الموحد وحضور الاجتماعات", desc: "الالتزام بلباس العائلة الرسمي وألوان المركبات المعتمدة، والتواجد الإجباري في التجمعات والنداءات الطارئة." }
  ],
  members: [
    { uid: "seed-boss", n: "VOLT", id: OWNER_ID || "", r: 0, avatar: "" }
  ],
  creators: [
    { uid: "cr-1", n: "VOLT Live", platform: "Twitch", url: "https://twitch.tv/", avatar: "" },
    { uid: "cr-2", n: "Phantoms Roleplay", platform: "YouTube", url: "https://youtube.com/", avatar: "" }
  ],
  applications: [],
  settings: {
    webhookUrl: DISCORD_WEBHOOK_URL || "",
    allowApplications: true
  }
};

// التخزين: Upstash Redis على الاستضافات السحابية، أو data.json محلياً
const RURL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = async cmd => {
  const r = await fetch(RURL, { method: "POST", headers: { Authorization: "Bearer " + RTOK }, body: JSON.stringify(cmd) });
  return (await r.json()).result;
};

async function load() {
  let d = null;
  if (RURL && RTOK) {
    const v = await redis(["GET", "phantoms_data"]);
    d = v ? JSON.parse(v) : null;
  } else if (fs.existsSync(DB)) {
    try {
      d = JSON.parse(fs.readFileSync(DB, "utf8"));
    } catch (e) {
      console.error("Failed to parse data.json:", e);
    }
  }
  if (!d) {
    d = JSON.parse(JSON.stringify(DEFAULT));
    await save(d);
  }
  // دمج الحقول الجديدة إذا كانت قديمة
  if (!d.rules) d.rules = DEFAULT.rules;
  if (!d.applications) d.applications = [];
  if (!d.settings) d.settings = DEFAULT.settings;
  if (!d.serverName) d.serverName = DEFAULT.serverName;
  if (!d.discordInvite) d.discordInvite = DEFAULT.discordInvite;
  return d;
}

async function save(d) {
  if (RURL && RTOK) {
    await redis(["SET", "phantoms_data", JSON.stringify(d)]);
  } else {
    fs.writeFileSync(DB, JSON.stringify(d, null, 2), "utf8");
  }
}

// دالة إرسال تنبيه ديسكورد عبر الويب هوك
async function sendDiscordWebhook(webhookUrl, embed) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "نظام فانتومز - التقديمات",
        avatar_url: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/fivem.png",
        embeds: [embed]
      })
    });
  } catch (err) {
    console.error("Discord Webhook Error:", err.message);
  }
}

const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(500).json({ error: "خطأ داخلي في الخادم" });
});

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "50kb" }));
app.use(session({
  name: "phantoms_sess",
  secret: SECRET,
  maxAge: 14 * 864e5,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production"
}));
const publicPath = path.join(__dirname, "public");
const cwdPublicPath = path.join(process.cwd(), "public");

app.use(express.static(publicPath));
app.use(express.static(cwdPublicPath));

// توجيه الصفحة الرئيسية مباشرة إلى index.html
app.get("/", (req, res) => {
  const p1 = path.join(publicPath, "index.html");
  const p2 = path.join(cwdPublicPath, "index.html");
  if (fs.existsSync(p1)) return res.sendFile(p1);
  if (fs.existsSync(p2)) return res.sendFile(p2);
  res.sendFile(path.resolve("public/index.html"));
});

const clip = (s, n) => String(s || "").trim().slice(0, n);
const hasPanel = u => u && u.rank !== null && u.rank <= PANEL_MAX;
const canManage = (u, targetRank) => hasPanel(u) && (u.rank === 0 || targetRank > u.rank);

function publicData(u, data) {
  const full = hasPanel(u);
  return {
    tagline: data.tagline,
    serverName: data.serverName,
    discordInvite: data.discordInvite,
    about: data.about,
    rules: data.rules,
    creators: data.creators,
    settings: {
      allowApplications: data.settings?.allowApplications ?? true,
      webhookConfigured: Boolean(data.settings?.webhookUrl || DISCORD_WEBHOOK_URL)
    },
    members: (data.members || []).map(m => full ? m : { uid: m.uid, n: m.n, r: m.r, avatar: m.avatar })
  };
}

const guard = (req, res, next) =>
  hasPanel(req.session.user) ? next() : res.status(403).json({ error: "غير مصرح لك بدخول هذه اللوحة" });

// ---------- Discord OAuth & Auth ----------
app.get("/login", (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    // وضع المطور / تجريبي إذا لم تكن مفاتيح ديسكورد مضافة بعد
    return res.redirect("/?discord_unconfigured=1");
  }
  req.session.state = crypto.randomBytes(16).toString("hex");
  const authUrl = "https://discord.com/oauth2/authorize?response_type=code" +
    "&scope=" + encodeURIComponent("identify guilds.members.read") +
    "&client_id=" + CLIENT_ID +
    "&redirect_uri=" + encodeURIComponent(REDIRECT) +
    "&state=" + req.session.state;
  res.redirect(authUrl);
});

// مسار تجريبي محلي للمطور (يمكن تفعيله إذا لم تتوفر مفاتيح ديسكورد)
app.post("/login/dev", wrap(async (req, res) => {
  if (process.env.NODE_ENV === "production") return res.status(403).json({ error: "غير متاح في الإنتاج" });
  const roleType = req.body.role || "boss"; // 'boss' or 'guest'
  const data = await load();
  const rank = roleType === "boss" ? 0 : null;
  const name = roleType === "boss" ? (data.members[0]?.n || "VOLT (Boss)") : "متقدم تجريبي (Guest)";
  const id = roleType === "boss" ? (OWNER_ID || "123456789012345678") : "987654321098765432";
  req.session.user = {
    id,
    name,
    avatar: "",
    rank
  };
  res.json({ success: true, user: req.session.user });
}));

app.get("/callback", async (req, res) => {
  try {
    const data = await load();
    if (!req.query.code || req.query.state !== req.session.state) {
      return res.status(400).send("طلب غير صالح أو انتهت صلاحية الجلسة.");
    }
    const tr = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: REDIRECT
      })
    });
    const t = await tr.json();
    if (!t.access_token) {
      console.error("Discord token exchange failed:", t);
      return res.status(400).send("فشل تسجيل الدخول عبر ديسكورد. تأكد من إعدادات الـ Redirect في Discord Developer Portal.");
    }

    const h = { Authorization: "Bearer " + t.access_token };
    const u = await (await fetch("https://discord.com/api/users/@me", { headers: h })).json();

    let roles = [];
    if (GUILD_ID) {
      const mr = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, { headers: h });
      if (mr.ok) {
        const gm = await mr.json();
        roles = gm.roles || [];
      }
    }

    let rank = null;
    ROLE_IDS.forEach((rid, i) => {
      if (rid && roles.includes(rid) && (rank === null || i < rank)) rank = i;
    });
    if (OWNER_ID && u.id === OWNER_ID) rank = 0;

    const name = u.global_name || u.username;
    const avatar = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}`
      : `https://cdn.discordapp.com/embed/avatars/${(BigInt(u.id || "0") >> 22n) % 6n}.png`;

    // تسجيل أو تحديث العضو تلقائياً في قائمة العائلة عند الدخول برتبة
    if (rank !== null) {
      const ex = data.members.find(m => m.id === u.id);
      if (ex) {
        ex.r = rank;
        ex.n = name;
        ex.avatar = avatar;
      } else {
        data.members.push({ uid: crypto.randomUUID(), n: name, id: u.id, r: rank, avatar });
      }
      await save(data);
    }

    req.session.user = { id: u.id, name, avatar, rank };
    res.redirect("/");
  } catch (e) {
    console.error("Discord callback error:", e);
    res.status(500).send("حدث خطأ أثناء معالجة تسجيل الدخول.");
  }
});

app.get("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

app.get("/me", (req, res) => {
  res.json(req.session.user || null);
});

// ---------- Public Site Data ----------
app.get("/api/site", wrap(async (req, res) => {
  const data = await load();
  res.json(publicData(req.session.user, data));
}));

// تعديل محتوى الموقع والقوانين (للرتب العليا فقط: Boss, Co-Boss, Manager)
app.post("/api/site", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user;
  if (u.rank > SITE_MAX) return res.status(403).json({ error: "تعديل المحتوى مخصص للقيادة العليا فقط" });

  if (req.body.tagline !== undefined) data.tagline = clip(req.body.tagline, 250) || DEFAULT.tagline;
  if (req.body.serverName !== undefined) data.serverName = clip(req.body.serverName, 100) || DEFAULT.serverName;
  if (req.body.discordInvite !== undefined) data.discordInvite = clip(req.body.discordInvite, 200) || DEFAULT.discordInvite;
  if (req.body.about !== undefined) data.about = clip(req.body.about, 3000) || DEFAULT.about;

  if (Array.isArray(req.body.rules)) {
    data.rules = req.body.rules.slice(0, 20).map(r => ({
      title: clip(r.title, 80),
      desc: clip(r.desc, 500)
    })).filter(r => r.title);
  }

  // إعدادات الويب هوك وحالة التقديم (Boss / Co-Boss فقط)
  if (u.rank <= 1) {
    if (req.body.webhookUrl !== undefined) data.settings.webhookUrl = clip(req.body.webhookUrl, 300);
    if (req.body.allowApplications !== undefined) data.settings.allowApplications = Boolean(req.body.allowApplications);
  }

  await save(data);
  res.json(publicData(u, data));
}));

// ---------- نظام التقديم في العائلة (Applications) ----------

// تقديم طلب جديد
app.post("/api/apply", wrap(async (req, res) => {
  const data = await load();
  if (data.settings && data.settings.allowApplications === false) {
    return res.status(400).json({ error: "عذراً، باب التقديم في العائلة مغلق حالياً." });
  }

  const u = req.session.user;
  if (!u) {
    return res.status(401).json({ error: "يجب تسجيل الدخول بحساب ديسكورد أولاً لتتمكن من التقديم." });
  }

  // فحص ما إذا كان لديه طلب قيد المراجعة بالفعل
  const existing = (data.applications || []).find(a => a.userId === u.id && a.status === "pending");
  if (existing) {
    return res.status(400).json({ error: "لديك طلب تقديم معلق قيد المراجعة بالفعل. يرجى انتظار قرار الإدارة." });
  }

  const realName = clip(req.body.realName, 50);
  const realAge = parseInt(req.body.realAge, 10);
  const charName = clip(req.body.charName, 60);
  const charAge = parseInt(req.body.charAge, 10);
  const hours = clip(req.body.hours, 30);
  const roleplayExp = clip(req.body.roleplayExp, 1000);
  const specialty = clip(req.body.specialty, 60);
  const scenarioFearRP = clip(req.body.scenarioFearRP, 1000);
  const reason = clip(req.body.reason, 1000);
  const extra = clip(req.body.extra, 300);

  if (!realName || !realAge || !charName || !charAge || !hours || !roleplayExp || !specialty || !scenarioFearRP || !reason) {
    return res.status(400).json({ error: "يرجى تعبئة جميع الحقول الإلزامية في نموذج التقديم." });
  }

  const appItem = {
    id: crypto.randomUUID(),
    userId: u.id,
    discordTag: u.name,
    avatar: u.avatar,
    realName,
    realAge,
    charName,
    charAge,
    hours,
    roleplayExp,
    specialty,
    scenarioFearRP,
    reason,
    extra,
    status: "pending", // pending, accepted, rejected
    decisionNote: "",
    decisionBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.applications.unshift(appItem);
  await save(data);

  // إرسال تنبيه في ديسكورد عبر الويب هوك
  const hookUrl = data.settings?.webhookUrl || DISCORD_WEBHOOK_URL;
  if (hookUrl) {
    const embed = {
      title: "📋 تقديم جديد للانضمام لعائلة فانتومز (PHANTOMS)",
      color: 0xc8893b,
      thumbnail: { url: u.avatar || undefined },
      fields: [
        { name: "👤 المتقدم (ديسكورد)", value: `<@${u.id}> (${u.name})`, inline: true },
        { name: "🆔 Discord ID", value: `\`${u.id}\``, inline: true },
        { name: "🎯 التخصص المفضل", value: specialty, inline: true },
        { name: "🧑 الاسم والعمر الواقعي", value: `${realName} (${realAge} سنة)`, inline: true },
        { name: "🎭 الشخصية في الرول بلاي", value: `${charName} (${charAge} سنة)`, inline: true },
        { name: "⏱️ ساعات FiveM", value: `${hours} ساعة`, inline: true },
        { name: "📜 الخبرات السابقة", value: roleplayExp },
        { name: "⚔️ سيناريو الحصار والـ FearRP", value: scenarioFearRP },
        { name: "💡 سبب اختيار فانتومز", value: reason },
        { name: "🔗 كليبات أو ملاحظات", value: extra || "لا يوجد" }
      ],
      footer: { text: "بوابة فانتومز FiveM • راجع الطلب من لوحة التحكم" },
      timestamp: new Date().toISOString()
    };
    sendDiscordWebhook(hookUrl, embed);
  }

  res.json({ success: true, message: "تم إرسال طلب التقديم بنجاح!", application: appItem });
}));

// الاستعلام عن طلب التقديم الخاص بالمستخدم الحالي
app.get("/api/my-application", wrap(async (req, res) => {
  const u = req.session.user;
  if (!u) return res.json({ application: null });
  const data = await load();
  const myApp = (data.applications || []).find(a => a.userId === u.id);
  res.json({ application: myApp || null });
}));

// جلب كل التقديمات للإدارة
app.get("/api/applications", guard, wrap(async (req, res) => {
  const data = await load();
  res.json({ applications: data.applications || [] });
}));

// تحديث حالة تقديم (قبول أو رفض)
app.patch("/api/applications/:id", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user;
  const appItem = (data.applications || []).find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: "طلب التقديم غير موجود" });

  const status = req.body.status;
  if (!["accepted", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "حالة غير صالحة" });
  }

  appItem.status = status;
  appItem.decisionNote = clip(req.body.note, 300);
  appItem.decisionBy = u.name;
  appItem.updatedAt = new Date().toISOString();

  // إذا تم القبول، وكان محدد رتبة لإضافته في قائمة الأعضاء
  if (status === "accepted" && req.body.assignRank !== undefined) {
    const targetRank = parseInt(req.body.assignRank, 10);
    if (Number.isInteger(targetRank) && targetRank >= 0 && targetRank <= 5 && canManage(u, targetRank)) {
      const ex = data.members.find(m => m.id === appItem.userId);
      if (ex) {
        ex.r = targetRank;
        ex.n = appItem.charName || appItem.discordTag;
      } else {
        data.members.push({
          uid: crypto.randomUUID(),
          n: appItem.charName ? `${appItem.charName} (${appItem.discordTag})` : appItem.discordTag,
          id: appItem.userId,
          r: targetRank,
          avatar: appItem.avatar
        });
      }
    }
  }

  await save(data);

  // إرسال تحديث للديسكورد عبر الويب هوك
  const hookUrl = data.settings?.webhookUrl || DISCORD_WEBHOOK_URL;
  if (hookUrl) {
    const isAcc = status === "accepted";
    const embed = {
      title: isAcc ? "✅ تم قبول طلب تقديم في العائلة!" : (status === "rejected" ? "❌ تم رفض طلب تقديم" : "🔄 إعادة فتح طلب تقديم"),
      color: isAcc ? 0x2ecc71 : 0xe74c3c,
      fields: [
        { name: "👤 المتقدم", value: `<@${appItem.userId}> (${appItem.discordTag})`, inline: true },
        { name: "🛡️ بواسطة الإداري", value: u.name, inline: true },
        { name: "📝 ملاحظة القرار", value: appItem.decisionNote || (isAcc ? "مرحباً بك في فانتومز! توجه لروم المقابلات." : "لم يتم اجتياز متطلبات القبول حالياً.") }
      ],
      footer: { text: "نظام إدارة فانتومز" },
      timestamp: new Date().toISOString()
    };
    sendDiscordWebhook(hookUrl, embed);
  }

  res.json({ success: true, application: appItem, members: data.members });
}));

// حذف تقديم
app.delete("/api/applications/:id", guard, wrap(async (req, res) => {
  const data = await load();
  data.applications = (data.applications || []).filter(a => a.id !== req.params.id);
  await save(data);
  res.json({ success: true });
}));

// ---------- إدارة الأعضاء والرتب (Members) ----------
app.post("/api/members", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user;
  const r = Number(req.body.r);
  const n = clip(req.body.n, 50);
  const id = clip(req.body.id, 30);
  const avatar = clip(req.body.avatar, 300);

  if (!n || !Number.isInteger(r) || r < 0 || r > 5) return res.status(400).json({ error: "البيانات غير مكتملة" });
  if (!canManage(u, r)) return res.status(403).json({ error: "لا يمكنك تعيين رتبة مساوية أو أعلى من رتبتك" });

  data.members.push({ uid: crypto.randomUUID(), n, id, r, avatar });
  await save(data);
  res.json(publicData(u, data));
}));

app.patch("/api/members/:uid", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user;
  const m = data.members.find(x => x.uid === req.params.uid);
  const r = Number(req.body.r);

  if (!m || !Number.isInteger(r) || r < 0 || r > 5) return res.status(400).json({ error: "بيانات العضو غير صحيحة" });
  if (!canManage(u, m.r) || !canManage(u, r)) return res.status(403).json({ error: "غير مصرح لك بتعديل هذا العضو" });

  m.r = r;
  if (req.body.n) m.n = clip(req.body.n, 50);
  await save(data);
  res.json(publicData(u, data));
}));

app.delete("/api/members/:uid", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user;
  const m = data.members.find(x => x.uid === req.params.uid);
  if (!m) return res.status(404).json({ error: "العضو غير موجود" });
  if (!canManage(u, m.r)) return res.status(403).json({ error: "غير مصرح لك بحذف هذا العضو" });

  data.members = data.members.filter(x => x !== m);
  await save(data);
  res.json(publicData(u, data));
}));

// ---------- إدارة صناع المحتوى والبثوث (Creators & Streams) ----------
app.post("/api/creators", guard, wrap(async (req, res) => {
  const data = await load();
  const n = clip(req.body.n, 50);
  const platform = clip(req.body.platform, 30) || "Twitch";
  const url = clip(req.body.url, 250);
  const avatar = clip(req.body.avatar, 300);

  if (!n) return res.status(400).json({ error: "اسم صانع المحتوى مطلوب" });

  data.creators.push({
    uid: crypto.randomUUID(),
    n,
    platform,
    url: url || "#",
    avatar
  });

  await save(data);
  res.json(publicData(req.session.user, data));
}));

app.patch("/api/creators/:uid", guard, wrap(async (req, res) => {
  const data = await load();
  const c = data.creators.find(x => x.uid === req.params.uid);
  if (!c) return res.status(404).json({ error: "صانع المحتوى غير موجود" });

  if (req.body.n) c.n = clip(req.body.n, 50);
  if (req.body.platform) c.platform = clip(req.body.platform, 30);
  if (req.body.url) c.url = clip(req.body.url, 250);
  if (req.body.avatar !== undefined) c.avatar = clip(req.body.avatar, 300);

  await save(data);
  res.json(publicData(req.session.user, data));
}));

app.delete("/api/creators/:uid", guard, wrap(async (req, res) => {
  const data = await load();
  data.creators = data.creators.filter(c => c.uid !== req.params.uid);
  await save(data);
  res.json(publicData(req.session.user, data));
}));

module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`  🦅 Phantoms Gang Portal is Running!`);
    console.log(`  🌐 Website: http://localhost:${PORT}`);
    console.log(`  💬 Discord OAuth: ${CLIENT_ID ? "Configured" : "Not configured yet (Dev mode ready)"}`);
    console.log(`==============================================\n`);
  });
}
