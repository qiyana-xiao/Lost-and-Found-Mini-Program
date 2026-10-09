# 校园失物招领站（Lost and Found Mini Program）

一个面向校园场景的**失物招领微信小程序**，支持失物发布、招领发布、浏览、搜索、留言、认领等核心流程。项目采用**原生小程序开发（TypeScript + WXML/WXSS）**，默认以**本地存储模式**开箱即跑，并已预留**微信云开发**切换能力（含 7 个云函数源码 + 详细上云手册）。

此外，仓库内附带一个 **React + Vite + Tailwind CSS** 的高保真 Web 原型（`项目功能优化与测试/`），用于 UI 验证与功能优化迭代。

---

## 一、项目概览

| 模块 | 目录 | 形态 | 说明 |
|---|---|---|---|
| 小程序本体 | `miniprogram/` | 微信原生小程序 | 生产代码，可直接用微信开发者工具打开运行 |
| 云函数（预留） | `cloudfunctions/` | 微信云开发 | 7 个云函数，接口与本地数据层一一对应，切换即上云 |
| 类型声明 | `typings/` | TypeScript | WXML 全局类型、自定义组件类型等编译提示 |
| Web 原型 | `项目功能优化与测试/` | React + Vite + Tailwind | Figma Make 高保真原型，复刻小程序主要页面，用于 UI / 体验优化 |
| 文档 | `docs/` | Markdown | 技术架构、功能规划、云平台上架手册 |

---

## 二、功能特性

- **首页**：卡片列表（封面 / 标题 / 状态 / 类型 / 分类 / 地点 / 时间 / 浏览量）、类型筛选 Tab（全部 / 我丢的 / 我捡的）、分类横滑筛选、下拉刷新、上拉加载更多、分页（每页 20 条）。
- **搜索**：关键词（标题 / 地点 / 描述模糊匹配）+ 分类组合检索。
- **发布 / 编辑**：类型、标题、分类、地点、时间、描述、最多 3 张图片、联系方式；必填与手机号格式校验；携带 `?id` 进入即编辑；自动按用户隔离保存草稿。
- **详情**：图片轮播、信息卡、浏览量自增、非发布者留言、发布者「标记已认领」、点击复制脱敏联系方式。
- **消息**：留言按条目聚合（全部 / 未读）、未读红点、tabBar 角标、全部已读、点击进详情并标记已读。
- **我的**：个人中心（头像 / 昵称可改）、我的发布（编辑 / 删除，级联清理图片与留言）、统计卡片、消息提醒卡片。
- **登录 / 注册**：游客 / 用户名 + 密码注册 / 登录 / 退出（本机演示，账号数据仅存本机缓存）。
- **图片处理**：压缩 + 本地三级兜底保存（`saveFile` → `copyFile` → 保留临时路径），发布图片默认不依赖任何云服务。
- **演示数据**：首次启动自动写入 5 条演示条目 + 2 条留言，便于直接体验。

> ⚠️ **当前为本地存储模式**：数据全部存于设备本地缓存（`wx.storage`），图片存本机文件目录。**不同设备之间看不到彼此的发布与留言**；账号体系为本机多账号切换演示，非真实跨设备多用户。要实现真实多用户共享，请参考《上架微信云平台操作手册》切换云端。

---

## 三、技术栈

| 维度 | 内容 |
|---|---|
| 小程序 | 微信原生（TypeScript 编译为小程序 JS + WXML + WXSS） |
| 前端 API | 微信小程序基础库 API（`wx.*`） |
| 本地存储 | `wx.storage`（数据）+ 本地用户文件目录（图片） |
| 后端（预留） | 微信云开发：云函数（`wx-server-sdk`）+ 云数据库 + 云存储 |
| Web 原型 | React 19 + Vite 8 + Tailwind CSS v4 + react-router |
| 基础库版本 | 3.17.2（见 `project.config.json`） |

---

## 四、目录结构

