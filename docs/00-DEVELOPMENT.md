# StreamGet 跨平台视频与直播录制桌面客户端 - 开发与架构设计文档

---

## 1. 项目概述 (Project Overview)

**StreamGet GUI** 是一款面向专业创作者、直播运营人员、录播切片组和开发者的现代化跨平台直播流录制、视频解析下载及转播中继客户端。系统采用 React 18 + TypeScript + Tailwind CSS 构建高响应、无滚动条沉浸式桌面 UI，同时支持通过 Electron / Tauri 原生打包为 Windows、macOS 和 Linux 独立桌面应用。

### 核心定位
- **多平台聚合采集**：支持主流 40+ 平台（抖音、快手、B站、小红书、TikTok、YouTube、Twitch、虎牙、斗鱼等）直播流与短视频解析。
- **开播自动守护录制**：支持主播开播状态周期性轮询与自动开播触发无损切片录制（TS/MP4/FLV/MKV）。
- **极清凭据鉴权管理**：内置扫码登录与内嵌 Webview 会话提取，一键注入 VIP / 大会员 Cookie，解锁原画 4K 60FPS 极清码率。
- **二合一转播中继方案**：
  - **MediaMTX 方案**：内置 RTMP / WebRTC / HLS 低延迟本地流媒体转发。
  - **PotPlayer + 直播伴侣方案**：一键生成无边框、置顶播放命令或 DeepLink，供抖音伴侣 / 快手伴侣 / OBS 窗口抓取及绿幕抠像。
- **实时互动数据采集**：同步捕获弹幕、打赏礼物、点赞及在线人数热度趋势，支持导出 ASS / CSV / JSON 格式。
- **桌面原生体验**：固定宽高单屏视口（Zero Scrollbar）、双主题切换（Dark / Light）、系统托盘最小化、开机自启。

---

## 2. 系统整体架构 (System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        StreamGet 桌面客户端 UI 层                       │
│  (React 18 + TypeScript + Tailwind CSS + Lucide Icons + 响应式布局)     │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────────┤
│ 视频下载管理 │ 主播开播监控 │ 扫码凭据中心 │ 视频转播中继 │ 数据看板与采集 │
├─────────────┴─────────────┴─────────────┴─────────────┴────────────────┤
│                        核心服务与业务逻辑层 (Services)                  │
│  ┌───────────────────────┐  ┌───────────────────────┐                 │
│  │    downloadEngine     │  │     anchorService     │                 │
│  │ (并发调度/格式封装/重试) │  │ (开播轮询/开播自启录制)│                 │
│  └───────────────────────┘  └───────────────────────┘                 │
│  ┌───────────────────────┐  ┌───────────────────────┐                 │
│  │     cookieService     │  │     relayService      │                 │
│  │ (凭据安全库/QR扫码同步)│  │(MediaMTX/PotPlayer捕获)│                 │
│  └───────────────────────┘  └───────────────────────┘                 │
│  ┌───────────────────────┐  ┌───────────────────────┐                 │
│  │    scraperService     │  │    settingsService    │                 │
│  │(弹幕捕获/导出ASS/CSV) │  │ (全局配置/Electron打包)│                 │
│  └───────────────────────┘  └───────────────────────┘                 │
├────────────────────────────────────────────────────────────────────────┤
│                       桌面适配与底层运行层 (Native Runtime)              │
│  - Electron (Chromium + Node.js) / Tauri (Rust + Webview2)             │
│  - FFmpeg (流解封装/无损合并/Remux)                                    │
│  - MediaMTX (本地 RTSP/RTMP/WebRTC 流媒体分发)                         │
│  - PotPlayer / OBS / 直播伴侣 (无边框桌面捕获与推流)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 功能模块详细设计 (Module Specifications)

### 3.1 视频下载与直播录制引擎 (Downloader Engine)
- **输入支持**：单条/批量链接粘贴、短链自动重定向解析、短视频及直播间地址智能识别。
- **质量选择**：原画 4K/2K 超高清、1080P 60FPS 蓝光、720P 高清、仅音频（M4A/MP3）。
- **任务并发控制**：基于任务队列调度，支持设置最大并发数（1-8 路并发）、单任务暂停/恢复、失败指数退避自动重连。
- **视图支持**：
  - **列表视图 (Compact List)**：高密度显示下载速度、已录大小、耗时、实时码率与状态。
  - **宫格视图 (Card Grid)**：显示主播头像/视频封面、进度环与操作卡片。
