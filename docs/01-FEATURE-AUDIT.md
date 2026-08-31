# StreamGet 功能审计报告：真/假功能清单与开发落地顺序

> 生成时间：2026-09-01
> 更新：文末"开发落地顺序"已被 `02-ARCHITECTURE-DECISIONS.md` 的 v2 路线图（基于架构决策）取代。
> 结论先行：**当前项目是 100% 纯前端交互原型（AI Studio 生成），没有任何一个"真正的"核心功能落地。**
> 所有"引擎"（解析、下载、监控、转播、弹幕）都是浏览器内存里的 `setInterval` 随机数模拟，刷新页面即全部丢失。
> UI 交互层（导航、筛选、分页、弹窗、主题、导出文件）是真实可用的，可以直接保留。

---

## 0. 全局性假功能（跨页面）

| # | 假功能 | 位置 | 现状 |
|---|--------|------|------|
| G1 | 流解析引擎 | `src/services/streamParser.ts` | 纯模拟：随机延迟 450~750ms，按平台返回**硬编码假数据**（假主播名/假标题/假封面 Unsplash 图/假观众数），返回的"直播流地址"全部是 Google 示例视频（BigBuckBunny.mp4 等），不请求任何真实平台 |
| G2 | 下载/录制引擎 | `src/services/downloadEngine.ts` | 纯模拟：`setInterval` 每秒给字节数加随机值，进度/速度/ETA 全是编的；预置 3 条 demo 任务；`filePath` 写的 `C:/StreamGet/Downloads/...` 文件根本不存在；**从不写磁盘**；完成后撒彩带（canvas-confetti）掩盖没有真下载 |
| G3 | 主播开播轮询 | `src/services/anchorService.ts` | 纯模拟：15 秒 interval 随机增减观众数；`isLive` 永不变化，从不检测真实开播状态；预置 5 个假主播（东方甄选、LPL 等） |
| G4 | 扫码登录 | `src/components/browser/EmbeddedBrowserView.tsx:240-257` | "二维码"是 36 个 CSS 方块画的**假二维码**；"模拟扫码"按钮点击后 1.8 秒假装登录成功，写入硬编码 mock Cookie |
| G5 | 内嵌浏览器 | `EmbeddedBrowserView.tsx:341-373` | 没有任何 iframe/webview，主体是一个静态占位提示块，**任何网页都加载不出来**；"一键提取 Cookie"是 alert + 写入一条硬编码假 Cookie |
| G6 | Cookie 校验 | `src/services/cookieService.ts:82-100` | `testCookie()` 是 700ms 延迟 + `长度>25 即有效` 的假校验，且 UI 上没有任何按钮调用它 |
| G7 | MediaMTX 转播 | `src/services/relayService.ts` | 纯模拟：预置一个"运行中"任务，FPS/码率/流量每 2 秒随机波动；启动/停止只是切换状态字段；拉流地址 `127.0.0.1:8888/8889` 本机没有 MediaMTX |
| G8 | PotPlayer 唤起 | `relayService.ts:176-192` | 命令行/deeplink 只是字符串拼接，**从未真正执行**；且拼接的 URL 是网页地址不是流地址，PotPlayer 打开也播不了 |
| G9 | 弹幕采集 | `src/services/scraperService.ts` | 纯模拟：1.8 秒 interval 从预设文案池随机生成假弹幕/假礼物/假点赞；预置假数据（1420 条弹幕、159 万点赞） |
| G10 | 窗口控制 | `src/components/common/HeaderBar.tsx:93-115` | 最小化/关闭按钮**只弹 toast 假装成功**；最大化用浏览器全屏 API 冒充；无托盘、无开机自启 |
| G11 | 数据持久化 | 全部 services | 任务、主播、Cookie、弹幕全在内存，**刷新全丢**；只有 settings 和 theme 写了 localStorage |
| G12 | 桌面壳 | 项目根目录 | `electron/`、`src-tauri/` 目录**不存在**；设置页展示的 Electron/Tauri 代码只是待复制的模板字符串 |
| G13 | FFmpeg / MediaMTX / PotPlayer 进程调用 | 全局 | 完全没有。整个应用没有任何 child_process / IPC / 后端 |
| G14 | AI Studio 遗留物 | `package.json`、`README.md`、`.env.example` | `@google/genai`、`express`、`dotenv` 依赖未使用；README 是 AI Studio 默认模板；`GEMINI_API_KEY` 与本项目无关 |
| G15 | 平台覆盖宣传 | `docs/00-DEVELOPMENT.md` | 文档宣称"40+ 平台"，实际 `src/data/platforms.ts` 只定义了 **17 个**；且只是 URL 识别正则+展示配置，没有一个能真解析 |

