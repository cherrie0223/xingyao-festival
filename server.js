// 星耀中国 · 万里同月 — 互动网页服务端（零依赖，Node 内置模块）
// 运行：node server.js   访问 http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOADS = path.join(ROOT, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PORT = process.env.PORT || 3000;
// 后台口令：设置环境变量 ADMIN_TOKEN 后，/admin 与 /admin/download 需带 ?token= 才可用；不设置则保持开放（仅建议内网/本机）。
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
function adminOk(u) { return !ADMIN_TOKEN || u.searchParams.get('token') === ADMIN_TOKEN; }

const REGIONS = ['徐汇', '浦东', '岱山', '成都', '郑州', '乌鲁木齐'];

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { entries: [] }; }
}
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

// 灯谜 / 国庆 / 航空 / 公司小问答（单选，answer 为正确项索引）共 50 题
const RIDDLES = [
  // —— 中秋（15）——
  { q: '中秋节的农历日期是？', options: ['正月十五', '八月十五', '五月初五'], answer: 1 },
  { q: '中秋节最具代表性的食物是？', options: ['粽子', '月饼', '汤圆'], answer: 1 },
  { q: '传说中在月宫捣药的动物是？', options: ['玉兔', '麒麟', '凤凰'], answer: 0 },
  { q: '月亮本身会发光吗？', options: ['会', '不会，是反射太阳光', '只在中秋发光'], answer: 1 },
  { q: '古人中秋节的典型习俗是？', options: ['赛龙舟', '赏月', '踩高跷'], answer: 1 },
  { q: '“但愿人长久，千里共婵娟”中“婵娟”指？', options: ['月亮', '美女', '美酒'], answer: 0 },
  { q: '月饼在古代最早被称为？', options: ['胡饼', '汤饼', '烧饼'], answer: 0 },
  { q: '传说中嫦娥奔月前吞下的是？', options: ['不死药', '仙桃', '灵芝'], answer: 0 },
  { q: '传说吴刚在月宫不停砍伐的是？', options: ['桂树', '柳树', '松树'], answer: 0 },
  { q: '下列哪个是中秋节的别称？', options: ['团圆节', '寒食节', '上巳节'], answer: 0 },
  { q: '月饼的圆形通常寓意？', options: ['团圆', '长寿', '丰收'], answer: 0 },
  { q: '神话中后羿的妻子是？', options: ['嫦娥', '织女', '女娲'], answer: 0 },
  { q: '“海上生明月，天涯共此时”的作者是？', options: ['张九龄', '李白', '苏轼'], answer: 0 },
  { q: '中秋时节常酿来赏桂的酒是？', options: ['桂花酒', '竹叶青', '女儿红'], answer: 0 },
  { q: '2026 年中秋节是公历哪一天？', options: ['9月25日', '10月1日', '8月15日'], answer: 0 },
  // —— 国庆（12）——
  { q: '中华人民共和国国庆日是？', options: ['10月1日', '9月10日', '1月1日'], answer: 0 },
  { q: '国庆节是为了纪念？', options: ['改革开放', '中华人民共和国成立', '抗日战争胜利'], answer: 1 },
  { q: '我国国旗的名称是？', options: ['红星旗', '五星红旗', '八一旗'], answer: 1 },
  { q: '国旗的红色主要象征？', options: ['革命', '喜庆', '丰收'], answer: 0 },
  { q: '国旗上那颗大五角星代表？', options: ['中国共产党', '工人', '农民'], answer: 0 },
  { q: '我国国徽上有下列哪一建筑？', options: ['天安门', '长城', '东方明珠'], answer: 0 },
  { q: '中华人民共和国国歌是？', options: ['义勇军进行曲', '歌唱祖国', '我的祖国'], answer: 0 },
  { q: '国歌《义勇军进行曲》的作曲者是？', options: ['聂耳', '冼星海', '贺绿汀'], answer: 0 },
  { q: '1949 年开国大典在何处举行？', options: ['北京天安门', '上海', '西安'], answer: 0 },
  { q: '新中国成立于哪一年？', options: ['1949年', '1978年', '1919年'], answer: 0 },
  { q: '国庆节法定假期通常为？', options: ['7天', '3天', '10天'], answer: 0 },
  { q: '国旗上一颗大星加几颗小星？', options: ['4颗', '5颗', '3颗'], answer: 0 },
  // —— 航空 / 货运（13）——
  { q: '万里安的主营方向包含？', options: ['航空货运保障', '餐饮连锁', '房地产开发'], answer: 0 },
  { q: '“低空经济”主要指哪类飞行活动？', options: ['万米高空客机', '无人机 / 通航低空飞行', '人造卫星'], answer: 1 },
  { q: '航空货运中用来追踪货物的编号叫？', options: ['运单号', '发票号', '车牌号'], answer: 0 },
  { q: '航空运输相比陆运最大的优势是？', options: ['速度快', '成本低', '载重大'], answer: 0 },
  { q: '机场代码“PVG”指的是？', options: ['上海浦东机场', '北京首都机场', '广州白云机场'], answer: 0 },
  { q: '货物在装机前必须经过？', options: ['安全检查', '美容包装', '称重即可'], answer: 0 },
  { q: '客机下方用来装货的空间叫？', options: ['腹舱', '机头', '尾翼'], answer: 0 },
  { q: '生鲜冷链运输最关键的是？', options: ['温控', '颜色', '重量'], answer: 0 },
  { q: '危险品运输前必须？', options: ['合规申报', '自行携带', '隐藏不报'], answer: 0 },
  { q: '乌鲁木齐与上海约有几小时时差？', options: ['约2小时', '约0小时', '约5小时'], answer: 0 },
  { q: '“双11”等电商大促常使货运进入？', options: ['旺季', '淡季', '停摆'], answer: 0 },
  { q: '货站的主要职责包括？', options: ['装卸与分拣', '只做办公', '仅供停车'], answer: 0 },
  { q: '机场代码（如 PVG、PEK）一般遵循哪类国际标准？', options: ['IATA / ICAO', '邮政编码', '车牌规则'], answer: 0 },
  // —— 万里安 / 活动（10）——
  { q: '“万里安”三字最贴切的寓意是？', options: ['万里平安', '万里长城', '万里江山'], answer: 0 },
  { q: '万里安总部设在下列哪处？', options: ['上海徐汇', '浦东', '岱山'], answer: 0 },
  { q: '下列哪个是我们的海岛货站？', options: ['岱山', '鼓浪屿', '崇明岛'], answer: 0 },
  { q: '我们的品牌色不包含下列哪一种？', options: ['紫色', '深蓝', '绿色'], answer: 0 },
  { q: '“星耀万里”是公司的？', options: ['员工小程序', '外卖平台', '游戏'], answer: 0 },
  { q: '2026 年中秋（9/25）与国庆（10/1）相邻，公司把 Q3 生日会并入哪场活动？', options: ['云端团圆夜', '年中复盘会', '年终盛典'], answer: 0 },
  { q: '中秋与国庆相邻，常被合称为？', options: ['双节', '两节', '三连'], answer: 0 },
  { q: '针对 6 个货站分散、节假日仍需倒班值守的特点，本次活动主形式定为？', options: ['分布式站点 mini 庆典 + 云端联结', '全员集中到总部开大会', '各站自行放假不办'], answer: 0 },
  { q: '本次活动的主题是？', options: ['万里同月', '万里长城', '万里无云'], answer: 0 },
  { q: '本次点亮地图的目标，是让约多少位同事参与？', options: ['50位左右', '6位', '1000位'], answer: 0 }
];

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 极简 ZIP（仅存储，不压缩），用于后台打包下载图片
function buildZip(files) {
  const chunks = [], central = [];
  let offset = 0;
  const enc = s => Buffer.from(s, 'utf8');
  for (const f of files) {
    const nameBuf = enc(f.name);
    const data = f.data;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8
    local.writeUInt16LE(0, 8);      // store
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuf, end]);
}

