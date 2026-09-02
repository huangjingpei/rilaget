#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
StreamGet Python Sidecar Bridge
================================

以"边车进程"方式向 Node/Electron 宿主提供真实直播流解析能力，
内核复用第三方库 ihmily/streamget（MIT，vendored 于 ./StreamGet）。

协议（JSON Lines over stdio，全部 UTF-8）
------------------------------------------
宿主 -> 本进程（stdin，一行一个请求）:
    {"id": "r1", "cmd": "ping"}
    {"id": "r2", "cmd": "platforms"}
    {"id": "r3", "cmd": "parse", "url": "...", "cookies": null, "proxy": null}
    {"id": "r4", "cmd": "shutdown"}

本进程 -> 宿主（stdout，一行一个响应/事件）:
    {"id": "r1", "ok": true, "data": {...}}            # 请求响应（按 id 关联）
    {"id": "r3", "ok": false, "error": "原因"}          # 请求失败
    {"event": "log", "level": "info", "message": "..."} # 异步日志事件（无 id）

stdout 是协议专用通道：启动时把 fd 1 重定向到 stderr，第三方库的
任何 print 都只会落到 stderr，不可能污染协议。

将来合并弹幕 Python 项目时，沿用同一协议增加：
    cmd: danmaku.start / danmaku.stop
    event: danmaku  {"roomId": ..., "msg": {...}}
