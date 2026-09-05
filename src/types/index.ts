export type PlatformId =
  | 'douyin'
  | 'tiktok'
  | 'kuaishou'
  | 'bilibili'
  | 'huya'
  | 'douyu'
  | 'xiaohongshu'
  | 'youtube'
  | 'twitch'
  | 'wechat_channels'
  | 'weibo'
  | 'acfun'
  | 'inke'
  | 'yy'
  | 'chzzk'
  | 'soop'
  | 'pandatv'
  | 'shopee'
  | 'taobao'
  | 'jd'
  | 'zhihu'
  | 'netease'
  | 'kugou'
  | 'bigo'
  | 'baidu'
  | 'sixroom'
  | 'huajiao'
  | 'custom';

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  nameEn: string;
  category: 'chinese' | 'international' | 'other';
  color: string;
  icon: string;
  urlPattern: string;
  sampleUrls: string[];
  supportsLive: boolean;
  supportsVod: boolean;
  supportsDanmaku: boolean;
  supports4K: boolean;
  requiresCookieForHighRes: boolean;
  defaultFormat: 'flv' | 'm3u8' | 'mp4';
  /** 已接入 Python sidecar 真实解析 */
  parseWired: boolean;
}

export interface StreamQuality {
  id: string;
  name: string; // e.g. "原画 (4K/1080P60)", "高清 1080P", "标清 720P", "音频流"
  resolution: string; // "3840x2160", "1920x1080", "1280x720"
  bitrate: string; // "8000kbps", "4000kbps"
  fps: number;
  format: 'flv' | 'm3u8' | 'mp4' | 'aac';
  url: string;
  isVip?: boolean;
}

export interface ParsedStreamResult {
  url: string;
  platform: PlatformId;
  platformName: string;
  roomId: string;
  anchorName: string;
  anchorAvatar: string;
  title: string;
  coverUrl: string;
  isLive: boolean;
  statusText: '直播中' | '未开播' | '回放/视频' | '录播中' | '解析失败';
  category?: string;
  viewerCount?: number;
  likeCount?: number;
  qualities: StreamQuality[];
  selectedQualityId: string;
  parsedAt: number;
  rawJson?: any;
}

export type DownloadStatus =
  | 'queued'
  | 'parsing'
  | 'downloading'
  | 'recording'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'converting';

export interface DownloadTask {
  id: string;
  url: string;
  platform: PlatformId;
  platformName: string;
  anchorName: string;
  anchorAvatar: string;
  title: string;
  coverUrl: string;
  isLiveStream: boolean;
  quality: StreamQuality;
  status: DownloadStatus;
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  elapsedSeconds: number;
  etaSeconds: number;
  startTime: number;
  endTime?: number;
  filePath: string;
  fileSizeFormatted: string;
  streamUrl: string;
  error?: string;
  segmentDurationMinutes?: number;
  segmentsCount?: number;
  autoRecordWhenLive?: boolean;
}

export interface MonitoredAnchor {
  id: string;
  platform: PlatformId;
  roomId: string;
  url: string;
  name: string;
  avatar: string;
  coverUrl: string;
  category: string;
  tags: string[];
  isLive: boolean;
  currentTitle: string;
  viewerCount: number;
  lastLiveTime: string;
  autoRecord: boolean;
  qualityPreference: string;
  recordFormat: 'mp4' | 'flv' | 'm3u8' | 'ts';
  totalRecordingsCount: number;
  cookiePresetId?: string;
  checkIntervalSeconds: number;
  lastCheckedAt: number;
}

export interface PlatformCookie {
  id: string;
  platform: PlatformId;
  accountName: string;
  avatar?: string;
  cookieString: string;
  isVip: boolean;
  isValid: boolean;
  lastTestedAt: number;
  expiresAt?: string;
  extractedFrom: 'qr_scan' | 'embedded_browser' | 'manual_input';
}

export interface PotPlayerConfig {
  windowTitle: string;
  aspectRatio: '16:9' | '9:16' | '4:3' | 'fill' | 'original';
  chromaKey: 'none' | 'green' | 'blue' | 'black';
  borderless: boolean;
  hideControlsOnIdle: boolean;
  hardwareDecoding: boolean;
  customPotPlayerPath: string;
  autoTopmost: boolean;
  targetLiveCompanion: 'douyin_companion' | 'kuaishou_companion' | 'obs' | 'wechat_helper' | 'general';
}

export interface RelayDestination {
  id: string;
  name: string;
  protocol: 'rtmp' | 'srt' | 'rtsp' | 'webrtc' | 'mediamtx';
  targetUrl: string;
  streamKey?: string;
  enabled: boolean;
}

export type RelayMode = 'mediamtx' | 'potplayer';

export interface RelayTask {
  id: string;
  name: string;
  relayMode: RelayMode; // 互斥模式：'mediamtx' 为流媒体推流，'potplayer' 为直播伴侣窗口捕获
  sourceUrl: string;
  sourcePlatform: PlatformId;
  anchorName: string;
  destinations: RelayDestination[];
  potplayerConfig: PotPlayerConfig;
  status: 'running' | 'stopped' | 'error' | 'reconnecting';
  currentFps: number;
  currentBitrateKbps: number;
  uptimeSeconds: number;
  audioCodec: 'copy' | 'aac';
  videoCodec: 'copy' | 'h264_nvenc' | 'libx264';
  localPlaybackM3U8: string;
  localPlaybackWebRTC: string;
  totalTransferredBytes: number;
  droppedFrames: number;
}

export interface DanmakuMessage {
  id: string;
  timestamp: number;
  senderName: string;
  senderLevel?: number;
  senderBadge?: string;
  content: string;
  type: 'chat' | 'gift' | 'enter' | 'like' | 'follow';
  giftName?: string;
  giftCount?: number;
  color?: string;
}

export interface StreamScrapeData {
  roomId: string;
  platform: PlatformId;
  anchorName: string;
  liveTitle: string;
  viewerCountHistory: { time: string; count: number }[];
  totalLikes: number;
  danmakuCount: number;
  giftValueTotal: number;
  peakViewers: number;
  danmakuList: DanmakuMessage[];
  isScraping: boolean;
}

export interface AppSettings {
  downloadDir: string;
  concurrentDownloads: number;
  autoRemuxToMp4: boolean;
  deleteTsAfterRemux: boolean;
  proxyEnabled: boolean;
  proxyUrl: string;
  userAgent: string;
  ffmpegPath: string;
  mediaMtxUrl: string;
  livePollingIntervalSeconds: number;
  enableSoundAlerts: boolean;
  theme: 'dark' | 'light' | 'midnight' | 'cyber';
  autoStartOnBoot: boolean;
  minimizeToTray?: boolean;
  showDanmakuOverlay: boolean;
  downloadPath?: string;
  defaultFormat?: 'mp4' | 'flv' | 'ts' | 'mkv';
  defaultQuality?: 'origin_4k' | '1080p60' | '720p';
  hardwareAcceleration?: boolean;
  monitorCheckIntervalSeconds?: number;
  maxConcurrentDownloads?: number;
}

export interface EngineLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  category: 'PARSER' | 'DOWNLOADER' | 'FFMPEG' | 'RELAY' | 'BROWSER' | 'MONITOR';
  message: string;
}