---

## 1. 顶栏 HeaderBar（`src/components/common/HeaderBar.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 快速解析输入框 + 解析按钮 | ✅UI真 / ❌内核假 | 能跳转下载页并自动解析，但解析本身是 G1 假解析器 |
| 总速度徽章（含任务数） | ❌假 | 读的是模拟引擎的编造速度 |
| 转播中继状态徽章 | ❌假 | 读的是模拟任务的假状态 |
| 内核日志按钮 + 抽屉 | ✅真 | 日志查看/过滤/复制/清空对内存日志是真实的（但日志内容来自假引擎） |
| 主题切换按钮 | ✅真 | localStorage 持久化，真实生效 |
| 最小化按钮 | ❌假 | 只弹 toast "已最小化至后台托盘"（G10） |
| 最大化/还原按钮 | ⚠️半真 | 用的是浏览器 Fullscreen API，不是窗口最大化 |
| 关闭按钮 | ❌假 | 只弹 toast "已转入后台托盘静默运行"，页面根本不会关（G10） |
| "v2.5 Pro GUI" 版本号 | ❌装饰 | 无意义 |

## 2. 侧边栏 Sidebar（`src/components/common/Sidebar.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 6 个模块导航 + 徽章 | ✅真 | 切换真实生效，徽章计数来自订阅 |
| 底部"开启流媒体试播窗口"按钮 | ❌假 | 播放 BigBuckBunny.mp4 假装直播流（`Sidebar.tsx:181`） |
| 底部"JS 跨平台核心"信息卡 | ❌装饰 | 文案性内容 |

## 3. 下载页 DownloaderView（`src/components/downloader/DownloaderView.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 单链接/批量模式切换 | ✅UI真 | |
| 解析按钮 + 平台自动识别徽标 | ✅UI真 / ❌内核假 | 平台识别是真的（正则匹配），解析结果是假的（G1） |
| 预设测试按钮（7 个平台） | ❌假 | 填入的是 sampleUrls 假链接，解析出假结果 |
| 解析结果卡片（开始录制/试看/取消） | ✅UI真 / ❌内核假 | "开始录制"创建的是模拟任务 |
| **清晰度选择** | ❌UI缺失 | 解析后直接取 `qualities[0]`（`DownloaderView.tsx:87-89`），**界面上没有任何清晰度切换控件**，用户选不了 4K/1080P/仅音频 |
| 批量解析并录制 | ⚠️半真 | 循环调用假解析器；失败项只 `console.error`，**无 UI 反馈**（`DownloaderView.tsx:127`） |
| 任务状态 Tab（全部/进行中/已完成） | ✅真 | 对内存任务真实过滤 |
| 任务搜索框 | ✅真 | |
| 宫格/列表视图切换 | ✅真 | |
| 分页控件 | ✅真 | |
| 列表行内操作（预览/暂停/删除） | ✅UI真 / ❌内核假 | 操作的是模拟任务 |
| DownloadCard：试播/暂停/恢复/停止保存/移除 | ✅UI真 / ❌内核假 | "停止录制并保存"只是改状态字段，磁盘上没有文件 |
| 清除已完成记录 | ✅UI真 | |
| 任务文件路径显示 | ❌假 | `C:/StreamGet/Downloads/...` 是编造的路径 |

## 4. 主播监控页 AnchorManagementView（`src/components/anchors/AnchorManagementView.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 添加主播弹窗（平台/链接/昵称/自动录制） | ✅UI真 / ❌内核假 | 表单能提交，但 `addAnchor` 直接给 `isLive: true` + 随机观众数（`anchorService.ts:148-150`），不解析真实直播间 |
| 搜索 / 状态过滤 / 平台过滤 | ✅真 | |
| 宫格/列表切换 + 分页 | ✅真 | |
| 自动录制开关 | ❌假 | 只改内存标志位，**没有任何代码消费 autoRecord 在开播时触发录制** |
| 立即录制按钮 | ✅UI真 / ❌内核假 | 调假解析器创建模拟任务后跳转下载页 |
| 预览试看（眼睛按钮） | ❌假 | 两处都硬编码播放 BigBuckBunny.mp4（`AnchorManagementView.tsx:332`、`:425`） |
| 取消关注（删除） | ✅UI真 | |
| 底栏"轮询频率: 每 30 秒自动侦测开播" | ❌假 | 写死文字；实际计时是 15 秒且什么都不检测 |
| 开播系统通知（OS Notification） | ❌未实现 | 文档 3.2 承诺，代码里完全没有 |
| 主播级配置（清晰度偏好/录制格式/轮询间隔/Cookie 绑定） | ❌UI缺失 | `MonitoredAnchor` 有这些字段但无编辑入口 |

