import { PlatformInfo } from '../types';

export const SUPPORTED_PLATFORMS: PlatformInfo[] = [
  {
    id: 'douyin',
    name: '抖音 (Douyin)',
    nameEn: 'Douyin',
    category: 'chinese',
    color: '#fe2c55',
    icon: 'Music2',
    urlPattern: 'douyin.com|v.douyin.com|live.douyin.com',
    sampleUrls: [
      'https://live.douyin.com/80017709309',
      'https://live.douyin.com/745261899120',
      'https://v.douyin.com/iRoF123/'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: true,
    defaultFormat: 'flv'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    nameEn: 'TikTok',
    category: 'international',
    color: '#00f2fe',
    icon: 'Flame',
    urlPattern: 'tiktok.com|vt.tiktok.com',
    sampleUrls: [
      'https://www.tiktok.com/@gameonlive/live',
      'https://vt.tiktok.com/ZS234ab/'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: false,
    requiresCookieForHighRes: false,
    defaultFormat: 'flv'
  },
  {
    id: 'kuaishou',
    name: '快手 (Kuaishou)',
    nameEn: 'Kuaishou',
    category: 'chinese',
    color: '#ff5000',
    icon: 'Video',
    urlPattern: 'kuaishou.com|live.kuaishou.com|v.kuaishou.com',
    sampleUrls: [
      'https://live.kuaishou.com/u/kuaishouofficial',
      'https://live.kuaishou.com/u/3x59rwycquq8e4k'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: true,
    defaultFormat: 'flv'
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩 (Bilibili)',
    nameEn: 'Bilibili',
    category: 'chinese',
    color: '#00a1d6',
    icon: 'Tv',
    urlPattern: 'live.bilibili.com|bilibili.com/video|b23.tv',
    sampleUrls: [
      'https://live.bilibili.com/5440',
      'https://live.bilibili.com/21686237',
      'https://www.bilibili.com/video/BV1xx411c7mD'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: true,
    defaultFormat: 'flv'
  },
  {
    id: 'huya',
    name: '虎牙直播 (Huya)',
    nameEn: 'Huya Live',
    category: 'chinese',
    color: '#ffaa00',
    icon: 'Gamepad2',
    urlPattern: 'huya.com',
    sampleUrls: [
      'https://www.huya.com/99999',
      'https://www.huya.com/lpl'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: false,
    defaultFormat: 'flv'
  },
  {
    id: 'douyu',
    name: '斗鱼直播 (Douyu)',
    nameEn: 'Douyu Live',
    category: 'chinese',
    color: '#ff6600',
    icon: 'Fish',
    urlPattern: 'douyu.com',
    sampleUrls: [
      'https://www.douyu.com/9999',
      'https://www.douyu.com/topic/lck'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: false,
    defaultFormat: 'flv'
  },
  {
    id: 'xiaohongshu',
    name: '小红书 (RedNote)',
    nameEn: 'Xiaohongshu',
    category: 'chinese',
    color: '#ff2442',
    icon: 'BookOpen',
    urlPattern: 'xiaohongshu.com|xhslink.com',
    sampleUrls: [
      'https://www.xiaohongshu.com/user/profile/5b68...',
      'http://xhslink.com/a/abcXYZ'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: false,
    requiresCookieForHighRes: true,
    defaultFormat: 'm3u8'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    nameEn: 'YouTube Live & Video',
    category: 'international',
    color: '#ff0000',
    icon: 'PlaySquare',
    urlPattern: 'youtube.com|youtu.be',
    sampleUrls: [
      'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      'https://www.youtube.com/live/5qap5aO4i9A'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: false,
    defaultFormat: 'm3u8'
  },
  {
    id: 'twitch',
    name: 'Twitch',
    nameEn: 'Twitch TV',
    category: 'international',
    color: '#9146ff',
    icon: 'Radio',
    urlPattern: 'twitch.tv',
    sampleUrls: [
      'https://www.twitch.tv/eslcs',
      'https://www.twitch.tv/shroud'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: false,
    defaultFormat: 'm3u8'
  },
  {
    id: 'wechat_channels',
    name: '微信视频号 (Channels)',
    nameEn: 'WeChat Channels',
    category: 'chinese',
    color: '#07c160',
    icon: 'MessageSquare',
    urlPattern: 'channels.weixin.qq.com|finder.video.qq.com',
    sampleUrls: [
      'https://channels.weixin.qq.com/live/wx123456789'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: false,
    supports4K: false,
    requiresCookieForHighRes: true,
    defaultFormat: 'flv'
  },
  {
    id: 'weibo',
    name: '微博直播 (Weibo)',
    nameEn: 'Weibo Live',
    category: 'chinese',
    color: '#eb1823',
    icon: 'Globe',
    urlPattern: 'weibo.com|weibo.cn|yizhibo.com',
    sampleUrls: [
      'https://weibo.com/l/wblive/p/show/1022:232411...'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: false,
    requiresCookieForHighRes: false,
    defaultFormat: 'flv'
  },
  {
    id: 'acfun',
    name: 'AcFun 弹幕视频网',
    nameEn: 'AcFun Live',
    category: 'chinese',
    color: '#fd4c5d',
    icon: 'Sparkles',
    urlPattern: 'acfun.cn/live',
    sampleUrls: [
      'https://live.acfun.cn/live/236492'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: false,
    requiresCookieForHighRes: false,
    defaultFormat: 'flv'
  },
  {
    id: 'yy',
    name: 'YY 直播',
    nameEn: 'YY Live',
    category: 'chinese',
    color: '#ffe000',
    icon: 'RadioTower',
    urlPattern: 'yy.com',
    sampleUrls: [
      'https://www.yy.com/991'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: false,
    requiresCookieForHighRes: false,
    defaultFormat: 'flv'
  },
  {
    id: 'chzzk',
    name: 'CHZZK (Naver)',
    nameEn: 'Naver CHZZK',
    category: 'international',
    color: '#00ffa3',
    icon: 'Cast',
    urlPattern: 'chzzk.naver.com',
    sampleUrls: [
      'https://chzzk.naver.com/live/b2382f6e917'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: false,
    defaultFormat: 'm3u8'
  },
  {
    id: 'soop',
    name: 'SOOP (AfreecaTV)',
    nameEn: 'SOOP Global',
    category: 'international',
    color: '#1a73e8',
    icon: 'MonitorPlay',
    urlPattern: 'sooplive.com|afreecatv.com',
    sampleUrls: [
      'https://www.sooplive.co.kr/afreecatv'
    ],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: true,
    supports4K: true,
    requiresCookieForHighRes: false,
    defaultFormat: 'm3u8'
  },
  {
    id: 'shopee',
    name: 'Shopee Live',
    nameEn: 'Shopee Live',
    category: 'international',
    color: '#ee4d2d',
    icon: 'ShoppingBag',
    urlPattern: 'shopee.tw|shopee.sg|shopee.co.id',
    sampleUrls: [
      'https://shopee.tw/live/12345'
    ],
    supportsLive: true,
    supportsVod: false,
    supportsDanmaku: true,
    supports4K: false,
    requiresCookieForHighRes: true,
    defaultFormat: 'flv'
  }
];

export function detectPlatformFromUrl(url: string): PlatformInfo {
  const cleanUrl = url.trim().toLowerCase();
  for (const platform of SUPPORTED_PLATFORMS) {
    const patterns = platform.urlPattern.split('|');
    for (const pattern of patterns) {
      if (cleanUrl.includes(pattern)) {
        return platform;
      }
    }
  }

  // Fallback custom
  return {
    id: 'custom',
    name: '通用流媒体 (Custom Stream)',
    nameEn: 'Custom / Direct Stream',
    category: 'other',
    color: '#6366f1',
    icon: 'Radio',
    urlPattern: 'm3u8|flv|mp4|rtmp|rtsp',
    sampleUrls: ['https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'],
    supportsLive: true,
    supportsVod: true,
    supportsDanmaku: false,
    supports4K: true,
    requiresCookieForHighRes: false,
    defaultFormat: cleanUrl.includes('.flv') ? 'flv' : cleanUrl.includes('.mp4') ? 'mp4' : 'm3u8'
  };
}
