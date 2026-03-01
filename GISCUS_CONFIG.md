# Giscus 评论系统配置指南

## 📋 前提条件

1. 你的 GitHub 仓库必须是 **公开的**（public）
2. 仓库已启用 **Discussions** 功能

## 🔧 配置步骤

### 步骤 1：启用 GitHub Discussions

1. 进入你的仓库：https://github.com/QinIndexCode/myGitBlog
2. 点击顶部导航栏的 **Settings**
3. 找到 **Features** 区域
4. 勾选 **Discussions** 复选框

### 步骤 2：选择 Discussion Category

使用现有的 **💬 General** 分类即可（不需要创建新分类，也不需要重命名）

直接点击 **choose a different category** 可以看到可用的分类列表，选择 **💬 General** 即可。

### 步骤 3：获取 Repository ID 和 Category ID

#### 方法一：使用 Giscus 官网配置工具（最简单）

1. 访问 https://giscus.app/zh-CN
2. 向下滚动到 **配置** 部分
3. 填写以下信息：
   - **仓库**: QinIndexCode/myGitBlog
   - **Announcements** 选择：💬 General
4. 向下滚动到 **📜 代码** 部分
5. 复制生成的配置代码中的两个关键值：
   - `data-repo-id="R_kgDO..."` ← 这就是你的 Repository ID
   - `data-category-id="DIC_kwDO..."` ← 这就是你的 Category ID

#### 方法二：通过 GitHub 页面获取

**获取 Repository ID:**

打开浏览器访问：https://api.github.com/repos/QinIndexCode/myGitBlog

在返回的 JSON 中找到 `node_id` 字段，例如：
```json
{
  "node_id": "R_kgDOxxxxxxxxxx",
  ...
}
```

**获取 Category ID:**

1. 访问 https://github.com/QinIndexCode/myGitBlog/discussions
2. 按 F12 打开开发者工具
3. 点击 **Network** 标签
4. 刷新页面
5. 找到名为 `discussions` 的请求
6. 在响应中查找 `discussionCategories` → `nodes` → `id`
7. 找到 name 为 "General" 的分类，其 `id` 就是 Category ID（格式如 `DIC_kwDO...`）

### 步骤 4：更新 blogs.html 配置

找到 `blogs.html` 中的 Giscus 配置部分（约第 245-260 行），更新以下参数：

```html
<script src="https://giscus.app/client.js"
    data-repo="QinIndexCode/myGitBlog"
    data-repo-id="你的 Repository ID"
    data-category="General"
    data-category-id="你的 Category ID"
    data-mapping="specific"
    data-term="${discussionId}"
    data-strict="1"
    data-reactions-enabled="1"
    data-emit-metadata="0"
    data-input-position="top"
    data-theme="preferred_color_scheme"
    data-lang="zh-CN"
    data-loading="lazy"
    crossorigin="anonymous"
    async>
</script>
```

### 步骤 5：测试

1. 提交更改到 GitHub
2. 等待 GitHub Pages 部署完成
3. 打开任意一篇博客文章
4. 滚动到页面底部，应该能看到评论框

## 🎨 高级配置

### 主题配置说明

- `preferred_color_scheme`: 自动跟随系统/网站主题（推荐）
- `light`: 始终使用浅色主题
- `dark`: 始终使用深色主题
- `transparent_dark`: 透明深色主题

### 评论映射方式

- `specific`: 使用 `data-term` 指定的唯一标识（推荐）
- `pathname`: 使用页面 URL 路径
- `url`: 使用完整 URL
- `title`: 使用页面标题
- `og:title`: 使用 Open Graph title

### 其他配置项

```javascript
data-strict="1"              // 严格模式，确保 discussion 标题匹配
data-reactions-enabled="1"   // 启用评论表情反应
data-emit-metadata="0"       // 不发送元数据到父窗口
data-input-position="top"    // 评论输入框在顶部
```

## 📱 功能特性

### 评论功能
- ✅ 发布评论（支持 Markdown）
- ✅ 上传图片（拖拽或粘贴）
- ✅ 插入链接
- ✅ 回复特定评论
- ✅ 编辑自己的评论
- ✅ 删除自己的评论

### 表情反应
- ✅ 对文章点赞（❤️ 👍 👎 😄 🎉 🚀）
- ✅ 对评论点赞

### 通知功能
- ✅ 评论回复时 GitHub 通知
- ✅ 被提及时 GitHub 通知

## ⚠️ 注意事项

1. **评论者需要 GitHub 账号**：所有评论者必须登录 GitHub
2. **仓库必须公开**：Giscus 不支持私有仓库（免费计划）
3. **首次评论创建 Discussion**：第一条评论会自动创建对应的 Discussion
4. ** moderating 评论**：可以通过 GitHub Discussions 管理评论

## 🔍 故障排查

### 评论不显示

1. 检查 Repository ID 和 Category ID 是否正确
2. 确认 Discussions 功能已启用
3. 检查浏览器控制台是否有错误信息

### 主题不匹配

确保 `data-theme` 设置为 `preferred_color_scheme`，Giscus 会自动检测网站主题。

### 跨域问题

如果遇到跨域错误，确保：
1. 网站使用 HTTPS
2. Giscus 脚本添加 `crossorigin="anonymous"`

## 📚 相关资源

- [Giscus 官方文档](https://giscus.app/zh-CN)
- [Giscus GitHub 仓库](https://github.com/giscus/giscus)
- [GitHub Discussions 文档](https://docs.github.com/en/discussions)

## 🎯 下一步

配置完成后，你可以：
1. 在博客文章底部看到评论区域
2. 使用点赞功能统计文章受欢迎程度
3. 与读者进行互动交流
4. 通过 GitHub Discussions 管理所有评论

---

**作者**: QinIndexCode  
**更新日期**: 2026-03-01
