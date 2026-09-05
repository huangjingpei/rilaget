# Sidecar 架构：Python 真实解析接入设计与使用指南

> 状态：已落地并验证（虎牙/抖音/B站真实解析通过，2026-09-01）
> 本文是 `02-ARCHITECTURE-DECISIONS.md` 中 D1 决策（Python 方案接入）的实现文档。

## 1. 总体架构

```
┌────────────────────────────────────────────────────────────┐
│                     Electron 应用（或浏览器 dev）             │
│                                                            │
│  React UI ──► streamParser.ts ──► sidecarClient.ts          │
│                                    │                       │
│              Electron: IPC ────────┤                       │
│              浏览器:   /api/* ── Vite proxy ──┐             │
│                                              │             │
│  Electron 主进程: SidecarProcess ◄────────────┘             │
│  开发期备用:      server/sidecar-server.mjs (:8787)         │
│                   │  stdio JSON Lines                       │
│                   ▼                                         │
│  Python 边车: sidecar/bridge.py                             │
│                   │  import                                 │
│                   ▼                                         │
│  vendored 库: sidecar/StreamGet (ihmily/streamget, MIT)     │
└────────────────────────────────────────────────────────────┘
```

关键设计：

1. **双宿主同契约**：`sidecarClient.ts` 对渲染进程提供统一 API；Electron 内走
   `window.streamget.sidecar.*`（IPC 直达主进程托管的边车），纯浏览器 dev 模式走
   `/api/*`（Vite proxy → `server/sidecar-server.mjs`）。业务代码无感知。
2. **协议隔离**：Python 桥启动时把 fd 1 重定向到 stderr，第三方库任何 `print`
   都污染不了协议通道；stdout 只输出 JSON 行。
3. **可替换内核**：`bridge.py` 里的 `PLATFORM_REGISTRY` 是唯一与 streamget 库
   耦合的地方。将来合并弹幕 Python 项目，只需在桥内新增 `danmaku.start/stop`
   命令和 `danmaku` 事件帧，Node 与前端各加一个透传分支，其余层零改动。

## 2. JSON Lines 协议（stdio）

请求（Node → Python，stdin）：
```json
{"id": "r1", "cmd": "ping"}
{"id": "r2", "cmd": "platforms"}
{"id": "r3", "cmd": "parse", "url": "https://www.huya.com/lpl", "cookies": null, "proxy": null}
```

响应/事件（Python → Node，stdout）：
```json
{"id": "r1", "ok": true, "data": {"pong": true, "version": "4.0.10", "platforms": 26}}
{"id": "r3", "ok": true, "data": {"platformKey": "huya", "anchorName": "…", "isLive": true,
                                  "qualities": [{"id": "OD", "name": "原画 (OD)", "format": "flv", "url": "http://…flv?wsSecret=…"}]}}
{"id": "r4", "ok": false, "error": "链接未匹配到受支持的平台"}
{"event": "log", "level": "info", "message": "[虎牙直播] 开始抓取房间数据: …"}
```

弹幕（预留，未接线）：
```json
{"id": "r5", "cmd": "danmaku.start", "platform": "douyin", "roomId": "…"}
{"event": "danmaku", "roomId": "…", "msg": {"type": "chat", "sender": "…", "content": "…"}}
```

## 3. 已验证的真实解析（2026-09-01）

| 平台 | 房间 | 结果 |
|------|------|------|
| 虎牙 | `huya.com/lpl` | ✅ `isLive: true`，OD/UHD 返回带 `wsSecret` 签名的真实 FLV CDN 地址，主播"虎牙英雄联盟赛事"，标题"JDG 0:1 NIP 2026LPL季后赛" |
| 抖音 | `live.douyin.com/991562466558` | ✅ 全链路含 Node.js x-bogus 签名；返回真实主播名（房间未开播，`qualities` 为空属正常） |
| B站 | `live.bilibili.com/5440` | ✅ 返回真实主播名与房间标题 |
| 快手 | `live.kuaishou.com/u/…` | ⚠️ 上游库对该房间报错（`NoneType … strip`），桥正确回传 `ok:false`，属上游待修问题 |

## 4. 如何运行

```bash
# 浏览器开发模式（UI + HTTP 边车宿主）
npm run dev:full        # = vite(:3000) + sidecar-server(:8787)，前端经 /api 代理访问

# Electron 桌面模式（边车内嵌于主进程，无需 8787）
npm run electron:dev

# 仅启动边车 HTTP 宿主
npm run sidecar
```

首次准备（一次性）：
```bash
pip install -r sidecar/StreamGet/requirements.txt   # Python 3.10+
# 抖音/斗鱼等平台的签名需要 Node.js（本机已有 v22）
```

打包产物说明：`electron-builder` 配置中 `sidecar/**` 会被解包到
`app.asar.unpacked`（Python 无法从 asar 内执行），主进程 `projectRoot()` 已适配。

## 5. 边车生命周期与容错

- Python 探测：`resolvePythonLaunch()` 依次尝试 `python` / `py -3` / `python3`，
  可用 `SIDECAR_PYTHON` 环境变量覆盖（如 `conda run -n xx python`）。
- 崩溃自动重启：指数退避（1s → 10s 封顶），挂起请求按 id 全部拒绝。
- 请求超时：单次 parse 90s（bridge 内）+ 100s（Node 侧），双层保护。
- streamget 库缺失时桥仍可应答 `ping/platforms`（惰性加载），健康检查不误报。
- Electron 退出：先发 `shutdown` 命令再 kill，不留孤儿 Python。

## 6. 弹幕 Python 项目合并路线（下一步）

1. 在 `sidecar/` 放入弹幕项目（如 vendored `sidecar/<danmu-lib>/`）；
2. `bridge.py` 增加 `cmd_danmaku_start/stop`：为每个会话起一个 asyncio 任务，
   把弹幕回调封装成 `{"event": "danmaku", …}` JSON 行写 stdout（与 `emit_log`
   同一写出口，天然线程安全）；
3. `sidecar-process.mjs` 的 `consumeStdout` 把 `event === 'danmaku'` 的帧 emit
   为独立事件（现在 log 事件已是这个模式，照抄即可）；
4. Electron 主进程把 `sidecar:danmaku` IPC 转发给渲染层；浏览器模式经 SSE
   `event: danmaku` 推送；
5. 前端 `scraperService.ts` 删除随机弹幕生成器，改为订阅真实事件流，
   `setTargetRoom` 接上"采集目标选择"UI。

## 7. 已知边界

- 抖音高清流与部分房间需要登录 Cookie（凭据页录入后自动注入 parse）；
- 上游库个别平台偶发解析异常（如快手部分房间），错误已透传到 UI 日志抽屉；
- 流地址有时效（虎牙 `wsTime` 等签名参数），录制前需现取——下载引擎实现时
  必须遵循"启动/恢复录制时重新解析"原则。
