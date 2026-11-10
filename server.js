const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const DATA_DIR = path.dirname(process.env.DATABASE_PATH || path.join(__dirname, 'data', 'billflow.db'));
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'billflow.db');
const categories = ['餐饮','交通','购物','住房','医疗','娱乐','工资','奖金','转账','其他'];

if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || !ENCRYPTION_KEY)) {
  throw new Error('Production requires JWT_SECRET and ENCRYPTION_KEY environment variables');
}
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(DB_PATH);
db.configure('busyTimeout', 5000);

const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) { err ? reject(err) : resolve({ changes: this.changes, lastID: this.lastID }); }));
const get = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null)));
const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
const key = () => crypto.createHash('sha256').update(ENCRYPTION_KEY || 'local-development-only').digest();
function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ iv: iv.toString('base64'), data: data.toString('base64'), tag: cipher.getAuthTag().toString('base64') });
}
function decrypt(payload) {
  const value = JSON.parse(payload);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8'));
}
function tokenFor(user) { return jwt.sign({ userId: user.id }, JWT_SECRET || 'local-development-secret-change-me', { expiresIn: '7d', issuer: 'billflow' }); }
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: '请先登录' });
  try { req.user = jwt.verify(token, JWT_SECRET || 'local-development-secret-change-me', { issuer: 'billflow' }); next(); }
  catch { return res.status(401).json({ message: '登录已过期，请重新登录' }); }
}
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: '操作过于频繁，请稍后再试' } });