- **分页机制**：固定视窗高度，列表与卡片模式内置精确分页控件（每页固定 5/6 个任务），彻底杜绝全局滚动条。

### 3.2 主播开播监控与守护录制 (Anchor Monitoring & Auto-Recorder)
- **监控轮询**：可配置定时轮询间隔（15s / 30s / 60s / 120s）。
- **开播动作**：
  - **自动触发录制 (Auto Record)**：检测到上线后立即拉起后台下载任务。
  - **开播系统通知 (OS Notification)**：弹窗或气泡提醒主播已开播。
- **状态流转**：`idle (未开播)` -> `monitoring (轮询中)` -> `live (直播中)` -> `recording (录制中)`。
- **视图与分页**：支持列表/卡片双视图，支持按平台过滤（全部/抖音/快手/B站/小红书等）并提供上一页/下一页翻页。

### 3.3 内嵌浏览器与扫码凭据中心 (Credential & Browser Hub)
- **QR Code 扫码鉴权**：
  - 针对抖音、B站、快手、小红书、TikTok 提供模拟与真机扫码工作流。
  - 扫码授权成功后自动抽取 `sessionid`、`SESSDATA`、`ttwid`、`passport_csrf_token` 等核心凭据。
- **凭据保险库 (Cookie Vault)**：
  - 集中管理各平台 Cookie，标注 VIP/大会员状态，支持一键复制与更新。
  - 支持手动录入自定义 Cookie 字符串。
- **内嵌 Webview 会话**：在桌面环境中利用隔离会话访问任意直播间，免去跨域限制并即时捕获当前请求头。

### 3.4 视频转播与伴侣捕获中继 (Live Relay & Companion Capture)
- **单核心任务模式**：转播模块采用单一任务聚焦设计，避免多重任务混乱。
- **两大方案互斥二选一**：
  1. **MediaMTX 本地流转发方案**：
     - 将源直播流转封装为本地 RTMP / HLS / WebRTC。
     - 支持添加多路推流目标（如 B站直播、快手推流等 RTMP 地址与推流码）。
  2. **PotPlayer + 直播伴侣窗口捕获方案**：
     - **极简无损**：无需二次转码，直出原生画质给播放器。
     - **定制参数**：自动生成 `/topmost`（置顶）、`/no-border`（无边框）、`/aspect=16:9` 或 `/aspect=9:16` 参数。
     - **一键唤起**：提供原生命令行参数及 `potplayer://` DeepLink 一键唤起。
     - **伴侣集成向导**：提供抖音直播伴侣、快手伴侣、OBS 的【添加窗口捕获】与【绿幕/蓝幕透明抠像】步骤指南。

### 3.5 实时互动与弹幕数据采集 (Danmaku & Data Scraper)
- **实时数据流**：监听并捕获直播间观众发言（chat）、礼物打赏（gift）、点赞（like）事件。
- **数据指标看板**：实时在线人数、累计捕获弹幕条数、总点赞量、礼物打赏折算收益。
- **观众趋势图**：柱状图直观反映直播间热度起伏变化。
- **多格式导出**：
  - **ASS 字幕文件**：带精确时间轴，可直接挂载到录制视频上播放。
  - **CSV 表格文件**：供 Excel / 数据分析工具做用户互动画像分析。
  - **JSON 原始日志**：保留完整结构化元数据供二次开发。

### 3.6 系统参数与桌面打包发布 (Settings & Packaging)
- **存储与格式**：自定义下载存放目录、默认封装容器（MP4/TS/FLV/MKV）、首选清晰度。
- **性能选项**：开启/关闭 GPU 硬件编解码加速（NVENC / QSV / VideoToolbox）。
- **主题外观**：深色暗黑（Dark）与明亮纯净（Light）双主题即时切换。
- **桌面发布代码生成**：
  - `electron/main.cjs` 完整生产级脚本（托盘常驻、单实例锁定、快捷键、无边框视窗控制）。
  - `src-tauri/tauri.conf.json` Tauri 2.0 配置文件。
  - `package.json` 构建与跨平台打包脚本（Windows x64 / macOS arm64）。