```
Lost and Found Mini Program/
├── miniprogram/                 # 小程序前端源码（miniprogramRoot）
│   ├── app.ts                   # 应用入口：onLaunch 初始化、写入演示数据 seedDemo
│   ├── app.json                 # 全局配置：pages 注册、tabBar（首页/消息/搜索/我的）、窗口样式
│   ├── app.wxss                 # 全局样式（主题变量、卡片/标签/按钮/空状态等通用类）
│   ├── sitemap.json             # 索引配置
│   ├── images/                  # 静态资源：tabBar 图标
│   ├── pages/                   # 页面（每页 4 文件：ts/wxml/wxss/json）
│   │   ├── index/               # 首页：列表、筛选、分页、下拉刷新
│   │   ├── search/              # 搜索：关键词 + 分类
│   │   ├── publish/             # 发布 / 编辑：表单 + 图片 + 草稿
│   │   ├── detail/              # 详情：展示、留言、认领、浏览量自增
│   │   ├── mine/                # 我的：个人中心、我的发布、统计、消息提醒
│   │   ├── messages/            # 消息中心：留言聚合、未读、全部已读
│   │   ├── login/               # 登录 / 注册（本机账号演示）
│   │   └── logs/                # 日志（脚手架遗留，可选保留）
│   └── utils/                   # 核心工具层
│       ├── db.ts                # ★ 数据访问层：本地/云端统一接口（切换点）
│       ├── auth.ts              # 身份层：游客/注册/登录/退出，本机缓存
│       ├── upload.ts            # 图片层：压缩 + 本地保存 / 云端上传（切换点）
│       └── util.ts              # 通用工具：分类常量、emoji、脱敏、时间格式
├── cloudfunctions/              # 云函数源码（cloudfunctionRoot，云端模式使用）
│   ├── addItem/                 # 发布条目
│   ├── addMessage/              # 添加留言（含 1 分钟 3 条限流）
│   ├── getList/                 # 列表查询（关键字 + 类型 + 分类 + 分页）
│   ├── getDetail/               # 条目详情 + 留言列表
│   ├── incrementView/           # 浏览量自增
│   ├── closeItem/               # 标记已认领
│   └── deleteItem/              # 删除条目 + 级联删留言
├── typings/                     # 类型声明（TS 编译提示）
│   ├── index.d.ts
│   └── types/                   # WXML 全局类型、自定义组件类型等
├── 项目功能优化与测试/           # Web 高保真原型（React + Vite + Tailwind）
│   ├── src/
│   │   ├── pages/               # Home / Detail / Mine / Publish / Search
│   │   ├── components/          # ItemCard 等复用组件
│   │   ├── app/routes.tsx       # 路由配置
│   │   ├── App.tsx / main.tsx   # 入口
│   │   └── index.css            # 全局样式 + Tailwind v4
│   ├── index.html               # Vite HTML 外壳
│   ├── vite.config.ts           # Vite 配置（React + Tailwind v4 + 别名 @ → src）
│   └── package.json
├── docs/                        # 文档
│   ├── 功能说明与优化规划.md     # 已实现功能、局限分析、优化路线图
│   ├── 技术架构说明.md           # 项目结构、前后端分工、双轨设计
│   └── 上架微信云平台操作手册.md # 本地 → 云开发 + 实时交互 的施工单
├── project.config.json          # 项目配置：appid、miniprogramRoot、cloudfunctionRoot
├── tsconfig.json                # TS 编译配置
└── package.json                 # 小程序依赖（miniprogram-api-typings）
```

---

## 五、快速开始

### 5.1 运行小程序（本地模式，零依赖）

1. 用 **微信开发者工具** 打开项目根目录（`project.config.json` 已配置 `miniprogramRoot` / `cloudfunctionRoot`）。
2. 默认即为本地存储模式，编译即可运行，**无需任何云服务配置**。
3. 首次启动会自动写入演示数据，可直接体验发布、浏览、搜索、留言、认领、消息等流程。

> 当前 `appid` 为 `wxde33bc96c7c66463`（示例），如需真机预览/上架，请替换为你自己的 AppID。

### 5.2 查看 Web 原型

`项目功能优化与测试/` 为一个独立的 React + Vite + Tailwind 前端工程（由 Figma Make 生成）：

```bash
cd 项目功能优化与测试
pnpm install        # 或 npm install
pnpm dev            # 启动 Vite 开发服务器（支持热更新）
```

原型复刻了小程序的核心页面（首页 / 搜索 / 发布 / 详情 / 我的）与 `ItemCard` 组件，用于 UI 走查与交互优化，数据均为前端模拟，不接后端。

---

## 六、架构设计要点

### 6.1 分层设计（页面不直接访问存储）

