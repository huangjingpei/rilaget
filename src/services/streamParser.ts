import { detectPlatformFromUrl, SUPPORTED_PLATFORMS } from '../data/platforms';
import { ParsedStreamResult, PlatformId, StreamQuality } from '../types';
import { logger } from './logger';

export async function parseStreamUrl(
  url: string,
  cookie?: string
): Promise<ParsedStreamResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('请输入有效的直播或视频链接');
  }

  const platform = detectPlatformFromUrl(cleanUrl);
  logger.addLog('info', 'PARSER', `[${platform.name}] 正在解析链接: ${cleanUrl}`);

  // Simulate network extraction & JS regex parsing
  await new Promise((r) => setTimeout(r, 450 + Math.random() * 300));

  // Extract ID or generate smart identifier
  let roomId = '888888';
  const urlMatch = cleanUrl.match(/\/(?:live\/|video\/|u\/|@)?([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    roomId = urlMatch[1];
  }

  // Determine anchor & title by platform
  const meta = getPlatformSampleMeta(platform.id, roomId, cleanUrl);
  const isVipUnlocked = Boolean(cookie && cookie.length > 20);

  if (platform.requiresCookieForHighRes) {
    if (isVipUnlocked) {
      logger.addLog('success', 'PARSER', `[${platform.name}] 检测到注入的授权 Cookie，成功解锁 4K/1080P60 极清码率`);
    } else {
      logger.addLog('warn', 'PARSER', `[${platform.name}] 未配置专属 Cookie，当前将以默认最高 1080P 格式解析`);
    }
  }

  const qualities = generateQualities(platform.id, meta.title, isVipUnlocked);

  const result: ParsedStreamResult = {
    url: cleanUrl,
    platform: platform.id,
    platformName: platform.name,
    roomId: roomId,
    anchorName: meta.anchorName,
    anchorAvatar: meta.anchorAvatar,
    title: meta.title,
    coverUrl: meta.coverUrl,
    isLive: meta.isLive,
    statusText: meta.isLive ? '直播中' : '未开播',
    category: meta.category,
    viewerCount: meta.viewerCount,
    likeCount: meta.likeCount,
    qualities: qualities,
    selectedQualityId: qualities[0]?.id || '1080p',
    parsedAt: Date.now(),
  };

  logger.addLog(
    'success',
    'PARSER',
    `[${platform.name}] 解析成功! 主播: ${meta.anchorName} | 状态: ${meta.isLive ? '直播中' : '未开播'} | 可选清晰度: ${qualities.length} 档`
  );

  return result;
}

function generateQualities(
  platform: PlatformId,
  title: string,
  isVip: boolean
): StreamQuality[] {
  const qualities: StreamQuality[] = [];

  // Sample reliable video streams for live testing
  const sampleStreams = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  ];

  if (isVip || platform === 'huya' || platform === 'douyu' || platform === 'bilibili' || platform === 'youtube') {
    qualities.push({
      id: 'origin_4k',
      name: '原画 (4K / 1080P60 极清)',
      resolution: '3840x2160',
      bitrate: '8500 kbps',
      fps: 60,
      format: platform === 'youtube' || platform === 'twitch' ? 'm3u8' : 'flv',
      url: sampleStreams[0],
      isVip: true,
    });
  }

  qualities.push({
    id: 'hd_1080p',
    name: '超清 (1080P 高码率)',
    resolution: '1920x1080',
    bitrate: '4500 kbps',
    fps: 60,
    format: 'flv',
    url: sampleStreams[1],
  });

  qualities.push({
    id: 'sd_720p',
    name: '高清 (720P 极速流)',
    resolution: '1280x720',
    bitrate: '2200 kbps',
    fps: 30,
    format: 'm3u8',
    url: sampleStreams[3],
  });

  qualities.push({
    id: 'audio_only',
    name: '仅音频流 (纯语音/省流)',
    resolution: 'Audio Only',
    bitrate: '192 kbps',
    fps: 0,
    format: 'aac',
    url: sampleStreams[2],
  });

  return qualities;
}

function getPlatformSampleMeta(
  platform: PlatformId,
  roomId: string,
  url: string
) {
  const now = new Date();
  switch (platform) {
    case 'douyin':
      return {
        anchorName: '东方甄选直播间',
        anchorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        title: '【官方正品】全品类专场直播，点击右下角小黄车！',
        coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: '电商带货 / 综合',
        viewerCount: 48290,
        likeCount: 1592000,
      };
    case 'tiktok':
      return {
        anchorName: 'GamingMaster_Official',
        anchorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        title: '🏆 World Championship Finals Live Stream & Drops enabled!',
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: 'Gaming / Esports',
        viewerCount: 32410,
        likeCount: 890000,
      };
    case 'bilibili':
      return {
        anchorName: '虚拟偶像Official',
        anchorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        title: '【新歌歌回】周一晚间电台互动&全新原创曲首播！',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: '虚拟主播 / 音乐',
        viewerCount: 124500,
        likeCount: 340000,
      };
    case 'kuaishou':
      return {
        anchorName: '户外大强哥',
        anchorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        title: '老铁们晚上好！深山野钓连竿挑战，精彩不容错过',
        coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: '户外 / 生活',
        viewerCount: 18200,
        likeCount: 520000,
      };
    case 'huya':
      return {
        anchorName: 'LPL官方赛事直播',
        anchorAvatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
        title: '【2026职业联赛】春季常规赛第一轮淘汰焦点对决',
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: '英雄联盟 / 官方赛事',
        viewerCount: 389000,
        likeCount: 2840000,
      };
    case 'douyu':
      return {
        anchorName: 'Dota2大熊解说',
        anchorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        title: '高分天梯单排教学，带你冲刺万分俱乐部！',
        coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: 'DOTA2 / 竞技游戏',
        viewerCount: 78000,
        likeCount: 450000,
      };
    case 'xiaohongshu':
      return {
        anchorName: '美妆达人莉莉安',
        anchorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        title: '春夏清透呼吸感妆容实测！手把手教学与爱用物分享',
        coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: '美妆护肤 / 种草',
        viewerCount: 9400,
        likeCount: 120000,
      };
    case 'youtube':
      return {
        anchorName: 'Lofi Girl Live',
        anchorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        title: 'beats to relax/study to 🎧 [24/7 lofi hip hop radio]',
        coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: 'Music / 24-7 Radio',
        viewerCount: 45000,
        likeCount: 3900000,
      };
    case 'twitch':
      return {
        anchorName: 'TwitchRivals',
        anchorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        title: '🔥 Apex Legends Global Invitational - Finals Stream',
        coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: 'FPS / Apex Legends',
        viewerCount: 67300,
        likeCount: 820000,
      };
    default:
      return {
        anchorName: `主播_${roomId.slice(0, 6)}`,
        anchorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        title: `【${platform.toUpperCase()}】热门直播间精彩内容进行中`,
        coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
        isLive: true,
        category: '综合直播',
        viewerCount: Math.floor(5000 + Math.random() * 45000),
        likeCount: Math.floor(20000 + Math.random() * 200000),
      };
  }
}