"""

import asyncio
import json
import os
import re
import sys
import traceback
from pathlib import Path

# ---------------------------------------------------------------- stdio 防污染
_PROTO_FD = os.dup(1)          # 留住真正的 stdout 句柄，仅供协议写出
os.dup2(2, 1)                  # fd 1 -> stderr：C 层/print 输出全部改道
sys.stdout = sys.stderr        # Python 层同样改道
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(errors="replace")  # Windows GBK 控制台遇特殊字符不崩溃
    except Exception:
        pass


def send(obj: dict) -> None:
    try:
        os.write(_PROTO_FD, (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8"))
    except OSError:
        pass  # 宿主已关闭管道，进程即将退出


def emit_log(level: str, message: str) -> None:
    send({"event": "log", "level": level, "message": message})


# ---------------------------------------------------------------- 引入解析内核
_LIB_DIR = Path(__file__).resolve().parent / "StreamGet"
sys.path.insert(0, str(_LIB_DIR))

import streamget  # noqa: E402

QUALITY_ORDER = ["OD", "UHD", "HD", "SD", "LD"]
QUALITY_LABEL = {"OD": "原画", "UHD": "超清", "HD": "高清", "SD": "标清", "LD": "流畅"}

# (前端平台 key, 中文名, URL 正则, streamget 类名)
PLATFORM_REGISTRY = [
    ("douyin",     "抖音",     r"douyin\.com",                          "DouyinLiveStream"),
    ("tiktok",     "TikTok",   r"tiktok\.com",                          "TikTokLiveStream"),
    ("kuaishou",   "快手",     r"kuaishou\.com",                        "KwaiLiveStream"),
    ("bilibili",   "哔哩哔哩", r"bilibili\.com|b23\.tv",                "BilibiliLiveStream"),
    ("huya",       "虎牙直播", r"huya\.com",                            "HuyaLiveStream"),
    ("douyu",      "斗鱼直播", r"douyu\.com",                           "DouyuLiveStream"),
    ("xiaohongshu", "小红书",  r"xiaohongshu\.com|xhslink\.com",        "RedNoteLiveStream"),
    ("youtube",    "YouTube",  r"youtube\.com|youtu\.be",               "YoutubeLiveStream"),
    ("twitch",     "Twitch",   r"twitch\.tv",                           "TwitchLiveStream"),
    ("weibo",      "微博直播", r"weibo\.(?:com|cn)",                    "WeiboLiveStream"),
    ("acfun",      "AcFun",    r"acfun\.cn",                            "AcfunLiveStream"),
    ("inke",       "映客直播", r"inke\.cn",                             "InkeLiveStream"),
    ("yy",         "YY直播",   r"yy\.com",                              "YYLiveStream"),
    ("chzzk",      "CHZZK",    r"chzzk\.naver\.com",                    "ChzzkLiveStream"),
    ("soop",       "SOOP",     r"sooplive\.co\.kr|afreecatv\.com",      "SoopLiveStream"),
    ("pandatv",    "PandaTV",  r"panda\.tv",                            "PandaLiveStream"),
    ("shopee",     "Shopee",   r"shopee",                               "ShopeeLiveStream"),
    ("taobao",     "淘宝直播", r"taobao\.com",                          "TaobaoLiveStream"),
    ("jd",         "京东直播", r"jd\.com",                              "JDLiveStream"),
    ("zhihu",      "知乎直播", r"zhihu\.com",                           "ZhihuLiveStream"),
    ("netease",    "网易CC",   r"cc\.163\.com",                         "NeteaseLiveStream"),
    ("kugou",      "酷狗直播", r"kugou\.com|fanxing\.com",              "KugouLiveStream"),
    ("bigo",       "Bigo Live", r"bigo\.tv",                            "BigoLiveStream"),
    ("baidu",      "百度直播", r"live\.baidu\.com",                     "BaiduLiveStream"),
    ("sixroom",    "六间房",   r"6\.cn|sixroom\.com",                   "SixRoomLiveStream"),
    ("huajiao",    "花椒直播", r"huajiao\.com",                         "HuajiaoLiveStream"),
]


def match_platform(url: str):
    low = url.lower()
    for key, label, pattern, cls_name in PLATFORM_REGISTRY:
        if re.search(pattern, low):
            return key, label, cls_name
    return None


def _instantiate(cls, proxy, cookies):
    try:
        return cls(proxy_addr=proxy, cookies=cookies)
    except TypeError:
        return cls()


async def _probe_quality(live, web_data, quality):
    res = await live.fetch_stream_url(web_data, quality)
    if res is None:
        return None
    return res if isinstance(res, dict) else dict(getattr(res, "__dict__", {}))


# ---------------------------------------------------------------- 命令实现
async def cmd_ping(_req):
    return {
        "pong": True,
        "version": getattr(streamget, "__version__", "unknown"),
        "python": sys.version.split()[0],
        "platforms": len(PLATFORM_REGISTRY),
    }


async def cmd_platforms(_req):
    return [
        {"key": key, "label": label, "class": cls, "available": hasattr(streamget, cls)}
        for key, label, _pattern, cls in PLATFORM_REGISTRY
    ]


async def cmd_parse(req):
    url = str(req.get("url") or "").strip()
    if not url:
        raise ValueError("缺少 url 参数")

    matched = match_platform(url)
    if not matched:
        raise ValueError(
            "链接未匹配到受支持的平台。支持: "
            + ", ".join(f"{label}" for _k, label, _p, _c in PLATFORM_REGISTRY)
        )
    key, label, cls_name = matched
    cls = getattr(streamget, cls_name, None)
    if cls is None:
        raise RuntimeError(f"streamget 缺少平台类 {cls_name}")

    live = _instantiate(cls, req.get("proxy") or None, req.get("cookies") or None)
    emit_log("info", f"[{label}] 开始抓取房间数据: {url}")

    web_data = await live.fetch_web_stream_data(url)
    if web_data is None:
        raise RuntimeError(f"[{label}] 解析返回空（接口无数据、未开播或网络异常）")
    if not isinstance(web_data, dict):
        web_data = dict(getattr(web_data, "__dict__", {}))

    first = await _probe_quality(live, web_data, "OD")
    is_live = bool(first and first.get("is_live"))

    anchor = str((first or {}).get("anchor_name") or web_data.get("anchor_name") or "未知主播")
    title = str((first or {}).get("title") or web_data.get("title") or f"{label} 直播间")
    emit_log(
        "success" if is_live else "warn",
        f"[{label}] {anchor} · {'直播中' if is_live else '未开播'} · {title[:40]}",
    )

    qualities = []
    seen_urls = set()
    if is_live:
        for q in QUALITY_ORDER:
            try:
                d = first if q == "OD" else await _probe_quality(live, web_data, q)
            except Exception as exc:
                emit_log("debug", f"[{label}] 画质 {q} 探测失败: {exc}")
                continue
            if not d or not d.get("is_live"):
                continue
            u = d.get("record_url") or d.get("flv_url") or d.get("m3u8_url") or ""
            if not u or u in seen_urls:
                continue
            seen_urls.add(u)
            fmt = "flv" if (u == d.get("flv_url") or ".flv" in u.lower()) else "m3u8"
            qualities.append({
                "id": q,
                "name": f"{QUALITY_LABEL[q]} ({q})",
                "format": fmt,
                "url": u,
            })

    new_cookies = (first or {}).get("new_cookies") or None
    if new_cookies:
        emit_log("info", f"[{label}] 平台轮换了 Cookie，已回传宿主（长度 {len(new_cookies)}）")

    return {
        "platformKey": key,
        "platform": (first or {}).get("platform") or label,
        "anchorName": anchor,
        "title": title,
        "isLive": is_live,
        "liveUrl": (first or {}).get("live_url") or url,
        "qualities": qualities,
        "newCookies": new_cookies,
    }


COMMANDS = {"ping": cmd_ping, "platforms": cmd_platforms, "parse": cmd_parse}
PARSE_TIMEOUT_S = 90


def main() -> int:
    emit_log(
        "info",
        f"bridge 就绪: streamget v{getattr(streamget, '__version__', '?')} "
        f"/ python {sys.version.split()[0]} / {len(PLATFORM_REGISTRY)} 平台",
    )
    while True:
        line = sys.stdin.readline()
        if not line:  # 宿主关闭 stdin
            return 0
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            emit_log("warn", f"丢弃无法解析的请求行: {line[:120]}")
            continue

        rid = req.get("id")
        cmd = req.get("cmd")
        try:
            if cmd == "shutdown":
                send({"id": rid, "ok": True, "data": None})
                return 0
            handler = COMMANDS.get(cmd)
            if handler is None:
                raise ValueError(f"未知命令: {cmd}")
            data = asyncio.run(asyncio.wait_for(handler(req), timeout=PARSE_TIMEOUT_S))
            send({"id": rid, "ok": True, "data": data})
        except asyncio.TimeoutError:
            send({"id": rid, "ok": False, "error": f"命令超时 ({PARSE_TIMEOUT_S}s): {cmd}"})
        except Exception as exc:
            msg = str(exc) or exc.__class__.__name__
            emit_log("error", f"cmd={cmd} 失败: {msg}")
            traceback.print_exc()
            send({"id": rid, "ok": False, "error": msg})


if __name__ == "__main__":
    sys.exit(main())
