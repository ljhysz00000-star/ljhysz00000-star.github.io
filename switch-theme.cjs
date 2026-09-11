#!/usr/bin/env node
/**
 * 博客主题一键切换
 *
 * 用法：
 *   node switch-theme.cjs                查看当前主题和可选主题
 *   node switch-theme.cjs fixit          切换到 FixIt
 *   node switch-theme.cjs papermod       切换到 PaperMod
 *   node switch-theme.cjs stack          切换到 Stack
 *   node switch-theme.cjs stack --preview   切换后直接本地预览
 *
 * 说明：本脚本只改本地文件。想上线，切换完执行：
 *   set GITHUB_TOKEN=你的令牌 && node ..\sync_github.cjs "D:\我的博客"
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const HUGO = process.env.HUGO_BIN || 'D:\\Hugo\\hugo.exe';
const CONFIG_DIR = path.join(ROOT, '_theme-configs');
const ARCHIVE_DIR = path.join(ROOT, '_themes-archive');
const THEMES_DIR = path.join(ROOT, 'themes');
const CONTENT_DIR = path.join(ROOT, 'content');

const THEMES = {
  fixit: { dir: 'FixIt', config: 'fixit.toml', label: 'FixIt（功能最全，当前线上用的就是它）' },
  papermod: { dir: 'PaperMod', config: 'papermod.toml', label: 'PaperMod（极简，页面最轻）' },
  stack: { dir: 'hugo-theme-stack', config: 'stack.toml', label: 'Stack（卡片式，左侧栏挂件）' },
};

const ARCHIVES_MD = `---
title: "归档"
layout: "archives"
sitemap:
  priority: 0.1
---
`;

const SEARCH_MD_PLAIN = `---
title: "搜索"
layout: "search"
placeholder: "输入关键词，回车搜索"
sitemap:
  priority: 0.1
---
`;

const SEARCH_MD_WITH_JSON = `---
title: "搜索"
layout: "search"
placeholder: "输入关键词，回车搜索"
outputs: ["html", "json"]
sitemap:
  priority: 0.1
---
`;

function readCurrentThemeKey() {
  const p = path.join(ROOT, 'hugo.toml');
  if (!fs.existsSync(p)) return null;
  const txt = fs.readFileSync(p, 'utf8');
  const m = txt.match(/^theme\s*=\s*['"]([^'"]+)['"]/m);
  if (!m) return null;
  for (const [key, t] of Object.entries(THEMES)) {
    if (t.dir === m[1]) return key;
  }
  return null;
}

function usage() {
  const cur = readCurrentThemeKey();
  console.log('\n博客主题切换工具\n');
  console.log('当前主题：' + (cur ? `${THEMES[cur].label}` : '（未识别）'));
  console.log('\n可选主题：');
  for (const [key, t] of Object.entries(THEMES)) {
    const mark = key === cur ? '  ← 当前' : '';
    console.log(`  ${key.padEnd(10)} ${t.label}${mark}`);
  }
  console.log('\n用法：node switch-theme.cjs <主题名> [--preview]');
  console.log('例：  node switch-theme.cjs stack --preview\n');
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else if (st.isFile()) fs.copyFileSync(s, d);
  }
}

function ensureThemeDir(key) {
  const t = THEMES[key];
  const target = path.join(THEMES_DIR, t.dir);
  if (fs.existsSync(path.join(target, 'theme.toml')) || fs.existsSync(path.join(target, 'layouts'))) {
    console.log(`  主题目录已存在：themes/${t.dir}`);
    return target;
  }
  const src = path.join(ARCHIVE_DIR, t.dir);
  if (!fs.existsSync(src)) {
    throw new Error(`本地归档里找不到主题：${src}\n（请先把主题放到 _themes-archive/${t.dir}）`);
  }
  fs.mkdirSync(THEMES_DIR, { recursive: true });
  copyDir(src, target);
  console.log(`  已从归档释放主题到 themes/${t.dir}`);
  return target;
}

function applyConfig(key) {
  const t = THEMES[key];
  const src = path.join(CONFIG_DIR, t.config);
  if (!fs.existsSync(src)) throw new Error(`找不到配置模板：${src}`);

  // 覆盖前先备份当前配置
  const cur = readCurrentThemeKey();
  if (cur) {
    const backup = path.join(CONFIG_DIR, THEMES[cur].config);
    fs.copyFileSync(path.join(ROOT, 'hugo.toml'), backup);
  }
  fs.copyFileSync(src, path.join(ROOT, 'hugo.toml'));
  console.log(`  已应用配置：_theme-configs/${t.config} → hugo.toml`);

  if (key === 'papermod') {
    const patcher = path.join(ROOT, '_theme-scripts', 'patch-papermod.cjs');
    if (fs.existsSync(patcher)) {
      execFileSync(process.execPath, [patcher, path.join(THEMES_DIR, 'PaperMod')], { stdio: 'inherit' });
      console.log('  已应用 PaperMod 兼容补丁');
    }
  }
}

function applyContent(key) {
  const archivesPath = path.join(CONTENT_DIR, 'archives.md');
  const searchPath = path.join(CONTENT_DIR, 'search.md');
  const postsDir = path.join(CONTENT_DIR, 'posts');
  // 放到 content 目录之外，确保 Hugo 一定不会处理它
  const hiddenDir = path.join(ROOT, '_theme-configs', 'hidden');

  // feature-tour.md 用的是 FixIt 专属短代码，切到别的主题时先藏起来
  const tourVisible = path.join(postsDir, 'feature-tour.md');
  const tourHidden = path.join(hiddenDir, 'feature-tour.md');

  if (key === 'fixit') {
    // FixIt 的 /archives/ 由首页输出格式生成，不能有同名内容页
    if (fs.existsSync(archivesPath)) {
      fs.unlinkSync(archivesPath);
      console.log('  已移除 content/archives.md（FixIt 自带归档页，两者会冲突）');
    }
    if (fs.existsSync(tourHidden)) {
      fs.mkdirSync(postsDir, { recursive: true });
      fs.renameSync(tourHidden, tourVisible);
      console.log('  已恢复 content/posts/feature-tour.md（FixIt 短代码演示文）');
    }
    fs.writeFileSync(searchPath, SEARCH_MD_PLAIN, 'utf8');
  } else {
    if (fs.existsSync(tourVisible)) {
      fs.mkdirSync(hiddenDir, { recursive: true });
      fs.renameSync(tourVisible, tourHidden);
      console.log('  已隐藏 feature-tour.md（它的短代码只适用于 FixIt）');
    }
    fs.writeFileSync(archivesPath, ARCHIVES_MD, 'utf8');
    fs.writeFileSync(searchPath, key === 'stack' ? SEARCH_MD_WITH_JSON : SEARCH_MD_PLAIN, 'utf8');
    console.log('  已准备 content/archives.md 与 content/search.md');
  }
}

function build() {
  console.log('\n构建验证中……');
  try {
    const out = execFileSync(HUGO, ['--gc'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const pages = (out.match(/Pages\s*│\s*(\d+)/) || [])[1];
    const total = (out.match(/Total in (\d+ ms)/) || [])[1];
    console.log(`  构建成功：${pages || '?'} 个页面，耗时 ${total || '?'}`);
    return true;
  } catch (e) {
    console.error('  构建失败！');
    console.error((e.stdout || '') + (e.stderr || ''));
    return false;
  }
}

// ---------------- main ----------------
const args = process.argv.slice(2);
const key = (args[0] || '').toLowerCase();
const preview = args.includes('--preview');
const portIdx = args.indexOf('--port');
const port = portIdx >= 0 ? args[portIdx + 1] : '1313';

if (!key || !THEMES[key]) {
  usage();
  process.exit(key ? 1 : 0);
}

console.log(`\n切换到主题：${THEMES[key].label}`);
ensureThemeDir(key);
applyConfig(key);
applyContent(key);

if (!build()) {
  console.log('\n提示：可以用 preview 看一下哪里出问题，或换回原主题。');
  process.exit(1);
}

console.log('\n完成。');
console.log('  本地预览：node switch-theme.cjs ' + key + ' --preview');
console.log('  推上线上：set GITHUB_TOKEN=你的令牌 && node ..\\sync_github.cjs "D:\\我的博客"');
console.log('  注：推送后 GitHub Actions 会自动按 hugo.toml 里的主题重新构建部署，约 1-2 分钟。\n');

if (preview) {
  console.log(`启动本地预览：http://127.0.0.1:${port}/    （按 Ctrl+C 退出）\n`);
  execFileSync(HUGO, ['server', '--port', String(port), '--bind', '127.0.0.1', '--disableFastRender', '--baseURL', `http://127.0.0.1:${port}/`], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}