```
页面层 (pages/*)
   └── 仅调用 ──▶ utils/db.ts   ──▶ 本地(wx.storage) / 云端(wx.cloud.callFunction)
   └── 调用   ──▶ utils/auth.ts ──▶ 本机账号缓存
   └── 调用   ──▶ utils/upload.ts──▶ 本地文件 / 云存储
   └── 调用   ──▶ utils/util.ts ──▶ 纯函数工具
```

- 所有数据读写集中在 `db.ts`，页面只依赖这套稳定接口，不感知底层是云端还是本地。
- 登录态统一收口到 `auth.ts`（取用户标识一律用 `auth.getUid()` / `auth.getUser()`）。
- 图片统一走 `upload.ts`，页面不直接处理文件系统。

### 6.2 双运行模式（本地 ↔ 云端）

切换云端只需改 **3 处**：`app.ts`（环境初始化 + 是否 seedDemo）、`db.ts`（内部实现）、`upload.ts`（图片处理）。页面层零改动。详见《技术架构说明》与《上架微信云平台操作手册》。

### 6.3 数据模型（本地）

- **条目 items**：`{ _id, _openid, type('lost'|'found'), title, category, location, happenTime, description, images, contact, status('open'|'closed'), viewCount, createdAt, updatedAt }`
- **留言 messages**：`{ _id, itemId, _openid, content, contact, createdAt }`
- **本机账号 users**：`{ username, password(hash), nickname, avatar }`
- **已读记录**：`LOSTFOUND_MSG_READ_<uid>` → `{ [itemId]: 已读时间戳 }`（用于消息未读计算）

---

## 七、切换到微信云开发（上云）

当前默认本地模式；要支持**真实多用户、跨设备共享、实时交互**，按《上架微信云平台操作手册》操作即可：

1. 微信公众平台开通云开发、新建环境、建 `items` / `messages` / `read_log` 集合并配置权限。
2. 部署 `cloudfunctions/` 下 7 个已有云函数（云端安装 `wx-server-sdk` 依赖）。
3. 将 `db.ts` / `upload.ts` 内部实现替换为云函数调用与 `wx.cloud.uploadFile`，并在 `app.ts` 初始化云环境。
4. 接入云数据库 `watch` 实现实时刷新；按手册新增 `getMyMessages` / `markRead` 两个云函数处理消息聚合与已读。

---

## 八、文档索引

| 文档 | 内容 |
|---|---|
| [`docs/技术架构说明.md`](docs/技术架构说明.md) | 项目定位、目录结构、前后端架构、数据模型、双模式设计、关键数据流 |
| [`docs/功能说明与优化规划.md`](docs/功能说明与优化规划.md) | 已实现功能清单、核心局限分析、P0–P3 优化路线图、统一改造约定 |
| [`docs/上架微信云平台操作手册.md`](docs/上架微信云平台操作手册.md) | 本地 → 云开发 + 实时交互的具体改动施工单与上架清单 |

---

## 九、优化路线图（简要）

| 优先级 | 方向 | 说明 |
|---|---|---|
| P0 | 切换微信云开发 | 解决真实多用户、跨设备共享、看他人发布 |
| P0 | 实时交互（云数据库 `watch`） | 新发布 / 新留言即时可见 |
| P1 | 消息推送 + 个人中心升级 | 订阅消息提醒、留存提升 |
| P1 | 智能匹配 / 推荐 | 失物招领核心价值：相似度配对 |
| P2 | 搜索增强 / 收藏 / 举报 | 地点时间排序、收藏夹、内容审核 |
| P2 | 内容安全 / 服务端限流 | 接入内容安全 API、服务端频率控制 |
| P3 | 工程化：统一请求层、单元测试 | 可维护性 |

详见 [`docs/功能说明与优化规划.md`](docs/功能说明与优化规划.md)。

---

## 十、开发约定

1. 数据访问只走 `db.ts`；页面不得直接读写 `wx.storage` 或发起网络请求。
2. `db.ts` 函数入参 / 出参尽量保持稳定，扩展字段需向后兼容。
3. 登录态统一收口到 `auth.ts`。
4. 图片统一走 `upload.ts`。
5. 分类 / 常量放 `util.ts`，避免散落。
6. 本地 ↔ 云端切换集中在 `app.ts` / `db.ts` / `upload.ts` 三处，不散落到页面。
