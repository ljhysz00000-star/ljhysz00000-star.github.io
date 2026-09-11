/**
 * PaperMod 兼容补丁 —— 修复它在新版 Hugo 上的构建失败。
 *
 * 背景：PaperMod 的 meta 模板里为兼容旧配置保留了 `site.Social.xxx` 的兜底分支，
 * 但 `site.Social` 字段早已被 Hugo 移除，新版 Hugo 遇到它会直接报错。
 * 这里把那些 else 分支整段删掉。
 *
 * 用法：node _theme-scripts/patch-papermod.cjs <主题目录>
 * 例：  node _theme-scripts/patch-papermod.cjs themes/PaperMod
 */
const fs = require('fs');
const path = require('path');

const themeDir = process.argv[2] || 'themes/PaperMod';

const files = [
  'layouts/partials/templates/opengraph.html',
  'layouts/partials/templates/twitter_cards.html',
  'layouts/partials/templates/schema_json.html',
];

let total = 0;

for (const rel of files) {
  const abs = path.join(themeDir, rel);
  if (!fs.existsSync(abs)) {
    console.log('  跳过（文件不存在）:', rel);
    continue;
  }
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  let changed = 0;

  for (let i = 0; i < lines.length; i++) {
    if (!/site\.Social\./.test(lines[i])) continue;

    // 往前找最近的 `{{- else }}`
    let start = -1;
    for (let j = i; j >= 0; j--) {
      const t = lines[j].trim();
      if (t === '{{- else }}' || t === '{{ else }}') { start = j; break; }
      if (t === '{{- end }}' || t === '{{- with site.Params.social }}') break;
    }
    if (start === -1) continue;

    // 往后找第一个 `{{- end }}`（关闭内层 with）
    let end = -1;
    for (let j = i; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t === '{{- end }}' || t === '{{ end }}') { end = j; break; }
    }
    if (end === -1) continue;

    lines.splice(start, end - start + 1);
    changed++;
    i = start;
  }

  if (changed) {
    fs.writeFileSync(abs, lines.join('\n'), 'utf8');
    console.log(`  ${rel}: 删除 ${changed} 处废弃分支`);
    total += changed;
  } else {
    console.log(`  ${rel}: 无需修改`);
  }
}

// 校验：忽略只是提到该字段名的注释行
const left = [];
for (const rel of files) {
  const abs = path.join(themeDir, rel);
  if (!fs.existsSync(abs)) continue;
  const bad = fs
    .readFileSync(abs, 'utf8')
    .split('\n')
    .filter((l) => /site\.Social\./.test(l) && !l.includes('/*'));
  if (bad.length) left.push(`${rel} (${bad.length})`);
}

console.log(`\nPaperMod 补丁完成：共删除 ${total} 处，剩余未清理文件 ${left.length} 个`);
if (left.length) {
  console.error('仍有未清理的引用：' + left.join('、'));
  process.exit(1);
}
