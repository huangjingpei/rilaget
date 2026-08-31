# StreamGet 架构决策记录（ADR）与 v2 路线图

> 日期：2026-09-01
> 本文取代 `01-FEATURE-AUDIT.md` 末尾的"开发落地顺序"章节，作为当前有效的执行路线。

## 一、已确认的约束与决策

| # | 决策 | 内容 |
|---|------|------|
| D1 | 解析与弹幕的实现来源 | 使用自有 Python 开源方案（覆盖流解析 + 弹幕），接入方式待最终确认：sidecar 起步 + 按平台评估 JS 移植（见下文权衡） |
| D2 | 凭据体系 | 不做扫码登录、不做凭据库安全加固；不使用大会员 Cookie 解锁高码率。webview 手动登录列为远期可选，不进排期 |
| D3 | FFmpeg / 转播 | 流处理与命令参数设计由 owner（音视频专家）负责；程序侧只负责：子进程生命周期管理、stderr 进度解析、重试调度、IPC 推送、UI 呈现 |
| D4 | 打包发布 | 一次性投入；个人使用 → 不做代码签名 / macOS 公证，SmartScreen 提示可接受 |
| D5 | 产品定位 | 个人自用工具，不对外分发 → 无合规/法务包；单人低频使用，平台风控压力极小；Cookie 本地明文存储可接受 |
| D6 | 桌面壳 | Electron。理由：webview 网络嗅探兜底、child_process 管理 FFmpeg/Python 均需要。**安全基线：`contextIsolation: true` + 最小权限 preload**，不采用 `settingsService.ts` 模板中的 `nodeIntegration:true / webSecurity:false` 配置 |

## 二、Python 方案接入：sidecar vs 全量 JS 移植

### 两条路的真实成本

| 维度 | A. Python Sidecar（子进程/本地服务） | B. 全量移植为 TS |
|------|--------------------------------------|------------------|
| 首次接入成本 | 低：一个 100~200 行的桥（stdio JSON 行或 127.0.0.1 HTTP/WS） | 高：逐平台翻译，签名与 protobuf 细节易错 |
| 上游更新（平台改签名后） | **近零成本**：替换上游文件即可 | **永久负担**：每次上游修复都要人工 diff 重新移植 |
| 运行时 | 双运行时（Node + Python），需管理子进程生命周期 | 单运行时，架构干净 |
| 分发体积 | 需要本机有 Python（个人使用无影响） | 无额外依赖 |
| 调试 | 跨进程，日志分两处看 | 单进程，共享类型 |

### 移植省力的三个关键技术点（无论何时移植都用得上）

1. **签名 JS 片段在 Node 里原生可跑**：这类 Python 方案的签名部分通常是 `execjs` 执行现成的 JS 文件——这部分移植到 Node 反而比 Python 原版更直接；只有"纯 Python 复刻的签名"才需要手工重写或找回原始 JS 版本。
2. **`.proto` 文件可直接复用**：弹幕 protobuf 用 `protobuf.js` 加载同一份 `.proto`；手写二进制协议（虎牙/斗鱼）需要按 wire format 逐字节核对。
3. 其余部分（HTTP 请求组装、Cookie 注入、响应字段提取、WebSocket 收发）是机械翻译，单平台约 1~2 天。

### 结论（建议）

- **先定 `PlatformAdapter` 契约**（parse → ParsedStreamResult；danmaku → 事件流），UI 只依赖契约，不关心背后是 Python 还是 TS。
- **Adapter #1 用 sidecar 实现几天内点亮全链路**：Electron spawn Python 桥进程，解析结果与弹幕事件以 JSON 行通过 stdout 推送，Node 侧经 IPC 广播给渲染层。
- **之后按平台选择性移植**：协议公开且稳定的平台（B站、Twitch）值得移植进 TS；高频变动的平台（抖音、快手）保留 sidecar，吃上游更新。
- 若 owner 坚持一次性全量移植：提供 Python 方案的结构信息（覆盖平台数、签名是 execjs 还是纯 Python、弹幕是否 protobuf、是否 asyncio），即可给出逐平台工作量评估。两种路径不互斥，契约先行保证随时可切换。

## 三、v2 路线图

| 阶段 | 内容 | 产出 |
|------|------|------|
| 0. 壳与契约 | Electron 主进程（contextIsolation + preload IPC 面、托盘、真窗口控制）；`PlatformAdapter` 契约 + Python sidecar 桥；数据持久化（JSON/SQLite，明文可接受）；替换 HeaderBar 假按钮 | 桌面窗口 + 真解析管道打通 |
| 1. 真解析 + 真下载 | 下载页接真解析（删假 seed 数据）；补清晰度选择 UI；FFmpeg 下载引擎（owner 定命令，程序做 spawn/进度/重试/分片/remux）；处理流地址过期→恢复时重解析；播放器接 hls.js/mpegts.js | 核心：粘贴链接→真实录制落盘 |
| 2. 主播监控 | 轮询走真解析；autoRecord 触发录制队列；OS 通知；删 `anchorService` 假轮询与假种子 | 开播守护录制可用 |
| 3. 弹幕与数据页 | sidecar 弹幕事件流接入；补采集目标选择 UI（激活 `setTargetRoom`）；ASS 时间轴对齐录制起点 | 数据看板真实化 |
| 4. 转播 | 先 passthrough（MediaMTX + FFmpeg copy）；PotPlayer 真实 child_process 启动；激活多推流目标管理死代码；转码策略（H.265→H.264/NVENC）由 owner 定 | 转播链路可用 |
| 5. 收尾打包 | electron-builder 单平台（Windows）；随包资源清点；清理 AI Studio 遗留（@google/genai、express、dotenv、README、.env）；全引擎日志接真 | 可日常使用的客户端 |

### 残留风险（收窄后仅剩）
1. 上游同步负担（仅当选择移植路径的平台）；
2. sidecar 进程生命周期（崩溃重启、退出清理）；
3. 直播流地址分钟级过期 → 暂停/恢复与 autoRecord 启录前必须重新解析（引擎设计时内置）；
4. ASS 时间轴与录制起点的时钟对齐（断流重连场景）。

## 四、砍掉/降级的范围（相对文档 00 的原始规格）

- 扫码登录（QR API 对接）→ 取消，webview 手动登录远期可选
- Cookie 保险库加密、有效期校验 → 降级为本地明文 + 手动管理
- 17 个平台全覆盖 → 按上游 Python 方案的成熟度排序，先 3~5 个
- "40+ 平台"宣传目标 → 移除
- 安全加固 / 签名 / 公证 / 合规 → 取消（个人自用）
