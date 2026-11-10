import React, {useEffect,useState} from 'react';
import {AppState,View,Pressable,Image} from 'react-native';
import {useVideoPlayer,VideoView} from 'expo-video';
import {useReducedMotion} from '@/shared/theme';
import {Text} from '@/shared/ui';
export interface ExploreVideoProps {
  url: string;
  poster?: string;
  active: boolean;
  contentFit?: 'cover' | 'contain';
  nativeControls?: boolean;
}

export function ExploreVideo({
  url,
  poster,
  active,
  contentFit = 'cover',
  nativeControls = false,
}: ExploreVideoProps) {
  const reduced = useReducedMotion();
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(url, (instance) => {
    instance.muted = true;
    instance.loop = false;
  });

  useEffect(() => {
    const status = player.addListener('statusChange', (event) => {
      setFailed(event.status === 'error');
    });
    const playback = player.addListener('playingChange', (event) =>
      setPlaying(event.isPlaying),
    );
    return () => {
      status.remove();
      playback.remove();
    };
  }, [player]);

  useEffect(() => {
    if (active && !reduced) player.play();
    else player.pause();
    return () => {
      player.pause();
    };
  }, [active, reduced, player]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') player.pause();
    });
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        player.pause();
      }
    };
    const handlePageHide = () => {
      player.pause();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
    }
    return () => {
      subscription.remove();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
      }
    };
  }, [player]);

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      {poster && (
        <Image
          source={{ uri: poster }}
          style={{ position: 'absolute', inset: 0 }}
          resizeMode={contentFit}
        />
      )}
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit={contentFit}
        nativeControls={nativeControls}
        playsInline
      />
      {!nativeControls && (
        <View style={{ position: 'absolute', top: '35%', left: 16, gap: 12 }}>
          {failed && (
            <Text style={{ color: 'white', backgroundColor: '#111', padding: 12 }}>
              Vídeo indisponível. Tente novamente.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}
            onPress={() => {
              if (failed) {
                void player
                  .replaceAsync(url)
                  .then(() => player.play())
                  .catch(() => setFailed(true));
                return;
              }
              if (playing) player.pause();
              else player.play();
            }}
          >
            <Text style={{ color: 'white', backgroundColor: '#111', padding: 12 }}>
              {playing ? 'Pausar' : 'Reproduzir'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={muted ? 'Ativar áudio' : 'Silenciar vídeo'}
            onPress={() => {
              player.muted = !muted;
              setMuted(!muted);
            }}
          >
            <Text style={{ color: 'white', backgroundColor: '#111', padding: 12 }}>
              {muted ? 'Ativar áudio' : 'Silenciar'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
