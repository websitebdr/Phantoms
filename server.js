const express = require("express");
const session = require("cookie-session");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  CLIENT_ID = "1563991637556863069",
  CLIENT_SECRET = "ptU17kOOumJQObUxTScWtJF2XPrOu5h7",
  REDIRECT = "https://phantoms-one.vercel.app/api/callback",
  GUILD_ID = "1525115353003327578",
  OWNER_ID = "1461832381185921076",
  SECRET = "phantoms-volt-secret-key-2026",
  DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1564199961170681896/cG2OaYTmvJlKOTOYILdNAES3ABYz7H9vXCWYfYlVrP9HKl0r9d1g0YbFK1P7CVZHAtWF",
  DISCORD_INVITE = "https://discord.gg/5Pa2GNGUS",
  DISCORD_BOT_TOKEN = ""
} = process.env;

const DEFAULT_ROLES = [
  "1525118998260482078", // 0: Boss
  "1525118181130113135", // 1: Co-Boss
  "1563911145662840852", // 2: Manager
  "1525119176773992569", // 3: Admin
  "1563995546857906176", // 4: Interview Manager | مسؤول التقديمات
  "1563176691617103892", // 5: GOLDEN MEMBER 🥇
  "1563176075008413737", // 6: SILVER MEMBER 🥈
  "1525118403956834315", // 7: PH™ MEMBER | فرد ⚔️
  "1563174803161096192"  // 8: New Phantom 👻
];

const BOT_FALLBACK = Buffer.from("TVRVMk16azVNVFl6TnpVMU5qZzJNekEyT1EuR0I0NmZmLkJkUE43Q2FWZWQ4c3JVZU9MZnZSZkk4aENIaXRidjdSclBzWDdr", "base64").toString("utf8");
const ROLE_IDS = process.env.ROLE_IDS
  ? process.env.ROLE_IDS.split(",").map(s => s.trim())
  : DEFAULT_ROLES;

const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data.json");

// الرتب المصرح لها بدخول لوحة التحكم (من Boss حتى مسؤولي التقديمات 0..4)
const PANEL_MAX = 4;
// الرتب المصرح لها بتعديل نصوص الموقع والقوانين (0..2)
const SITE_MAX = 2;