async function initDb() {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA foreign_keys = ON');
  await run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS bills (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await run('CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id)');
}
function validBill(input) {
  const date = String(input.date || '');
  const type = String(input.type || '');
  const category = String(input.category || '');
  const amount = Number(input.amount);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['收入','支出'].includes(type) || !categories.includes(category) || !Number.isFinite(amount) || amount <= 0 || amount > 1e12) throw new Error('日期、收支类型、分类或金额无效');
  return { id: input.id || crypto.randomUUID(), date, type, category, amount: Math.round(amount * 100) / 100, note: String(input.note || '').slice(0, 500), source: String(input.source || '手动录入').slice(0, 80) };
}
function normalizeImported(input) {
  const raw = input || {};
  const note = String(raw.note || raw.description || '');
  const type = raw.type === '收入' ? '收入' : '支出';
  const rules = [['餐饮',/餐|饭|咖啡|奶茶|外卖|美食|food|restaurant/i],['交通',/交通|地铁|公交|打车|出租|加油|停车|滴滴|高铁|火车|机票|taxi/i],['购物',/购物|超市|淘宝|京东|商场|服饰|商品|mall/i],['住房',/房租|物业|水电|燃气|宽带|住房/],['医疗',/医院|药|医疗|诊所|挂号/],['娱乐',/电影|游戏|旅游|演出|娱乐|会员|视频/],['奖金',/奖金|年终|补贴|红包/],['工资',/工资|薪资|salary|payroll/],['转账',/转账|汇款|收款|银行卡/]];
  const category = categories.includes(raw.category) ? raw.category : (rules.find(([, re]) => re.test(note))?.[0] || (type === '收入' ? '工资' : '其他'));
  return validBill({ ...raw, type, category, note, source: raw.source || '文件导入' });
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'", 'https://cdn.jsdelivr.net'], workerSrc: ["'self'", 'blob:'], objectSrc: ["'none'"], baseUri: ["'self'"] } } }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 200) return res.status(400).json({ message: '请填写有效姓名、邮箱和至少 8 位密码' });
    const id = crypto.randomUUID();
    await run('INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)', [id, name, email, await bcrypt.hash(password, 12), new Date().toISOString()]);
    const user = { id, name, email };
    res.status(201).json({ token: tokenFor(user), user });
  } catch (e) { res.status(e.code === 'SQLITE_CONSTRAINT' ? 409 : 500).json({ message: e.code === 'SQLITE_CONSTRAINT' ? '该邮箱已注册' : '注册失败' }); }
});
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const user = await get('SELECT id,name,email,password_hash FROM users WHERE email = ?', [email]);
    if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ message: '邮箱或密码错误' });
    res.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch { res.status(500).json({ message: '登录失败' }); }
});
app.get('/api/me', auth, async (req, res) => {
  const user = await get('SELECT id,name,email FROM users WHERE id = ?', [req.user.userId]);
  user ? res.json(user) : res.status(404).json({ message: '用户不存在' });
});
app.get('/api/bills', auth, async (req, res) => {
  try {
    const rows = await all('SELECT id,payload,created_at FROM bills WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId]);
    res.json(rows.map(row => ({ ...decrypt(row.payload), id: row.id, created_at: row.created_at })));
  } catch { res.status(500).json({ message: '读取账单失败' }); }
});
app.post('/api/bills', auth, async (req, res) => {
  try {
    const bill = validBill(req.body);
    await run('INSERT INTO bills (id,user_id,payload,created_at) VALUES (?,?,?,?)', [bill.id, req.user.userId, encrypt(bill), new Date().toISOString()]);
    res.status(201).json({ bill });
  } catch (e) { res.status(400).json({ message: e.message || '保存失败' }); }
});
app.put('/api/bills/:id', auth, async (req, res) => {
  try {
    const row = await get('SELECT payload FROM bills WHERE id=? AND user_id=?', [req.params.id, req.user.userId]);
    if (!row) return res.status(404).json({ message: '账单不存在' });
    const bill = validBill({ ...decrypt(row.payload), ...req.body, id: req.params.id });
    await run('UPDATE bills SET payload=? WHERE id=? AND user_id=?', [encrypt(bill), req.params.id, req.user.userId]);
    res.json({ bill });
  } catch (e) { res.status(400).json({ message: e.message || '更新失败' }); }
});
app.delete('/api/bills/:id', auth, async (req, res) => {
  const result = await run('DELETE FROM bills WHERE id=? AND user_id=?', [req.params.id, req.user.userId]);
  result.changes ? res.json({ message: '已删除' }) : res.status(404).json({ message: '账单不存在' });
});
app.post('/api/import', auth, async (req, res) => {
  try {
    const input = Array.isArray(req.body) ? req.body : req.body?.records;
    if (!Array.isArray(input) || !input.length || input.length > 5000) return res.status(400).json({ message: '请选择 1–5000 条账单导入' });
    const bills = input.map(normalizeImported);
    await new Promise((resolve, reject) => db.serialize(() => {
      db.run('BEGIN IMMEDIATE', err => { if (err) return reject(err); });
      const stmt = db.prepare('INSERT INTO bills (id,user_id,payload,created_at) VALUES (?,?,?,?)');
      let failed = false;
      bills.forEach(b => stmt.run([b.id, req.user.userId, encrypt(b), new Date().toISOString()], err => { if (err && !failed) { failed = true; db.run('ROLLBACK'); reject(err); } }));
      stmt.finalize(err => { if (err && !failed) { db.run('ROLLBACK'); reject(err); } else if (!failed) db.run('COMMIT', commitErr => commitErr ? reject(commitErr) : resolve()); });
    }));
    res.status(201).json({ count: bills.length });
  } catch (e) { res.status(400).json({ message: e.message || '导入失败' }); }
});
app.get('/api/summary', auth, async (req, res) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0,7));
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: '月份格式无效' });
    const rows = await all('SELECT payload FROM bills WHERE user_id=?', [req.user.userId]);
    const bills = rows.map(r => decrypt(r.payload));
    const total = list => Number(list.reduce((sum,b) => sum + (b.type === '收入' ? b.amount : -b.amount), 0).toFixed(2));
    const current = bills.filter(b => b.date.startsWith(month));
    const income = Number(current.filter(b => b.type === '收入').reduce((s,b)=>s+b.amount,0).toFixed(2));
    const expense = Number(current.filter(b => b.type === '支出').reduce((s,b)=>s+b.amount,0).toFixed(2));
    const map = {};
    current.filter(b=>b.type==='支出').forEach(b=>map[b.category]=(map[b.category]||0)+b.amount);
    const start = new Date(`${month}-01T00:00:00Z`);
    const trend = Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()-5+i,1));const k=d.toISOString().slice(0,7);const items=bills.filter(b=>b.date.startsWith(k));return {month:k,label:`${d.getUTCMonth()+1}月`,income:total(items.filter(b=>b.type==='收入')),expense:-total(items.filter(b=>b.type==='支出'))};});
    res.json({ month,income,expense,balance:Number((income-expense).toFixed(2)),byCategory:Object.entries(map).map(([name,value])=>({name,value:Number(value.toFixed(2))})).sort((a,b)=>b.value-a.value),trend });
  } catch { res.status(500).json({ message: '生成报表失败' }); }
});
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.use('/api', (req,res)=>res.status(404).json({message:'接口不存在'}));
app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next)=>{ console.error(err); if (res.headersSent) return next(err); res.status(500).json({message:'服务器内部错误'}); });

initDb().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Billflow listening on ${PORT}`))).catch(err => { console.error('Database initialization failed',err); process.exit(1); });
