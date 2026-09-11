# 我的博客

基于 [Hugo](https://gohugo.io/) + [FixIt](https://github.com/hugo-fixit/FixIt) 主题搭建的个人博客。

## 本地预览

```bash
# 1. 下载主题（首次）
mkdir -p themes
curl -L -o /tmp/fixit.tar.gz https://github.com/hugo-fixit/FixIt/archive/refs/tags/v0.4.5.tar.gz
tar -xzf /tmp/fixit.tar.gz -C /tmp && mv /tmp/FixIt-0.4.5 themes/FixIt

# 2. 启动本地服务
hugo server -D
```

打开 http://localhost:1313

## 写新文章

```bash
hugo new posts/文章标题.md
```

然后编辑 `content/posts/文章标题.md`，把 `draft` 改为 `false` 即可发布。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages。

访问地址：https://ljhysz00000-star.github.io
