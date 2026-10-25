const express = require("express");
const session = require("cookie-session");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { CLIENT_ID, CLIENT_SECRET, REDIRECT, GUILD_ID, OWNER_ID, SECRET } = process.env;
const ROLE_IDS = (process.env.ROLE_IDS || "").split(",").map(s => s.trim());
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data.json");
// 0 Boss, 1 Co-Boss, 2 Manager, 3 Admin, 4 Member, 5 Regular
const PANEL_MAX = 3;   // الرتب اللي تدخل لوحة التحكم (0..3)
const SITE_MAX = 2;    // الرتب اللي تعدل محتوى الموقع (0..2)

const DEFAULT = {
  tagline: "عيلة مش زي أي عيلة. ولاء وقوة وأسلوب ماشي بخطة تحت قيادة VOLT.",
  about: "فانتومز عيلة على سيرفر كيان، بدأت بفكرة بسيطة: نبني اسم قوي يتحترم في كل مكان في المدينة.\nاكتب هنا قصة العيلة وقوانينها.",
  members: [{ uid: "seed", n: "VOLT", id: "", r: 0 }],
  creators: [{ uid: "seed", n: "اسم الصانع", p: "Twitch · YouTube" }]
};
// التخزين: Upstash Redis على Vercel، أو data.json على جهازك
const RURL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = async cmd => {
  const r = await fetch(RURL, { method: "POST", headers: { Authorization: "Bearer " + RTOK }, body: JSON.stringify(cmd) });
  return (await r.json()).result;
};
async function load() {
  let d = null;
  if (RURL && RTOK) { const v = await redis(["GET", "phantoms"]); d = v ? JSON.parse(v) : null; }
  else if (fs.existsSync(DB)) d = JSON.parse(fs.readFileSync(DB, "utf8"));
  return d || JSON.parse(JSON.stringify(DEFAULT));
}
async function save(d) {
  if (RURL && RTOK) await redis(["SET", "phantoms", JSON.stringify(d)]);
  else fs.writeFileSync(DB, JSON.stringify(d, null, 2));
}
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: "خطأ في السيرفر" }); });

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb" }));
app.use(session({
  name: "s", secret: SECRET || "dev-secret", maxAge: 7 * 864e5,
  httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production"
}));
app.use(express.static(path.join(__dirname, "public")));

const clip = (s, n) => String(s || "").trim().slice(0, n);
const hasPanel = u => u && u.rank !== null && u.rank <= PANEL_MAX;
const canManage = (u, targetRank) => hasPanel(u) && (u.rank === 0 || targetRank > u.rank);

function publicData(u, data) {
  const full = hasPanel(u);
  return {
    tagline: data.tagline, about: data.about,
    creators: data.creators,
    members: data.members.map(m => full ? m : { uid: m.uid, n: m.n, r: m.r })
  };
}
const guard = (req, res, next) =>
  hasPanel(req.session.user) ? next() : res.status(403).json({ error: "مش مسموح لك" });

// ---------- Discord OAuth ----------
app.get("/login", (req, res) => {
  req.session.state = crypto.randomBytes(16).toString("hex");
  res.redirect("https://discord.com/oauth2/authorize?response_type=code" +
    "&scope=" + encodeURIComponent("identify guilds.members.read") +
    "&client_id=" + CLIENT_ID +
    "&redirect_uri=" + encodeURIComponent(REDIRECT) +
    "&state=" + req.session.state);
});