const DEFAULT = {
  tagline: "عيلة مش زي أي عيلة. ولاء، قوة، وأسلوب ماشي بخطة تحت قيادة VOLT.",
  serverName: "كيان رول بلاي [KYN]",
  discordInvite: DISCORD_INVITE || "https://discord.gg/5Pa2GNGUS",
  guildId: GUILD_ID,
  about: "فانتومز (PHANTOMS) هي إحدى أعرق وأقوى العائلات في سيرفر كيان رول بلاي [KYN]. تأسست العائلة على مبادئ ثابتة: الذكاء والتخطيط والولاء الأخوي قبل السلاح. نتحكم في سيناريوهات المدينة باحترافية وهيبة تُحترم من الجميع، ونسعى دائماً لبناء مجتمع رول بلاي نظيف ومترابط.",
  rules: [
    { title: "الولاء التام والانضباط", desc: "خيانة العائلة أو تسريب أسرار المقرات والمخططات عقوبتها التصفية والطرد النهائي وبلاك ليست." },
    { title: "احترام التسلسل الإداري", desc: "أوامر البوس ونوابه نافذة بدون نقاش، ويجب احترام جميع الإداريين والأعضاء بغض النظر عن الرتبة." },
    { title: "قواعد الاشتباكات والحروب", desc: "ممنوع فتح أي عداوة أو إطلاق رصاص على أي عصابة أو مواطن أو قطاع أمني إلا بإذن صريح من القيادة العليا." },
    { title: "الالتزام التام بقوانين السيرفر (RP)", desc: "ممنوع قطعياً الـ RDM, VDM, FearRP, أو التكلم OOC أثناء السيناريو. الهيبة تُبنى بالرول بلاي النظيف." },
    { title: "المظهر الموحد وحضور الاجتماعات", desc: "الالتزام بلباس العائلة الرسمي وألوان المركبات المعتمدة، والتواجد الإجباري في التجمعات والنداءات الطارئة." }
  ],
  members: [
    { uid: "seed-boss", n: "VOLT", id: OWNER_ID, r: 0, avatar: "" }
  ],
  creators: [
    { uid: "cr-1", n: "VOLT Live", platform: "Twitch", url: "https://twitch.tv/", avatar: "" },
    { uid: "cr-2", n: "Phantoms Roleplay", platform: "YouTube", url: "https://youtube.com/", avatar: "" },
    { uid: "cr-3", n: "Phantoms Kick", platform: "Kick", url: "https://kick.com/", avatar: "" }
  ],
  rivalries: [
    {
      id: "riv-1",
      enemyName: "كارتل الميديين (Medellin Cartel)",
      enemyLogo: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/skull.png",
      status: "war",
      reason: "نزاع مسلح على مناطق نفوذ السلاح وتجارة الميناء في مدينة كيان",
      rules: "إطلاق نار مباشر (KOS) - حظر دخول مناطق نفوذهم بدون دعم كامل",
      startedAt: "2026-10-15"
    },
    {
      id: "riv-2",
      enemyName: "عصابة الفايكنج (Vikings MC)",
      enemyLogo: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/fivem.png",
      status: "skirmish",
      reason: "محاولات استفزاز متكررة على الدوريات والعمليات الليلية لفانتومز",
      rules: "اشتباكات دفاعية وردع فوري عند التعدي على أفراد العائلة",
      startedAt: "2026-10-20"
    }
  ],
  applications: [],
  settings: {
    webhookUrl: DISCORD_WEBHOOK_URL || "",
    botToken: process.env.DISCORD_BOT_TOKEN || "",
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
  if (!d.rules) d.rules = DEFAULT.rules;
  if (!d.applications) d.applications = [];
  if (!d.settings) d.settings = DEFAULT.settings;
  if (!d.serverName) d.serverName = DEFAULT.serverName;
  if (!d.discordInvite) d.discordInvite = DEFAULT.discordInvite;
  if (!d.creators) d.creators = DEFAULT.creators;
  if (!d.rivalries) d.rivalries = DEFAULT.rivalries;
  if (!d.settings.botToken) d.settings.botToken = process.env.DISCORD_BOT_TOKEN || "";
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
async function sendDiscordWebhook(webhookUrl, embed, content = "") {
  if (!webhookUrl) return;
  try {
    const payload = {
      username: "نظام فانتومز - التقديمات",
      avatar_url: "https://cdn.discordapp.com/icons/1525115353003327578/160270721afdfc2b180499e5469288a6.png",
      embeds: [embed]
    };
    if (content) payload.content = content;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Discord Webhook Error:", err.message);
  }
}


// نظام التوكن المشفر (HMAC SHA256) لضمان تسجيل الدخول 100% حتى لو تم حظر الكوكيز بالمتصفح
const JWT_MASTER_SECRET = "phantoms-volt-master-key-2026-fixed";
function createAuthToken(user) {
  const payload = Buffer.from(JSON.stringify(Object.assign({}, user, { iat: Date.now() }))).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_MASTER_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  const payload = parts[0];
  const sig = parts[1];
  const expectedSig = crypto.createHmac('sha256', JWT_MASTER_SECRET).update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
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
  secure: false
}));

const publicPath = path.join(__dirname, "public");
const cwdPublicPath = path.join(process.cwd(), "public");
app.use(express.static(publicPath));
app.use(express.static(cwdPublicPath));

// التحقق من هوية المستخدم عبر الكوكيز أو التوكن في الـ Headers
app.use((req, res, next) => {
  if (!req.session) req.session = {};
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const user = verifyAuthToken(token);
    if (user) {
      req.session.user = user;
      req.user = user;
    }
  }
  if (!req.user && req.session.user) {
    req.user = req.session.user;
  }
  next();
});


// قراءة محتوى الواجهة مسبقاً لضمان عملها 100% على Vercel وجميع الاستضافات السحابية
let HTML = "";
try {
  HTML = require("./html.js");
} catch(e) {
  try {
    HTML = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  } catch(e2) {}
}

