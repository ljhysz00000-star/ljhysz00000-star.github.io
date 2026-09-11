#!/usr/bin/env node
/**
 * 一键把本地博客推上线（走 GitHub REST API，不需要 git push）
 *
 * 用法（在 PowerShell 里）：
 *   cd "D:\我的博客"
 *   node sync.cjs
 *
 * 令牌从同目录的 .ghtoken 文件里读（已在 .gitignore 中，不会被提交）。
 * 需要换成新令牌时，只要把新令牌写进 .ghtoken 就行，不用改这个脚本。
 *
 * 推送后 GitHub Actions 会自动构建并部署，约 1-2 分钟后线上生效。
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const OWNER = 'ljhysz00000-star';
const REPO = 'ljhysz00000-star.github.io';

// ---------- 读取令牌 ----------
function readToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const f = path.join(ROOT, '.ghtoken');
  if (!fs.existsSync(f)) {
    console.error('找不到令牌文件：' + f);
    console.error('请把 GitHub 令牌（40 位，以 ghp_ 开头）写进这个文件，只写一行。');
    process.exit(1);
  }
  const t = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!t) {
    console.error('令牌文件是空的：' + f);
    process.exit(1);
  }
  if (t.length !== 40) {
    console.warn(`提醒：令牌长度是 ${t.length}，GitHub 经典令牌应该是 40 位，可能没复制完整。`);
  }
  return t;
}

const TOKEN = readToken();

// ---------- 网络：能直连就直连，连不上自动切到本机代理 ----------
const CANDIDATE_PROXIES = [
  process.env.HTTPS_PROXY || process.env.https_proxy || '',
  'http://127.0.0.1:63809',
];

let proxyReady = false;
function useProxy(url) {
  if (!url || proxyReady) return;
  try {
    const { ProxyAgent, setGlobalDispatcher } = require('undici');
    setGlobalDispatcher(new ProxyAgent(url));
    proxyReady = true;
    console.log('已启用代理：' + url);
  } catch (e) {
    // 没有 undici 就直连试试
  }
}

const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const BASE_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'blog-sync',
  'Content-Type': 'application/json',
};

async function raw(method, url, body) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: BASE_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* 非 JSON */ }
  if (!res.ok) {
    const err = new Error(`${method} ${url} -> ${res.status} ${res.statusText}\n${text.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function api(method, url, body) {
  try {
    return await raw(method, url, body);
  } catch (e) {
    const isNetwork = !e.status;
    if (!isNetwork || proxyReady) throw e;
    // 直连失败，试试代理
    for (const p of CANDIDATE_PROXIES) {
      if (!p) continue;
      useProxy(p);
      if (!proxyReady) continue;
      console.log('直连失败，改用代理重试……');
      return await raw(method, url, body);
    }
    throw e;
  }
}

// ---------- 要同步哪些文件 ----------
const TOP_FILES = ['hugo.toml', '.gitignore', 'README.md', 'switch-theme.cjs', 'sync.cjs', '.github/workflows/deploy.yml'];
const SYNC_DIRS = ['content', 'static', '_theme-configs', '_theme-scripts'];
const IGNORE = new Set(['public', 'resources', 'themes', '_themes-archive', '_old_static', 'node_modules', '.git']);

function collectFiles() {
  const out = [];
  for (const f of TOP_FILES) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) out.push(f);
  }
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    for (const name of fs.readdirSync(abs)) {
      if (IGNORE.has(name)) continue;
      const childRel = rel ? `${rel}/${name}` : name;
      const childAbs = path.join(ROOT, childRel);
      const st = fs.statSync(childAbs);
      if (st.isDirectory()) walk(childRel);
      else out.push(childRel);
    }
  };
  for (const d of SYNC_DIRS) {
    const abs = path.join(ROOT, d);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) walk(d);
  }
  return [...new Set(out)].sort();
}

(async () => {
  console.log('仓库：' + OWNER + '/' + REPO);
  console.log('本地：' + ROOT + '\n');

  const me = await api('GET', 'https://api.github.com/user');
  console.log('令牌身份：' + me.login);

  const files = collectFiles();
  console.log(`待同步文件 ${files.length} 个`);

  const repo = await api('GET', '');
  const branch = repo.default_branch || 'main';

  const ref = await api('GET', `/git/ref/heads/${branch}`);
  const headSha = ref.object.sha;

  const tree = [];
  for (let i = 0; i < files.length; i++) {
    const rel = files[i];
    const content = fs.readFileSync(path.join(ROOT, rel));
    const blob = await api('POST', '/git/blobs', {
      content: content.toString('base64'),
      encoding: 'base64',
    });
    tree.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
    process.stdout.write(`\r  上传 ${i + 1}/${files.length}  ${rel}                    `);
  }
  console.log('');

  const treeRes = await api('POST', '/git/trees', { tree });
  const msg = `sync: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} 更新站点（${files.length} 个文件）`;
  const commit = await api('POST', '/git/commits', {
    message: msg,
    tree: treeRes.sha,
    parents: [headSha],
  });
  await api('PATCH', `/git/refs/heads/${branch}`, { sha: commit.sha, force: true });

  const themeLine = fs.readFileSync(path.join(ROOT, 'hugo.toml'), 'utf8').match(/^theme\s*=\s*['"]([^'"]+)['"]/m);
  console.log(`\n推送成功：${commit.sha.slice(0, 8)}  （主题：${themeLine ? themeLine[1] : '未知'}）`);
  console.log('线上地址：https://' + OWNER + '.github.io/');
  console.log('Actions ：https://github.com/' + OWNER + '/' + REPO + '/actions');
  console.log('\n约 1-2 分钟后刷新线上即可看到新版。');
})().catch((e) => {
  console.error('\n失败：' + e.message);
  process.exit(1);
});
