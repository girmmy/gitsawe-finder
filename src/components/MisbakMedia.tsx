import { useEffect, useState } from 'react';
import { t, type Lang } from '../lib/labels';
import { audioForCandidate, duration, fileSize, videosFor, type AudioIndex, type MisbakSlot, type Video, type VideoIndex } from '../lib/media';
import type { Candidate, Reading, ServiceName } from '../lib/types';

/** Where the daily recordings come from, credited on every player. */
const AUDIO_SOURCE = {
  label: 'ethiopianorthodox.org',
  href: 'https://www.ethiopianorthodox.org/amharic/yeqolotbet/annualmisbak.html',
};

/**
 * Recordings of one misbak, when we have any.
 *
 * Nothing here fetches until the reader asks it to: the audio carries
 * `preload="none"` and the videos are a facade that only becomes an iframe on
 * a tap. That keeps the app's promise that it loads nothing third-party on its
 * own, and it keeps a small church's server from paying for pages nobody
 * listened to.
 */
export default function MisbakMedia({ reading, candidate, service, eth, slot, audio, videos, lang }: {
  reading: Reading;
  candidate: Candidate;
  service: ServiceName;
  eth: { month: number; day: number };
  /** Where this misbak sits among the ones the office appoints today. */
  slot?: MisbakSlot;
  audio: AudioIndex | null;
  videos: VideoIndex | null;
  lang: Lang;
}) {
  const online = useOnline();
  const clips = audioForCandidate(audio, candidate, eth, service, slot);
  const films = videosFor(videos, reading, candidate.mezmur);

  // Say so rather than leave a silent gap: a deacon who finds nothing here
  // should know we have nothing, not wonder whether the app failed to load it.
  // ዘሠርክ gets its own wording because we know why it is empty and always will
  // be — neither collection records Vespers at all.
  if (!clips.length && !films.length) {
    // Deliberately not .misbak-media: that class means recordings are present,
    // and both the styles and the tests read it that way.
    return (
      <p className="media-none">
        {t(service === 'serk' ? 'recordingNoneSerk' : 'recordingNone', lang)}
      </p>
    );
  }

  return (
    <section className="misbak-media" aria-label={t('recordings', lang)}>
      <p className="media-label">{t('recordings', lang)}</p>

      {/* The caveat is about the whole row, so it is said once however many
          recordings hang on it. Two reasons it cannot be pinned down, and only
          one of them applies. */}
      {clips.some(({ exact }) => !exact) && (
        <p className="media-caveat">
          <span aria-hidden="true">※ </span>
          {(slot?.count ?? 1) > 1
            ? t('recordingManyMisbak', lang)
            : t('recordingDayOnly', lang)}
        </p>
      )}

      {clips.map(({ rec }) => (
        <div key={rec.url} className="media-item">
          {online ? (
            <audio className="media-audio" controls preload="none" src={rec.url} />
          ) : (
            <p className="media-offline">{t('mediaOffline', lang)}</p>
          )}
          <p className="media-meta">
            {t('recordingSource', lang)}{' '}
            <a href={AUDIO_SOURCE.href} target="_blank" rel="noreferrer">{AUDIO_SOURCE.label}</a>
            {fileSize(rec.bytes) && <span className="media-size"> · {fileSize(rec.bytes)}</span>}
          </p>
        </div>
      ))}

      {films.length > 0 && (
        // Keyed by the videos themselves: stepping to another Sunday must not
        // arrive with a player already open because the ids happened to match.
        <VideoList key={films.map((v) => v.id).join(',')}
          videos={films} online={online} lang={lang} />
      )}
    </section>
  );
}

/**
 * The videos, one player at a time.
 *
 * Letting several iframes stack up would leave a phone holding several
 * YouTube players for chants nobody is listening to any more, so opening one
 * closes the last.
 */
function VideoList({ videos, online, lang }: { videos: Video[]; online: boolean; lang: Lang }) {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <>
      {videos.map((v) => {
        const watch = `https://www.youtube.com/watch?v=${v.id}`;
        // An uploader who disallows embedding gets a link, not a dead frame.
        const canEmbed = v.embeddable !== false && online;
        if (playing === v.id && canEmbed) {
          return (
            <div key={v.id} className="media-item">
              <div className="media-frame">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
                  title={v.title}
                  loading="lazy"
                  /*
                   * The app sends Referrer-Policy: no-referrer, and YouTube
                   * refuses to play an embed it cannot attribute to a site —
                   * "Video player configuration error, Error 153". Overriding
                   * the policy on this one element sends our origin and
                   * nothing else: enough for YouTube to allow the embed, no
                   * path or query, and every other request in the app stays
                   * refererless.
                   */
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
              <p className="media-meta">
                <a href={watch} target="_blank" rel="noreferrer">{t('watchOnYouTube', lang)} ↗</a>
              </p>
            </div>
          );
        }
        return (
          <div key={v.id} className="media-item">
            {canEmbed ? (
              <button className="media-card" onClick={() => setPlaying(v.id)}>
                <span className="media-play" aria-hidden="true">▶</span>
                <span className="media-card-text">
                  <span className="media-title">{v.title}</span>
                  <span className="media-sub">
                    {v.channel}
                    {v.channel && duration(v.seconds) && ' · '}
                    {duration(v.seconds)}
                  </span>
                </span>
              </button>
            ) : (
              <p className="media-card media-card-flat">
                <span className="media-card-text">
                  <span className="media-title">{v.title}</span>
                  <span className="media-sub">{online ? v.channel : t('mediaOffline', lang)}</span>
                </span>
              </p>
            )}
            <p className="media-meta">
              <a href={watch} target="_blank" rel="noreferrer">{t('watchOnYouTube', lang)} ↗</a>
            </p>
          </div>
        );
      })}
    </>
  );
}

/** Whether the browser thinks it has a connection, kept current. */
function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