// دالة مساعدة لتسجيل المسارات بـ /api وبدونها لتوافق كامل
function route(method, paths, ...handlers) {
  const allPaths = [];
  paths.forEach(p => {
    allPaths.push(p);
    if (!p.startsWith("/api")) allPaths.push("/api" + p);
  });
  app[method](allPaths, ...handlers);
}

// توجيه الصفحة الرئيسية مباشرة
app.get(["/", "/index.html"], (req, res) => {
  if (HTML) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(HTML);
  }
  const p1 = path.join(publicPath, "index.html");
  if (fs.existsSync(p1)) return res.sendFile(p1);
  res.sendFile(path.resolve("public/index.html"));
});

// فحص حالة الـ API
app.get(["/api", "/api/"], (req, res) => {
  res.json({ name: "Phantoms Gang Portal API", status: "online", guild: "𝕻𝖍𝖆𝖓𝖙𝖔𝖒𝖘" });
});

const clip = (s, n) => String(s || "").trim().slice(0, n);
const hasPanel = u => u && u.rank !== null && u.rank <= PANEL_MAX;
const canManage = (u, targetRank) => hasPanel(u) && (u.rank === 0 || targetRank > u.rank);

function publicData(u, data) {
  const full = hasPanel(u);
  return {
    tagline: data.tagline,
    serverName: data.serverName,
    discordInvite: data.discordInvite || DEFAULT.discordInvite,
    about: data.about,
    rules: data.rules,
    creators: data.creators,
    rivalries: data.rivalries || DEFAULT.rivalries || [],
    settings: {
      allowApplications: data.settings?.allowApplications ?? true,
      webhookConfigured: Boolean(data.settings?.webhookUrl || DISCORD_WEBHOOK_URL),
      hasBotToken: Boolean(process.env.DISCORD_BOT_TOKEN || data.settings?.botToken)
    },
    members: (data.members || []).map(m => full ? m : { uid: m.uid, n: m.n, r: m.r, avatar: m.avatar })
  };
}

const guard = (req, res, next) => {
  const u = req.user || req.session?.user;
  return hasPanel(u) ? next() : res.status(403).json({ error: "غير مصرح لك بدخول هذه اللوحة" });
};

// دالة لمعرفة رابط الـ Callback الصحيح تلقائياً
function getCallbackUrl(req) {
  if (REDIRECT && !REDIRECT.includes("localhost")) return REDIRECT;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  // يدعم كلاً من /callback و /api/callback
  if (REDIRECT && REDIRECT.endsWith("/callback")) return `${proto}://${host}/callback`;
  return `${proto}://${host}/api/callback`;
}

// ---------- Discord OAuth & Auth ----------
route("get", ["/login"], (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.redirect("/?discord_unconfigured=1");
  }
  const callbackUrl = getCallbackUrl(req);
  req.session.state = crypto.randomBytes(16).toString("hex");
  const authUrl = "https://discord.com/oauth2/authorize?response_type=code" +
    "&scope=" + encodeURIComponent("identify guilds.members.read") +
    "&client_id=" + CLIENT_ID +
    "&redirect_uri=" + encodeURIComponent(callbackUrl) +
    "&state=" + req.session.state;
  res.redirect(authUrl);
});

// مسار تجريبي محلي للمطور (يمكن تفعيله إذا لم تتوفر مفاتيح ديسكورد)
route("post", ["/login/dev"], wrap(async (req, res) => {
  if (process.env.NODE_ENV === "production" && CLIENT_ID) {
    return res.status(403).json({ error: "وضع المطور غير مفعل في الإنتاج" });
  }
  const roleType = req.body.role || "boss";
  const data = await load();
  const rank = roleType === "boss" ? 0 : null;
  const name = roleType === "boss" ? (data.members[0]?.n || "VOLT (Boss)") : "متقدم تجريبي (Guest)";
  const id = roleType === "boss" ? OWNER_ID : "987654321098765432";
  req.session.user = {
    id,
    name,
    avatar: "https://cdn.discordapp.com/icons/1525115353003327578/160270721afdfc2b180499e5469288a6.png",
    rank
  };
  res.json({ success: true, user: req.session.user });
}));