## 5. 内嵌浏览器与扫码页 EmbeddedBrowserView（`src/components/browser/EmbeddedBrowserView.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 扫码登录-平台选择（5 个平台） | ⚠️UI真 / ❌内核假 | 切换正常，但都对应假二维码 |
| 假二维码图形 | ❌假 | 36 个 CSS 方块（G4），不是真 QR Code |
| "模拟扫码"按钮 | ❌假 | 1.8 秒后假装成功 + 写入硬编码 mock Cookie（`EmbeddedBrowserView.tsx:65-94`） |
| 二维码 120 秒倒计时 | ❌装饰 | 刷新循环，无业务意义 |
| 内嵌浏览器-地址栏/刷新/前往 | ❌假 | 有输入框但没有浏览器内核，主体是静态占位图（G5） |
| "在新窗口打开" | ✅真 | 调系统浏览器打开 |
| "一键提取当前网页 Cookie" | ❌假 | alert + 硬编码假 Cookie（`EmbeddedBrowserView.tsx:355-367`） |
| 凭据库-复制/删除/手动录入 | ⚠️半真 | 内存操作真实，但预置 3 条假 Cookie，无有效期校验（`expiresAt` 写死 2026-12-31），手动添加默认勾选"VIP 极清已解锁" |
| Cookie 有效性测试 | ❌未接线 | `testCookie()` 存在但无 UI 调用，且本身是假校验（G6） |

## 6. 转播页 MediaRelayView（`src/components/relay/MediaRelayView.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| PotPlayer/MediaMTX 模式二选一 | ✅UI真 / ❌内核假 | 切换真实生效，但两种模式都是模拟 |
| 直播源地址/主播名输入 + 应用配置 | ✅UI真 / ❌内核假 | 只存内存 |
| 启动/停止转播按钮 | ❌假 | 只切换 `status` 字段，无任何进程/推流（G7） |
| "LIVE STAGE" 大屏 | ❌假 | 纯动画占位，不是视频画面 |
| FPS/码率/流量/运行时长遥测 | ❌假 | 随机数发生器 |
| 原画预览按钮 | ❌假 | 把网页 URL 直接塞给 `<video>`，根本无法播放（`MediaRelayView.tsx:357`） |
| 弹出纯净捕获视窗 | ⚠️半真 | 弹窗本身真实，但里面是假视频（见 §8） |
| 唤起 PotPlayer（deeplink） | ❌假 | 协议链接拼了假 URL（G8） |
| 复制推流 RTMP / WHEP / M3U8 地址 | ❌假 | 地址是编造的 `127.0.0.1:8888/8889`，本机没有服务 |
| MediaMTX 参数区（协议/转码策略） | ❌装饰 | 写死的展示文案"无损 Direct Passthrough" |
| 推流目标管理 | ❌UI缺失 | service 支持多目标且预置了 B 站 RTMP 目标，UI 上**没有添加/删除/启停目标的界面**；`toggleDestination/addDestination/removeDestination` 是死代码 |
| 伴侣抓取指引三步卡 | ⚠️内容真 | 纯静态教程文案 |

## 7. PotPlayer 捕获窗 PotPlayerCaptureWindow（`src/components/relay/PotPlayerCaptureWindow.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 视频画面 | ❌假 | 硬编码 BigBuckBunny.mp4（`:297`） |
| 宽高比 16:9 / 9:16 / 4:3 切换 | ✅真（CSS 层面） | |
| 绿幕/蓝幕/黑底切换 | ✅真（CSS 背景色） | 真能给伴侣抠像用——但画面是假的 |
| 纯净捕获模式（ESC 退出） | ⚠️半真 | 隐藏控件条真实生效；**ESC 键监听并未实现**，文案说"按 ESC 退出"但没绑键盘事件 |
| 独立视窗（弹出子窗口） | ❌假 | `window.open` 弹出的子窗口里播的还是示例视频（`:71-91`） |
| 复制窗口标题 | ✅真 | |
| 伴侣抓取教程抽屉（4 个 tab） | ⚠️内容真 | 静态文档 |
| 唤起 PotPlayer / 命令行弹窗 / 复制命令 | ❌假 | G8；命令从未执行 |
| "捕获流就绪 60FPS" 状态 | ❌装饰 | 写死 |
| 遥测浮层"画质: 1080P60 原画硬解" | ❌装饰 | 写死 |

