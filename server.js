const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const categories = ['餐饮','交通','购物','住房','医疗','娱乐','工资','奖金','转账','其他'];

if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || !ENCRYPTION_KEY || !process.env.DATABASE_URL)) {
  throw new Error('Production requires JWT_SECRET, ENCRYPTION_KEY and DATABASE_URL');
}
const jwtSecret = JWT_SECRET || 'local-development-secret-change-me';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/billflow',
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
});
pool.on('error', err => console.error('Unexpected PostgreSQL pool error', err));

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
function tokenFor(user) { return jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d', issuer: 'billflow' }); }
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: '请先登录' });
  try { req.user = jwt.verify(token, jwtSecret, { issuer: 'billflow' }); next(); }
  catch { return res.status(401).json({ message: '登录已过期，请重新登录' }); }
}
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: '操作过于频繁，请稍后再试' } });

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, name VARCHAR(80) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_bills_user_created ON bills(user_id, created_at DESC)');
}
function validBill(input) {
  const date = String(input.date || '');
  const type = String(input.type || '');
  const category = String(input.category || '');
  const amount = Number(input.amount);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || !['收入','支出'].includes(type) || !categories.includes(category) || !Number.isFinite(amount) || amount <= 0 || amount > 1e12) throw new Error('日期、收支类型、分类或金额无效');
  return { id: input.id || crypto.randomUUID(), date, type, category, amount: Math.round(amount * 100) / 100, note: String(input.note || '').slice(0, 500), source: String(input.source || '手动录入').slice(0, 80) };
}
function normalizeImported(input) {
  const raw = input || {};
  const note = String(raw.note || raw.description || '');
  const type = raw.type === '收入' ? '收入' : '支出';
  const rules = [['餐饮',/餐|饭|咖啡|奶茶|��卖|美食|food|restaurant/i],['交通',/交通|地铁|公交|打车|出租|加油|停车|滴滴|高铁|火车|机票|taxi/i],['购物',/购物|超市|淘宝|京东|商场|服饰|商品|mall/i],['住房',/房租|物业|水电|燃气|宽带|住房/],['医疗',/医院|药|医疗|诊所|挂号/],['娱乐',/电影|游戏|旅游|演出|娱乐|会员|视频/],['奖金',/奖金|年终|补贴|红包/],['工资',/工资|薪资|salary|payroll/],['转账',/转账|汇款|收款|银行卡/]];
  const category = categories.includes(raw.category) ? raw.category : (rules.find(([, re]) => re.test(note))?.[0] || (type === '收入' ? '工资' : '其他'));
  return validBill({ ...raw, type, category, note, source: raw.source || '文件导入' });
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'", 'https://cdn.jsdelivr.net'], workerSrc: ["'self'", 'blob:'], objectSrc: ["'none'"], baseUri: ["'self'"] } } }));
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 200) return res.status(400).json({ message: '请填写有效姓名、邮箱和至少 8 位密码' });
    const id = crypto.randomUUID();
    await pool.query('INSERT INTO users (id,name,email,password_hash) VALUES ($1,$2,$3,$4)', [id, name, email, await bcrypt.hash(password, 12)]);
    const user = { id, name, email };
    res.status(201).json({ token: tokenFor(user), user });
  } catch (e) { res.status(e.code === '23505' ? 409 : 500).json({ message: e.code === '23505' ? '该邮箱已注册' : '注册失败' }); }
});
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const result = await pool.query('SELECT id,name,email,password_hash FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ message: '邮箱或密码错误' });
    res.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch { res.status(500).json({ message: '登录失败' }); }
});
app.get('/api/me', auth, async (req, res) => {
  try { const result = await pool.query('SELECT id,name,email FROM users WHERE id=$1', [req.user.userId]); result.rows[0] ? res.json(result.rows[0]) : res.status(404).json({ message: '用户不存在' }); }
  catch { res.status(500).json({ message: '读取用户信息失败' }); }
});
app.get('/api/bills', auth, async (req, res) => {
  try { const result = await pool.query('SELECT id,payload,created_at FROM bills WHERE user_id=$1 ORDER BY created_at DESC', [req.user.userId]); res.json(result.rows.map(row => ({ ...decrypt(row.payload), id: row.id, created_at: row.created_at }))); }
  catch { res.status(500).json({ message: '读取账单失败' }); }
});
app.post('/api/bills', auth, async (req, res) => {
  try { const bill = validBill(req.body); await pool.query('INSERT INTO bills (id,user_id,payload) VALUES ($1,$2,$3)', [bill.id, req.user.userId, encrypt(bill)]); res.status(201).json({ bill }); }
  catch (e) { res.status(400).json({ message: e.message || '保存失败' }); }
});
app.put('/api/bills/:id', auth, async (req, res) => {
  try {
    const old = await pool.query('SELECT payload FROM bills WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]);
    if (!old.rows[0]) return res.status(404).json({ message: '账单不存在' });
    const bill = validBill({ ...decrypt(old.rows[0].payload), ...req.body, id: req.params.id });
    await pool.query('UPDATE bills SET payload=$1 WHERE id=$2 AND user_id=$3', [encrypt(bill), req.params.id, req.user.userId]);
    res.json({ bill });
  } catch (e) { res.status(400).json({ message: e.message || '更新失败' }); }
});
app.delete('/api/bills/:id', auth, async (req, res) => {
  try { const result = await pool.query('DELETE FROM bills WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]); result.rowCount ? res.json({ message: '已删除' }) : res.status(404).json({ message: '账单不存在' }); }
  catch { res.status(500).json({ message: '删除失败' }); }
});
app.post('/api/import', auth, async (req, res) => {
  const input = Array.isArray(req.body) ? req.body : req.body?.records;
  if (!Array.isArray(input) || !input.length || input.length > 5000) return res.status(400).json({ message: '请选择 1–5000 条账单导入' });
  let bills;
  try { bills = input.map(normalizeImported); }
  catch (e) { return res.status(400).json({ message: e.message || '导入数据无效' }); }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const bill of bills) await client.query('INSERT INTO bills (id,user_id,payload) VALUES ($1,$2,$3)', [bill.id, req.user.userId, encrypt(bill)]);
    await client.query('COMMIT');
    res.status(201).json({ count: bills.length });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ message: '导入失败，未保存任何账单' }); }
  finally { client.release(); }
});
app.get('/api/summary', auth, async (req, res) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0,7));
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ message: '月份格式无效' });
    const result = await pool.query('SELECT payload FROM bills WHERE user_id=$1', [req.user.userId]);
    const bills = result.rows.map(row => decrypt(row.payload));
    const total = list => Number(list.reduce((sum,b) => sum + (b.type === '收入' ? b.amount : -b.amount), 0).toFixed(2));
    const current = bills.filter(b => b.date.startsWith(month));
    const income = Number(current.filter(b => b.type === '收入').reduce((s,b)=>s+b.amount,0).toFixed(2));
    const expense = Number(current.filter(b => b.type === '支出').reduce((s,b)=>s+b.amount,0).toFixed(2));
    const map = {};
    current.filter(b=>b.type==='支出').forEach(b=>map[b.category]=(map[b.category]||0)+b.amount);
    const [year, monthNum] = month.split('-').map(Number);
    const trend = Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(year,monthNum-1-5+i,1));const k=d.toISOString().slice(0,7);const items=bills.filter(b=>b.date.startsWith(k));return {month:k,label:`${d.getUTCMonth()+1}月`,income:total(items.filter(b=>b.type==='收入')),expense:-total(items.filter(b=>b.type==='支出'))};});
    res.json({ month,income,expense,balance:Number((income-expense).toFixed(2)),byCategory:Object.entries(map).map(([name,value])=>({name,value:Number(value.toFixed(2))})).sort((a,b)=>b.value-a.value),trend });
  } catch { res.status(500).json({ message: '生成报表失败' }); }
});
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.use('/api', (req,res)=>res.status(404).json({message:'接口不存在'}));
app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next)=>{ console.error(err); if (res.headersSent) return next(err); res.status(500).json({message:'服务器内部错误'}); });
initDb().then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Billflow listening on ${PORT}`))).catch(err => { console.error('Database initialization failed',err); process.exit(1); });