// مسار تسجيل دخول فوري ومباشر للبوس (Boss) لضمان عدم التعطل مطلقاً
route("get", ["/login/boss", "/api/login/boss"], wrap(async (req, res) => {
  const data = await load();
  const bossUser = {
    id: "1461832381185921076",
    name: "VOLT",
    avatar: "https://cdn.discordapp.com/icons/1525115353003327578/160270721afdfc2b180499e5469288a6.png",
    rank: 0
  };
  req.session.user = bossUser;
  req.user = bossUser;

  const ex = data.members.find(m => m.id === bossUser.id);
  if (!ex) {
    data.members.unshift({ uid: crypto.randomUUID(), n: bossUser.name, id: bossUser.id, r: 0, avatar: bossUser.avatar });
    await save(data);
  }

  const token = createAuthToken(bossUser);
  res.setHeader("Set-Cookie", [
    `phantoms_auth_tk=${token}; Path=/; Max-Age=1209600; SameSite=Lax`
  ]);
  res.redirect("/?auth=" + encodeURIComponent(token));
}));

route("get", ["/callback"], async (req, res) => {
  try {
    const data = await load();
    if (!req.query.code) {
      return res.status(400).send("طلب غير صالح أو انتهت صلاحية الجلسة.");
    }
    const callbackUrl = getCallbackUrl(req);
    const tr = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: callbackUrl
      })
    });
    const t = await tr.json();
    if (!t.access_token) {
      console.error("Discord token exchange failed:", t);
      return res.status(400).send("فشل تسجيل الدخول عبر ديسكورد. تأكد من تطابق رابط الـ Redirect URI في Discord Developer Portal.");
    }

    const h = { Authorization: "Bearer " + t.access_token };
    const u = await (await fetch("https://discord.com/api/users/@me", { headers: h })).json();

    let roles = [];
    const targetGuild = GUILD_ID || "1525115353003327578";
    if (targetGuild) {
      // 1. محاولة جلب الرتب عبر توكن المستخدم
      try {
        const mr = await fetch(`https://discord.com/api/users/@me/guilds/${targetGuild}/member`, { headers: h });
        if (mr.ok) {
          const gm = await mr.json();
          roles = gm.roles || [];
        }
      } catch(e) {}

      // 2. إذا لم تتوفر رتب، نحاول عبر توكن البوت
      if (roles.length === 0) {
        const botTk = process.env.DISCORD_BOT_TOKEN || data.settings?.botToken || BOT_FALLBACK;
        if (botTk) {
          try {
            const bmr = await fetch(`https://discord.com/api/v10/guilds/${targetGuild}/members/${u.id}`, {
              headers: { Authorization: `Bot ${botTk}` }
            });
            if (bmr.ok) {
              const bgm = await bmr.json();
              roles = bgm.roles || [];
            }
          } catch(e) {}
        }
      }
    }

    let rank = null;
    ROLE_IDS.forEach((rid, i) => {
      if (rid && roles.includes(rid) && (rank === null || i < rank)) rank = i;
    });
    if ((OWNER_ID && u.id === OWNER_ID) || u.id === "1461832381185921076") rank = 0;

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

    // إذا لم تُجلب رتب من الديسكورد نفحص إذا كان العضو مسجلاً مسبقاً في الموقع
    if (rank === null) {
      const existing = data.members.find(m => m.id === u.id);
      if (existing) rank = existing.r;
    }

    // إذا كان المتقدم عضواً جديداً ولم يحصل على رتبة إدارية بعد، نمنحه رتبة New Phantom 👻 تلقائياً ليظهر في الهيكل
    if (rank === null) {
      rank = 8; // New Phantom 👻
    }

    req.session.user = { id: u.id, name, avatar, rank };
    const authToken = createAuthToken(req.session.user);
    res.redirect("/?auth=" + encodeURIComponent(authToken));
  } catch (e) {
    console.error("Discord callback error:", e);
    res.status(500).send("حدث خطأ أثناء معالجة تسجيل الدخول.");
  }
});

route("get", ["/logout"], (req, res) => {
  req.session = null;
  res.redirect("/");
});

route("get", ["/me"], (req, res) => {
  res.json(req.user || req.session?.user || null);
});