app.get("/callback", async (req, res) => {
  try {
    const data = await load();
    if (!req.query.code || req.query.state !== req.session.state) return res.status(400).send("طلب غير صالح");
    const tr = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "authorization_code",
        code: req.query.code, redirect_uri: REDIRECT })
    });
    const t = await tr.json();
    if (!t.access_token) return res.status(400).send("فشل تسجيل الدخول");
    const h = { Authorization: "Bearer " + t.access_token };
    const u = await (await fetch("https://discord.com/api/users/@me", { headers: h })).json();
    const mr = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, { headers: h });
    const roles = mr.ok ? (await mr.json()).roles || [] : [];

    let rank = null;
    ROLE_IDS.forEach((rid, i) => { if (rid && roles.includes(rid) && (rank === null || i < rank)) rank = i; });
    if (OWNER_ID && u.id === OWNER_ID) rank = 0;
    const name = u.global_name || u.username;

    // تسجيل العضو تلقائي في قائمة العيلة بحسب رتبته في ديسكورد
    if (rank !== null) {
      const ex = data.members.find(m => m.id === u.id);
      if (ex) { ex.r = rank; ex.n = name; }
      else data.members.push({ uid: crypto.randomUUID(), n: name, id: u.id, r: rank });
      await save(data);
    }
    req.session = { user: { id: u.id, name, rank } };
    res.redirect("/");
  } catch (e) { console.error(e); res.status(500).send("خطأ في السيرفر"); }
});

app.get("/logout", (req, res) => { req.session = null; res.redirect("/"); });
app.get("/me", (req, res) => res.json(req.session.user || null));

// ---------- API ----------
app.get("/api/site", wrap(async (req, res) => res.json(publicData(req.session.user, await load()))));

app.post("/api/site", guard, wrap(async (req, res) => {
  const data = await load();
  if (req.session.user.rank > SITE_MAX) return res.status(403).json({ error: "تعديل المحتوى للمدير وفوق" });
  data.tagline = clip(req.body.tagline, 200) || DEFAULT.tagline;
  data.about = clip(req.body.about, 2000) || DEFAULT.about;
  await save(data); res.json(publicData(req.session.user, data));
}));

app.post("/api/members", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user, r = Number(req.body.r), n = clip(req.body.n, 40);
  if (!n || !Number.isInteger(r) || r < 0 || r > 5) return res.status(400).json({ error: "بيانات ناقصة" });
  if (!canManage(u, r)) return res.status(403).json({ error: "مش تقدر تدي رتبة أعلى أو زي رتبتك" });
  data.members.push({ uid: crypto.randomUUID(), n, id: clip(req.body.id, 25), r });
  await save(data); res.json(publicData(u, data));
}));

app.patch("/api/members/:uid", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user, m = data.members.find(x => x.uid === req.params.uid), r = Number(req.body.r);
  if (!m || !Number.isInteger(r) || r < 0 || r > 5) return res.status(400).json({ error: "بيانات غلط" });
  if (!canManage(u, m.r) || !canManage(u, r)) return res.status(403).json({ error: "مش مسموح لك" });
  m.r = r; await save(data); res.json(publicData(u, data));
}));

app.delete("/api/members/:uid", guard, wrap(async (req, res) => {
  const data = await load();
  const u = req.session.user, m = data.members.find(x => x.uid === req.params.uid);
  if (!m) return res.status(404).json({ error: "مش موجود" });
  if (!canManage(u, m.r)) return res.status(403).json({ error: "مش مسموح لك" });
  data.members = data.members.filter(x => x !== m); await save(data); res.json(publicData(u, data));
}));

app.post("/api/creators", guard, wrap(async (req, res) => {
  const data = await load();
  const n = clip(req.body.n, 40);
  if (!n) return res.status(400).json({ error: "الاسم مطلوب" });
  data.creators.push({ uid: crypto.randomUUID(), n, p: clip(req.body.p, 80) });
  await save(data); res.json(publicData(req.session.user, data));
}));

app.delete("/api/creators/:uid", guard, wrap(async (req, res) => {
  const data = await load();
  data.creators = data.creators.filter(c => c.uid !== req.params.uid);
  await save(data); res.json(publicData(req.session.user, data));
}));

module.exports = app;
if (require.main === module) app.listen(PORT, () => console.log("Phantoms site on http://localhost:" + PORT));
