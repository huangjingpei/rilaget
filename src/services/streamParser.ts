import { detectPlatformFromUrl } from '../data/platforms';
import { ParsedStreamResult, PlatformId, StreamQuality } from '../types';
import { logger } from './logger';
import { parseViaSidecar, SidecarParseData } from './sidecarClient';
import { settingsService } from './settingsService';

function mapFormat(fmt: string): StreamQuality['format'] {
  const f = (fmt || '').toLowerCase();
  if (f === 'flv' || f === 'm3u8' || f === 'mp4' || f === 'aac') return f;
  if (f.includes('flv')) return 'flv';
  if (f.includes('m3u8') || f.includes('hls')) return 'm3u8';
  if (f.includes('mp4')) return 'mp4';
  return 'm3u8';
}

function extractRoomId(url: string): string {
  const match = url.match(/\/(?:live\/|video\/|u\/|@)?([a-zA-Z0-9_-]{2,})/);
  return match?.[1] || '';
}

function toPlatformId(key: string): PlatformId {
  return key as PlatformId;
}

function mapQualities(data: SidecarParseData): StreamQuality[] {
  return (data.qualities || []).map((q) => ({
    id: q.id,
    name: q.name,
    resolution: '—',
    bitrate: '—',
    fps: 0,
    format: mapFormat(q.format),
    url: q.url,
  }));
}

export async function parseStreamUrl(
  url: string,
  cookie?: string
): Promise<ParsedStreamResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('请输入有效的直播或视频链接');
  }

  const hinted = detectPlatformFromUrl(cleanUrl);
  logger.addLog('info', 'PARSER', `[${hinted.name}] 请求 sidecar 解析: ${cleanUrl}`);

  const settings = settingsService.getSettings();
  const proxy = settings.proxyEnabled && settings.proxyUrl ? settings.proxyUrl : null;

  let data: SidecarParseData;
  try {
    data = await parseViaSidecar({
      url: cleanUrl,
      cookies: cookie || null,
      proxy,
    });
  } catch (err: any) {
    const message = err?.message || '解析失败';
    logger.addLog('error', 'PARSER', message);
    throw new Error(message);
  }

  const qualities = mapQualities(data);
  const platformId = toPlatformId(data.platformKey || hinted.id);
  const platformName = data.platform || hinted.name;

  const result: ParsedStreamResult = {
    url: cleanUrl,
    platform: platformId,
    platformName,
    roomId: extractRoomId(data.liveUrl || cleanUrl),
    anchorName: data.anchorName || '未知主播',
    anchorAvatar: '',
    title: data.title || `${platformName} 直播间`,
    coverUrl: '',
    isLive: Boolean(data.isLive),
    statusText: data.isLive ? '直播中' : '未开播',
    qualities,
    selectedQualityId: qualities[0]?.id || '',
    parsedAt: Date.now(),
    rawJson: data,
  };

  if (data.newCookies) {
    logger.addLog('info', 'PARSER', `[${platformName}] sidecar 回传了新 Cookie（长度 ${data.newCookies.length}），请在凭据页手动更新`);
  }

  logger.addLog(
    result.isLive ? 'success' : 'warn',
    'PARSER',
    `[${platformName}] ${result.anchorName} · ${result.statusText} · 清晰度 ${qualities.length} 档`
  );

  return result;
}