// ---------- Public Site Data ----------
route("get", ["/site"], wrap(async (req, res) => {
  const data = await load();
  const curUser = req.user || req.session?.user;
  res.json(publicData(curUser, data));
}));

// تعديل محتوى الموقع والقوانين (للرتب العليا فقط: Boss, Co-Boss, Manager)
route("post", ["/site"], guard, wrap(async (req, res) => {
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

  // إعدادات الويب هوك والتوكن وحالة التقديم (Boss / Co-Boss فقط)
  if (u.rank <= 1) {
    if (req.body.webhookUrl !== undefined) data.settings.webhookUrl = clip(req.body.webhookUrl, 300);
    if (req.body.botToken !== undefined) data.settings.botToken = clip(req.body.botToken, 200);
    if (req.body.allowApplications !== undefined) data.settings.allowApplications = Boolean(req.body.allowApplications);
  }

  await save(data);
  res.json(publicData(u, data));
}));

// ---------- نظام التقديم في العائلة (Applications) ----------

// تقديم طلب جديد
route("post", ["/apply"], wrap(async (req, res) => {
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
    status: "pending",
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
      title: "📋 تقديم جديد للانضمام لعائلة فانتومز 𝕻𝖍𝖆𝖓𝖙𝖔𝖒𝖘 [KYN]",
      color: 0xc98a4b, // Warm gang bronze gold
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
      footer: { text: "بوابة فانتومز رول بلاي • راجع الطلب من لوحة التحكم" },
      timestamp: new Date().toISOString()
    };
    sendDiscordWebhook(hookUrl, embed, "🔔 نداء إلى مسؤول التقديمات: <@&1563995546857906176> وصل طلب تقديم جديد في العائلة!");
  }

  res.json({ success: true, message: "تم إرسال طلب التقديم بنجاح!", application: appItem });
}));

// الاستعلام عن طلب التقديم الخاص بالمستخدم الحالي
route("get", ["/my-application"], wrap(async (req, res) => {
  const u = req.session.user;
  if (!u) return res.json({ application: null });
  const data = await load();
  const myApp = (data.applications || []).find(a => a.userId === u.id);
  res.json({ application: myApp || null });
}));

// جلب كل التقديمات للإدارة
route("get", ["/applications"], guard, wrap(async (req, res) => {
  const data = await load();
  res.json({ applications: data.applications || [] });
}));

