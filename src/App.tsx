/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HeaderBar } from './components/common/HeaderBar';
import { Sidebar } from './components/common/Sidebar';
import { LogDrawer } from './components/common/LogDrawer';
import { VideoPlayerModal } from './components/common/VideoPlayerModal';
import { DownloaderView } from './components/downloader/DownloaderView';
import { AnchorManagementView } from './components/anchors/AnchorManagementView';
import { EmbeddedBrowserView } from './components/browser/EmbeddedBrowserView';
import { MediaRelayView } from './components/relay/MediaRelayView';
import { DataScraperView } from './components/scraper/DataScraperView';
import { SettingsView } from './components/settings/SettingsView';
import { themeService, ThemeMode } from './services/themeService';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('downloader');
  const [isLogOpen, setIsLogOpen] = useState<boolean>(false);
  const [quickParsedUrl, setQuickParsedUrl] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useState<ThemeMode>(themeService.getTheme());

  // Video player modal state
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [playerStreamUrl, setPlayerStreamUrl] = useState<string>('');
  const [playerTitle, setPlayerTitle] = useState<string>('');
  const [playerIsLive, setPlayerIsLive] = useState<boolean>(true);

  useEffect(() => {
    const unsub = themeService.subscribe((t) => {
      setTheme(t);
    });
    return unsub;
  }, []);

  const handleOpenPlayer = (url: string, title: string, isLive: boolean = true) => {
    setPlayerStreamUrl(url);
    setPlayerTitle(title);
    setPlayerIsLive(isLive);
    setIsPlayerOpen(true);
  };

  const handleQuickParse = (url: string) => {
    setQuickParsedUrl(url);
    setActiveTab('downloader');
  };

  return (
    <div
      data-theme={theme}
      className={`flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none ${
        theme === 'light' ? 'light' : 'dark'
      }`}
    >
      {/* Top Desktop Window HeaderBar with right-aligned window buttons & theme switcher */}
      <HeaderBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onToggleLogs={() => setIsLogOpen(!isLogOpen)}
        isLogOpen={isLogOpen}
        onQuickParse={handleQuickParse}
      />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenPlayer={handleOpenPlayer}
        />

        {/* Center Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950/50 overflow-hidden relative">
          {activeTab === 'downloader' && (
            <DownloaderView
              onOpenPlayer={handleOpenPlayer}
              presetUrl={quickParsedUrl}
            />
          )}

          {activeTab === 'anchors' && (
            <AnchorManagementView
              onOpenPlayer={handleOpenPlayer}
              onNavigateToDownloader={() => setActiveTab('downloader')}
            />
          )}

          {activeTab === 'browser' && <EmbeddedBrowserView />}

          {activeTab === 'relay' && (
            <MediaRelayView onOpenPlayer={handleOpenPlayer} />
          )}

          {activeTab === 'scraper' && <DataScraperView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Bottom Collapsible Engine Log Console Terminal */}
      <LogDrawer isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

      {/* Global Stream Preview Video Player Modal */}
      <VideoPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        streamUrl={playerStreamUrl}
        title={playerTitle}
        isLive={playerIsLive}
      />
    </div>
  );
}
