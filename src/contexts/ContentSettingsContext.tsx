import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import { DEFAULT_CONTENT } from '../data/constants';
import type { ContentSettings } from '../data/types';

interface ContentSettingsContextType {
  contentSettings: ContentSettings;
  updateContentSettings: (settings: Partial<ContentSettings>) => Promise<void>;
  refreshContentSettings: () => Promise<void>;
}

const ContentSettingsContext =
  createContext<ContentSettingsContextType | undefined>(undefined);

export function ContentSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [contentSettings, setContentSettings] =
    useState<ContentSettings>(DEFAULT_CONTENT);

  const refreshContentSettings = async () => {
    const { data, error } = await supabase
      .from('site_content')
      .select(
        'content_id, hero, about, history, featured, contact, footer, menu, announcements, policies, updated_at'
      )
      .limit(1)
      .single();

    if (!error && data) {
      setContentSettings({
        content_id: data.content_id,
        hero: data.hero ?? DEFAULT_CONTENT.hero,
        about: data.about ?? DEFAULT_CONTENT.about,
        history: data.history ?? DEFAULT_CONTENT.history,
        featured: data.featured ?? DEFAULT_CONTENT.featured,
        contact: data.contact ?? DEFAULT_CONTENT.contact,
        footer: data.footer ?? DEFAULT_CONTENT.footer,
        menu: data.menu ?? DEFAULT_CONTENT.menu,
        announcements: Array.isArray(data.announcements) ? data.announcements : [],
        policies: data.policies ?? '',
        updated_at: data.updated_at,
      });
    }
  };

  useEffect(() => {
    refreshContentSettings();
  }, []);

  useEffect(() => {
  let timer: number | null = null;

  const scheduleRefresh = () => {
    if (timer) {
      window.clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      void refreshContentSettings();
    }, 150);
  };

  const channel = supabase
    .channel('site-content-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_content',
      },
      () => {
        scheduleRefresh();
      }
    )
    .subscribe((status) => {
      if (import.meta.env.DEV) {
        console.log('Site content realtime status:', status);
      }
    });

  return () => {
    if (timer) {
      window.clearTimeout(timer);
    }
    void supabase.removeChannel(channel);
  };
}, []);

  const updateContentSettings = async (settings: Partial<ContentSettings>) => {
    const payload: any = {};

    if (settings.hero !== undefined) payload.hero = settings.hero;
if (settings.about !== undefined) payload.about = settings.about;
if (settings.history !== undefined) payload.history = settings.history;
if (settings.featured !== undefined) payload.featured = settings.featured;
if (settings.contact !== undefined) payload.contact = settings.contact;
if (settings.footer !== undefined) payload.footer = settings.footer;
if (settings.menu !== undefined) payload.menu = settings.menu;
if (settings.announcements !== undefined) payload.announcements = settings.announcements;
if (settings.policies !== undefined) payload.policies = settings.policies;

    const targetId = contentSettings.content_id;

    if (!targetId) {
      const { data, error } = await supabase
        .from('site_content')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setContentSettings((prev) => ({
        ...prev,
        ...payload,
        content_id: data.content_id,
        updated_at: data.updated_at,
      }));

      return;
    }

    const { data, error } = await supabase
      .from('site_content')
      .update(payload)
      .eq('content_id', targetId)
      .select()
      .single();

    if (error) throw error;

    setContentSettings({
      content_id: data.content_id,
      hero: data.hero ?? DEFAULT_CONTENT.hero,
      about: data.about ?? DEFAULT_CONTENT.about,
      history: data.history ?? DEFAULT_CONTENT.history,
      featured: data.featured ?? DEFAULT_CONTENT.featured,
      contact: data.contact ?? DEFAULT_CONTENT.contact,
      footer: data.footer ?? DEFAULT_CONTENT.footer,
      menu: data.menu ?? DEFAULT_CONTENT.menu,
      announcements: data.announcements ?? [],
      policies: data.policies ?? '',
      updated_at: data.updated_at,
    });
  };

  const value = useMemo(
    () => ({
      contentSettings,
      updateContentSettings,
      refreshContentSettings,
    }),
    [contentSettings]
  );

  return (
    <ContentSettingsContext.Provider value={value}>
      {children}
    </ContentSettingsContext.Provider>
  );
}

export function useContentSettings() {
  const context = useContext(ContentSettingsContext);
  if (!context) {
    throw new Error(
      'useContentSettings must be used within ContentSettingsProvider'
    );
  }
  return context;
}