## 8. 数据采集页 DataScraperView（`src/components/scraper/DataScraperView.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 暂停/继续采集 | ✅UI真 / ❌内核假 | 停的是假弹幕生成器 |
| **ASS / CSV / JSON 导出** | ✅功能真 / ❌数据假 | 文件生成与下载逻辑完整可用（`scraperService.ts:193-241`）；但内容是假弹幕；且 **ASS 时间轴是 `idx*2` 秒的假对齐**，无法与真实录制视频对齐 |
| 4 个指标卡（观众/弹幕/点赞/收益） | ❌假 | 假数据 + "观众为空时显示 48,290" 的兜底假数（`DataScraperView.tsx:125`） |
| 观众热度趋势柱状图 | ✅渲染真 / ❌数据假 | |
| "当前速率: ~45 条/分" | ❌装饰 | 写死 |
| 弹幕类型过滤（发言/礼物/点赞） | ✅真 | |
| 弹幕搜索 / 分页 / 清空 | ✅真 | |
| **选择采集目标直播间** | ❌UI缺失 | `setTargetRoom()` 存在但无任何 UI 调用（死代码），页面永远显示预置的"东方甄选"假数据 |

## 9. 设置页 SettingsView（`src/components/settings/SettingsView.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 录制文件存放目录（文本框） | ⚠️半真 | 能保存到 localStorage，但无目录选择器，且没有任何引擎读这个路径 |
| 默认容器 / 优先清晰度 | ⚠️半真 | 同上：存了但没消费者 |
| 硬件加速开关 | ❌假 | 存了但无消费者（没有 FFmpeg） |
| 开播轮询间隔 / 并发数 | ❌UI缺失 | 只显示数值，**没有修改控件**（`SettingsView.tsx:217`、`:225`） |
| "关闭窗口最小化至托盘: 已启用" | ❌假 | 写死文字，无开关，无托盘（G10） |
| "开机自动启动: 开机静默常驻" | ❌假 | 写死文字，无开关（G10） |
| 主题切换（Dark/Light） | ✅真 | |
| 打包发布页（Electron/Tauri/package.json 代码 + 复制） | ⚠️半真 | 代码模板本身可用（Electron main.cjs 模板质量不错），但只是"给人复制"，**没有一键生成文件**；`electron/` 目录不存在 |
| AppSettings 中无 UI 的字段 | ❌未接线 | `proxyEnabled/proxyUrl/userAgent/ffmpegPath/mediaMtxUrl/enableSoundAlerts/autoRemuxToMp4/deleteTsAfterRemux/concurrentDownloads/showDanmakuOverlay/autoStartOnBoot/downloadDir` 全部没有界面也没有消费者 |
| 主题 'midnight'/'cyber' | ❌未实现 | 类型定义里存在，实际只有 dark/light |

## 10. 全局播放器弹窗 VideoPlayerModal（`src/components/common/VideoPlayerModal.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 播放/暂停/音量/静音/全屏 | ✅真（对 mp4） | |
| 截图（canvas 截帧下载 PNG） | ✅真 | 跨域视频会被 canvas 污染限制，实际对示例视频能跑 |
| 弹幕 ON/OFF 开关 | ✅UI真 / ❌数据假 | 弹幕是 8 条预设文案随机滚动（`VideoPlayerModal.tsx:46-73`） |
| "流参数"面板（1080P60/H.264/缓冲 4.2s…） | ❌假 | 全部写死，与实际流无关（`VideoPlayerModal.tsx:215-226`） |
| "LIVE 实时流" 徽章 | ❌误导 | 播放的是 mp4 点播文件 |
| 对真实直播流的支持 | ❌缺失 | 原生 `<video>` 不支持 FLV/HLS，接真流后需要 mpegts.js/hls.js |

## 11. 日志抽屉 LogDrawer（`src/components/common/LogDrawer.tsx`）

| 交互元素 | 状态 | 说明 |
|----------|------|------|
| 级别/模块过滤、复制、清空、自动滚动 | ✅真 | |
| 日志内容 | ❌假 | 全部来自模拟引擎的编造输出；构造函数预置"40+ 平台解析器规则库已就绪"等假日志（`logger.ts:11-13`） |

---

## 12. 死代码清单（写了但没有任何 UI 调用）