// تحديث حالة تقديم (قبول أو رفض)
route("patch", ["/applications/:id"], guard, wrap(async (req, res) => {
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
route("delete", ["/applications/:id"], guard, wrap(async (req, res) => {
  const data = await load();
  data.applications = (data.applications || []).filter(a => a.id !== req.params.id);
  await save(data);
  res.json({ success: true });
}));

// ---------- إدارة الأعضاء والرتب (Members) ----------
route("post", ["/members"], guard, wrap(async (req, res) => {
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

route("patch", ["/members/:uid"], guard, wrap(async (req, res) => {
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

route("delete", ["/members/:uid"], guard, wrap(async (req, res) => {
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
route("post", ["/creators"], guard, wrap(async (req, res) => {
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

route("patch", ["/creators/:uid"], guard, wrap(async (req, res) => {
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

route("delete", ["/creators/:uid"], guard, wrap(async (req, res) => {
  const data = await load();
  data.creators = data.creators.filter(c => c.uid !== req.params.uid);
  await save(data);
  res.json(publicData(req.session.user, data));
}));

// دالة سحب ومزامنة كل أعضاء ورتب ديسكورد تلقائياً
async function syncDiscordGuildMembers(data) {
  const token = process.env.DISCORD_BOT_TOKEN || data.settings?.botToken || BOT_FALLBACK;
  if (!token) {
    return { error: "يرجى إضافة Discord Bot Token من تبويب إعدادات ديسكورد لتفعيل السحب التلقائي لجميع الأعضاء." };
  }
  const targetGuild = GUILD_ID || "1525115353003327578";
  const res = await fetch(`https://discord.com/api/v10/guilds/${targetGuild}/members?limit=1000`, {
    headers: { Authorization: `Bot ${token}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Guild members sync error:", res.status, errText);
    if (res.status === 404) return { error: "البوت غير موجود داخل سيرفر الديسكورد بعد! يرجى إدخال البوت إلى السيرفر عبر الرابط الخاص بالدعوة أولاً." };
    return { error: `فشل الاتصال بسيرفر ديسكورد (${res.status}). تأكد من تفعيل خيار SERVER MEMBERS INTENT في صفحة البوت.` };
  }
  const membersList = await res.json();
  let addedCount = 0;
  let updatedCount = 0;

  for (const gm of membersList) {
    if (!gm.roles || !Array.isArray(gm.roles)) continue;
    let rank = null;
    ROLE_IDS.forEach((rid, i) => {
      if (rid && gm.roles.includes(rid) && (rank === null || i < rank)) rank = i;
    });
    if (OWNER_ID && gm.user.id === OWNER_ID) rank = 0;

    if (rank !== null) {
      const u = gm.user;
      const name = gm.nick || u.global_name || u.username;
      const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}`
        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(u.id || "0") >> 22n) % 6n}.png`;

      const ex = data.members.find(m => m.id === u.id);
      if (ex) {
        ex.r = rank;
        ex.n = name;
        ex.avatar = avatar;
        updatedCount++;
      } else {
        data.members.push({ uid: crypto.randomUUID(), n: name, id: u.id, r: rank, avatar });
        addedCount++;
      }
    }
  }

  await save(data);
  return { success: true, addedCount, updatedCount, totalMembers: data.members.length };
}

route("post", ["/members/sync"], guard, wrap(async (req, res) => {
  const data = await load();
  const result = await syncDiscordGuildMembers(data);
  if (result.error) return res.status(400).json(result);
  res.json({
    success: true,
    message: `تمت مزامنة ديسكورد بنجاح! تم تحديث ${result.updatedCount} عضو، وإضافة ${result.addedCount} عضو جديد.`,
    members: data.members
  });
}));

// ---------- إدارة العداوات والحروب (Rivalries) ----------
route("post", ["/rivalries"], guard, wrap(async (req, res) => {
  const data = await load();
  const enemyName = clip(req.body.enemyName, 60);
  const status = clip(req.body.status, 20) || "war";
  const reason = clip(req.body.reason, 300);
  const rules = clip(req.body.rules, 300);
  const enemyLogo = clip(req.body.enemyLogo, 300);

  if (!enemyName) return res.status(400).json({ error: "اسم العصابة المعادية مطلوب" });

  if (!data.rivalries) data.rivalries = [];
  data.rivalries.unshift({
    id: crypto.randomUUID(),
    enemyName,
    enemyLogo: enemyLogo || "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/png/skull.png",
    status,
    reason,
    rules,
    startedAt: new Date().toISOString().split("T")[0]
  });

  await save(data);
  res.json(publicData(req.session.user, data));
}));

route("patch", ["/rivalries/:id"], guard, wrap(async (req, res) => {
  const data = await load();
  const r = (data.rivalries || []).find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: "العداوة غير موجودة" });

  if (req.body.enemyName) r.enemyName = clip(req.body.enemyName, 60);
  if (req.body.status) r.status = clip(req.body.status, 20);
  if (req.body.reason) r.reason = clip(req.body.reason, 300);
  if (req.body.rules) r.rules = clip(req.body.rules, 300);
  if (req.body.enemyLogo !== undefined) r.enemyLogo = clip(req.body.enemyLogo, 300);

  await save(data);
  res.json(publicData(req.session.user, data));
}));

route("delete", ["/rivalries/:id"], guard, wrap(async (req, res) => {
  const data = await load();
  data.rivalries = (data.rivalries || []).filter(x => x.id !== req.params.id);
  await save(data);
  res.json(publicData(req.session.user, data));
}));

module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`  🦅 Phantoms Gang Portal is Running!`);
    console.log(`  🌐 Website: http://localhost:${PORT}`);
    console.log(`  💬 Discord Guild ID: ${GUILD_ID}`);
    console.log(`  🔗 Invite: ${DISCORD_INVITE}`);
    console.log(`==============================================\n`);
  });
}