function sendJSON(res, obj, status = 200) {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': b.length });
  res.end(b);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > 16 * 1024 * 1024) { req.destroy(); reject(new Error('too large')); } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function safeId(id) { return /^[a-zA-Z0-9]+$/.test(id || ''); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  // 允许被外部网页（如建站之星 iframe）嵌入，便于用公司域名展示
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  try {
    if (p === '/' || p === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return fs.createReadStream(path.join(PUBLIC, 'index.html')).pipe(res);
    }
    if (p === '/admin' || p === '/admin.html') {
      if (!adminOk(url)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('未授权：请访问 /admin?token=您的口令'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return fs.createReadStream(path.join(PUBLIC, 'admin.html')).pipe(res);
    }
    if (p === '/api/riddle' && req.method === 'GET') {
      const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      return sendJSON(res, { q: r.q, options: r.options, answer: r.answer });
    }
    if (p === '/api/questions' && req.method === 'GET') {
      // 总部查看完整题库（含答案）
      return sendJSON(res, RIDDLES.map((r, i) => ({ no: i + 1, q: r.q, options: r.options, answer: r.answer })));
    }
    if (p === '/api/entries' && req.method === 'GET') {
      const d = loadData();
      return sendJSON(res, d.entries);
    }
    if (p === '/api/upload' && req.method === 'POST') {
      const body = JSON.parse(readBodySync(await readBody(req)));
      const photo = body.photo || '';
      const m = /^data:image\/(\w+);base64,(.+)$/.exec(photo) || /^([\w\/]+)?;base64,(.+)$/.exec(photo);
      if (!m) return sendJSON(res, { error: '请上传图片' }, 400);
      const ext = (m[1] || 'jpg').replace('jpeg', 'jpg').replace('png', 'png') || 'jpg';
      const b64 = m[2];
      let buf;
      try { buf = Buffer.from(b64, 'base64'); } catch { return sendJSON(res, { error: '图片格式错误' }, 400); }
      if (buf.length < 100) return sendJSON(res, { error: '图片无效' }, 400);
      const region = REGIONS.includes(body.region) ? body.region : null;
      if (!region) return sendJSON(res, { error: '请选择所在地区' }, 400);
      const id = crypto.randomBytes(8).toString('hex');
      fs.writeFileSync(path.join(UPLOADS, id + '.' + ext), buf);
      const entry = {
        id,
        nickname: String(body.nickname || '匿名星友').slice(0, 20),
        region,
        message: String(body.message || '').slice(0, 200),
        starName: null,
        ts: Date.now()
      };
      const d = loadData();
      d.entries.push(entry);
      saveData(d);
      return sendJSON(res, { id });
    }
    if (p === '/api/points' && req.method === 'POST') {
      const body = JSON.parse(readBodySync(await readBody(req)));
      if (!safeId(body.id)) return sendJSON(res, { error: '无效' }, 400);
      const name = String(body.name || '').trim().slice(0, 20);
      if (!name) return sendJSON(res, { error: '请登记姓名' }, 400);
      const d = loadData();
      const e = d.entries.find(x => x.id === body.id);
      if (!e) return sendJSON(res, { error: '记录不存在' }, 404);
      e.starName = name;
      saveData(d);
      return sendJSON(res, { ok: true });
    }
    if (p.startsWith('/api/image/')) {
      const id = p.split('/').pop().replace(/\.[a-z]+$/i, '');
      if (!safeId(id)) { res.writeHead(404); return res.end('no'); }
      const files = fs.readdirSync(UPLOADS).filter(f => f.startsWith(id + '.'));
      if (!files.length) { res.writeHead(404); return res.end('no'); }
      const fp = path.join(UPLOADS, files[0]);
      res.writeHead(200, { 'Content-Type': 'image/' + (files[0].endsWith('.png') ? 'png' : 'jpeg') });
      return fs.createReadStream(fp).pipe(res);
    }
    if (p === '/admin/download' && req.method === 'GET') {
      if (!adminOk(url)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('未授权：需要 ?token= 口令'); }
      const d = loadData();
      const files = [];
      for (const e of d.entries) {
        const fs2 = fs.readdirSync(UPLOADS).filter(f => f.startsWith(e.id + '.'));
        if (fs2.length) files.push({ name: `${e.region}_${e.nickname}_${e.id}${path.extname(fs2[0])}`, data: fs.readFileSync(path.join(UPLOADS, fs2[0])) });
      }
      // CSV
      const header = 'id,nickname,region,message,starName\n';
      const rows = d.entries.map(e => [e.id, e.nickname, e.region, `"${String(e.message).replace(/"/g, '""')}"`, e.starName || ''].join(',')).join('\n');
      files.push({ name: 'entries.csv', data: Buffer.from(header + rows, 'utf8') });
      const zip = buildZip(files);
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="xingyao-china.zip"',
        'Content-Length': zip.length
      });
      return res.end(zip);
    }
    // 静态资源（logo / 地图 / 题库页 / 库文件）
    if (req.method === 'GET') {
      const ext = path.extname(p).toLowerCase();
      const TYPES = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml' };
      if (TYPES[ext]) {
        const rel = p.replace(/^\/+/, '').replace(/^(\.\.[/\\])+/, '');
        const fp = path.resolve(PUBLIC, rel);
        if (fp.startsWith(path.resolve(PUBLIC)) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
          res.writeHead(200, { 'Content-Type': TYPES[ext], 'Cache-Control': 'no-store' });
          return fs.createReadStream(fp).pipe(res);
        }
      }
    }
    // 受保护的 CSV 导出（后台用，需口令）
    if (p === '/admin/csv' && req.method === 'GET') {
      if (!adminOk(url)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('未授权：需要 ?token= 口令'); }
      const d = loadData();
      const header = 'id,nickname,region,message,starName\n';
      const rows = d.entries.map(e => [e.id, e.nickname, e.region, `"${String(e.message).replace(/"/g, '""')}"`, e.starName || ''].join(',')).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="xingyao-entries.csv"' });
      return res.end('﻿' + header + rows);
    }
    // 一键清空测试数据（后台用，需口令）：清空上传记录 + 删除所有测试图片
    if (p === '/api/clear' && req.method === 'POST') {
      if (!adminOk(url)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('未授权：需要 ?token= 口令'); }
      try {
        const files = fs.readdirSync(UPLOADS);
        for (const f of files) {
          const fp = path.join(UPLOADS, f);
          if (fs.statSync(fp).isFile()) fs.unlinkSync(fp);
        }
      } catch (e) { /* 清理异常忽略 */ }
      saveData({ entries: [] });
      return sendJSON(res, { ok: true, cleared: true });
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404');
  } catch (err) {
    sendJSON(res, { error: String(err && err.message || err) }, 500);
  }
});

// 同步包装（body 已经拿到 buffer）
function readBodySync(b) { return b.toString('utf8'); }

server.listen(PORT, () => {
  console.log(`星耀中国已启动: http://localhost:${PORT}`);
  console.log(`管理员后台:     http://localhost:${PORT}/admin`);
});