---

## 4. 目录结构规范 (Directory Structure)

```
rilaget-desktop/
├── public/                     # 静态图标与资源
├── src/
│   ├── components/             # 页面与业务组件
│   │   ├── anchors/            # 主播监控管理 (AnchorManagementView.tsx)
│   │   ├── browser/            # 内嵌浏览器与扫码 (EmbeddedBrowserView.tsx)
│   │   ├── common/             # 顶部栏、侧边栏、状态栏、通知 (HeaderBar, Sidebar, WindowControls)
│   │   ├── downloader/         # 视频下载与录制主页 (DownloaderView.tsx)
│   │   ├── relay/              # 转播中继与 PotPlayer 捕获 (MediaRelayView, PotPlayerCaptureWindow)
│   │   ├── scraper/            # 弹幕采集与数据看板 (DataScraperView.tsx)
│   │   └── settings/           # 系统设置与打包指南 (SettingsView.tsx)
│   ├── data/                   # 平台定义与静态配置 (platforms.ts)
│   ├── services/               # 核心业务引擎与状态订阅
│   │   ├── anchorService.ts    # 主播轮询与开播自启服务
│   │   ├── cookieService.ts    # 凭据存储与鉴权服务
│   │   ├── downloadEngine.ts   # 下载调度与录制引擎
│   │   ├── logger.ts           # 运行日志系统
│   │   ├── relayService.ts     # MediaMTX & PotPlayer 中继服务
│   │   ├── scraperService.ts   # 弹幕解析与导出服务
│   │   ├── settingsService.ts  # 系统配置与代码模板
│   │   └── themeService.ts     # 主题管理服务
│   ├── types/                  # 全局 TypeScript 类型定义 (index.ts)
│   ├── App.tsx                 # 根组件与视图切换
│   ├── main.tsx                # 应用入口
│   └── index.css               # Tailwind CSS 根样式与无滚动条规范
├── electron/                   # Electron 桌面端原生代码
│   └── main.cjs                # Electron 主进程 (窗口、托盘、快捷键)
├── metadata.json               # 应用元数据
├── package.json                # 项目依赖与打包构建命令
├── tsconfig.json               # TypeScript 配置
└── vite.config.ts              # Vite 打包配置
```

---

## 5. 本地开发与桌面端打包指南 (Build & Packaging Guide)

### 5.1 本地 Web 端开发调试
```bash
# 安装依赖
npm install

# 启动开发服务器 (端口 3000)
npm run dev

# 类型检查与 Lint
npm run lint

# 生产环境前端构建
npm run build
```

### 5.2 打包为 Electron 桌面应用 (Windows / macOS)
1. **安装 Electron 依赖**：
   ```bash
   npm install --save-dev electron electron-builder concurrently wait-on
   ```
2. **本地启动 Electron 开发模式**：
   ```bash
   npm run electron:dev
   ```
3. **打包 Windows 客户端 (.exe 安装包 / 便携版)**：
   ```bash
   npm run electron:build:win
   ```
4. **打包 macOS 客户端 (.dmg / .app)**：
   ```bash
   npm run electron:build:mac
   ```

### 5.3 打包为 Tauri 轻量客户端 (可选)
1. **安装 Tauri CLI**：
   ```bash
   npm install --save-dev @tauri-apps/cli
   ```
2. **初始化并构建**：
   ```bash
   cargo tauri dev
   cargo tauri build
   ```

---

## 6. 后续迭代规划 (Roadmap)

1. **多音轨与多画质同时分流录制**：支持在主播提供不同分辨率流时同时抓取原画与 1080P 双版本。
2. **AI 智能高光切片提取**：基于弹幕峰值频率及音频音量检测，自动定位直播精彩高潮并生成短视频切片。
3. **云端 Webhook 与通知推送**：支持接入钉钉机器人、企业微信、Telegram Bot 推送开播与录制完成事件。
4. **自动上传与转存**：录制完成后自动调用 B站投递接口或阿里云盘/百度网盘 WebDAV 进行自动备份。
