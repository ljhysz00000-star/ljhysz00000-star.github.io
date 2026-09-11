---
title: "本站功能巡览"
date: 2026-09-12T02:00:00+08:00
lastmod: 2026-09-12T02:00:00+08:00
draft: false
tags: ["Hugo", "FixIt", "演示"]
categories: ["技术"]
collections: ["博客搭建"]
---

这篇不是正文，是一张**功能清单**——用来展示这个博客打开全部开关之后，到底能做什么。

## 提示框（Admonition）

{{< admonition type=tip title="这是一个提示" open=true >}}
提示框有十几种类型，`tip`、`note`、`warning`、`danger`、`success`、`question`、`example`…… 每一种配色不同。
{{< /admonition >}}

{{< admonition type=warning title="这是一个警告" >}}
写文章时如果引用了可能过期的事实，可以用这个提醒自己。
{{< /admonition >}}

{{< admonition type=success title="这是一个成功提示" >}}
也可以折叠起来，默认不展开。
{{< /admonition >}}

## 标签页

{{< tabs defaultTab="0" type="card" >}}
{{% tab title="Markdown" %}}
标准的 **粗体**、*斜体*、~~删除线~~、`行内代码`、[链接](https://gohugo.io/)、脚注[^1]。

[^1]: 这是脚注内容，鼠标悬停会有提示。
{{% /tab %}}
{{% tab title="代码块" %}}
代码块自带行号、复制按钮、下载按钮、全屏按钮、换行开关：

```go {title="main.go" maxShownLines=8}
package main

import "fmt"

func main() {
	for i := 1; i <= 3; i++ {
		fmt.Printf("第 %d 次循环\n", i)
	}
	fmt.Println("你好，世界")
}
```
{{% /tab %}}
{{% tab title="数学公式" %}}
行内公式 $E = mc^2$，块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
{{% /tab %}}
{{< /tabs >}}

## 折叠面板

{{< details summary="点开看一段废话" open=false >}}
里面可以是任何内容，包括列表、代码、图片。

- 条目一
- 条目二
{{< /details >}}

## 任务列表与表格

- [x] 打开主题的全部开关
- [x] 加上搜索、归档、标签云
- [x] 让图片支持点击放大
- [ ] 开通评论区（需要外部服务授权）

| 能力 | 依赖 | 状态 |
|---|---|---|
| 站内搜索 | 无（本地索引） | 已开 |
| 访问统计 | 无（免费服务） | 已开 |
| 评论 | 需要 GitHub 授权 | 待定 |
| 照片墙 | 需要自建一个内容区 | 待定 |

## 图片与灯箱

正文里的图片可以直接点击放大。下面这张是站点的图标：

![站点图标](/icon-512.png "站点图标")

## 流程图

{{< mermaid >}}
graph LR
  A[写 Markdown] --> B[Hugo 构建]
  B --> C[GitHub Actions]
  C --> D[网站上线]
{{< /mermaid >}}

## 站点结构

{{< file-tree path="content" level=2 />}}

## 引用

> 能做和做得好，是两件事。
>
> ——某个凌晨四点还在配主题的人

---

上面这些全部是**主题自带**的能力，写文章时按语法调用即可。下一篇可以试试照片墙和视频区。