| 代码 | 位置 |
|------|------|
| `anchorService.toggleLiveStatus()` | `anchorService.ts:178` |
| `scraperService.setTargetRoom()` | `scraperService.ts:162` |
| `cookieService.testCookie()` | `cookieService.ts:82` |
| `relayService.toggleDestination()/addDestination()/removeDestination()` | `relayService.ts:128-161` |
| `DownloadTask.segmentDurationMinutes/segmentsCount/autoRecordWhenLive` 字段 | `types/index.ts:104-106` |
| `AppSettings` 的 proxy/UA/ffmpegPath/mediaMtxUrl/自启/提示音/remux 等字段 | `types/index.ts:217-237` |
| `PlatformInfo.sampleUrls` 之外的大部分平台元数据（icon 字符串等） | `data/platforms.ts` |

---

## 13. 开发落地顺序（建议）

> 原则：先打地基（壳+持久化），再打通一条**最小真链路**（真解析→真下载），然后逐模块把"假"换成"真"。每一步结束时应用都保持可用。

### 阶段 0 · 技术决策与骨架（先行）
1. 确定桌面壳方案：**推荐 Electron**（设置页已有可用模板、webview 抓 Cookie 方便；Tauri 抓 Cookie 要额外写 Rust）。
2. 定架构：UI（现有 React）↔ IPC ↔ 主进程服务层（解析器/下载引擎/FFmpeg 子进程）。
3. 清理 AI Studio 遗留：README、`@google/genai`/`express`/`dotenv` 依赖、`.env.example`、GEMINI 相关配置。

### 阶段 1 · 桌面壳与持久化（G10/G11/G12）
4. 建 `electron/main.cjs`（复用设置页模板）：无边框窗口、托盘常驻、最小化/关闭接真 IPC，替换 HeaderBar 假按钮。
5. 数据层：任务/主播/Cookie 落 SQLite 或 JSON 文件；Cookie 用系统钥匙串或加密存储。
6. 设置页补全：目录选择器、轮询间隔/并发数修改控件、托盘/自启真实开关；让引擎读设置。

### 阶段 2 · 真实流解析器（G1，整个项目的地基）
7. 主进程实现解析器，**先只做抖音 + B站两个平台跑通全链路**，再逐步扩平台（每个平台一个 adapter）。
8. 下载页补清晰度选择控件；"试看"接真实直链。

### 阶段 3 · 真实下载/录制引擎（G2）
9. 集成 FFmpeg（spawn）：真下载/录制、断线重连、分片、remux 到所选容器、真实进度/速度/文件路径。
10. 播放器支持 HLS/FLV（hls.js / mpegts.js），流参数面板读真实流信息。

### 阶段 4 · 主播监控（G3）
11. 复用阶段 2 解析器做真实开播轮询；autoRecord 触发录制任务；OS 系统通知。
12. 补主播级配置编辑（清晰度/格式/间隔/Cookie 绑定）。

### 阶段 5 · 凭据中心（G4/G5/G6）
13. Electron `<webview>`/BrowserView 实现真内嵌浏览器 + 真实 Cookie 提取。
14. 各平台真扫码登录流程（或仅靠 webview 登录取 Cookie）；Cookie 有效性真校验 + 定期检测。

### 阶段 6 · 转播中继（G7/G8）
15. 集成 MediaMTX（托管二进制）+ FFmpeg 推流；拉流地址真实化。
16. PotPlayer 真实启动（child_process 执行命令行）、多推流目标管理 UI（激活死代码）。

### 阶段 7 · 弹幕采集（G9）
17. 各平台弹幕协议接入（建议复用开源实现）；`setTargetRoom` 接 UI（从下载页/主播页选采集目标）。
18. ASS 时间轴对齐录制起始时间，保证导出字幕与视频同步。

### 阶段 8 · 打包与收尾
19. electron-builder 出 Windows/macOS 安装包，FFmpeg/MediaMTX 随包分发、应用图标。
20. 平台覆盖按需扩展（17 → 更多），日志接真实引擎输出，删除所有演示假数据种子。

---

## 附：真功能保留清单（不用重做）

- 主题系统（dark/light + localStorage）
- 全部页面导航、筛选、搜索、分页、双视图、弹窗等 UI 交互
- 弹幕导出的文件生成逻辑（ASS/CSV/JSON）
- 日志查看器、复制到剪贴板
- 播放器基础控制与截图
- 设置的 localStorage 持久化机制
- Electron main.cjs / tauri.conf.json 代码模板（阶段 1 直接可用）
- 平台 URL 识别正则（阶段 2 可作为路由分发的底子）
