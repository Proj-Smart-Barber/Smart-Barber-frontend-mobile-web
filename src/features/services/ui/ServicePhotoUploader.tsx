import { preparePickedImage } from '@/features/media/model/prepare-picked-image';
import React, { useRef, useState, useEffect } from 'react';
import { View, Image, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '@/features/media/api/media.api';
import { validateImageFile } from '@/features/media/model/use-media-upload';
import { httpClient } from '@/shared/api';
import { Button, Text } from '@/shared/ui';
export function ServicePhotoUploader({
  shopId,
  serviceId,
  url,
  onUpdated,
}: {
  shopId: string;
  serviceId?: string;
  url?: string | null;
  onUpdated: (url: string) => void;
}) {
  const [videoEnabled,setVideoEnabled]=useState(false);
  useEffect(()=>{let mounted=true;httpClient.get<{videoEnabled:boolean}>('/api/media/capabilities').then(result=>{if(mounted)setVideoEnabled(result.videoEnabled);}).catch(()=>{});return()=>{mounted=false;};},[]);
  const controller = useRef<AbortController | null>(null);
  const [gallery, setGallery] = useState<
    Array<{ mediaId: string; url: string; posterUrl?: string; mimeType: string }>
  >([]);
  async function refresh() {
    if (serviceId) {
      const result = await httpClient.get<{ items: typeof gallery }>(
        `/api/barbershops/${encodeURIComponent(shopId)}/services/${encodeURIComponent(serviceId)}/media`,
      );
      setGallery(result.items);
    }
  }
  useEffect(() => {
    void refresh().catch(() => setError('Não foi possível carregar a galeria do serviço.'));
  }, [shopId, serviceId, url]);
  async function change(mediaId: string, remove: boolean) {
    setBusy(true);
    setError(null);
    try {
      const path = `/api/barbershops/${encodeURIComponent(shopId)}/services/${encodeURIComponent(serviceId!)}/media`;
      if (remove) await httpClient.delete(path + '/' + encodeURIComponent(mediaId));
      else await httpClient.post(path, { mediaId, displayOrder: 0 });
      await refresh();
      const current = await httpClient.get<{ service: { imageUrl?: string | null } }>(
        `/api/barbershops/${encodeURIComponent(shopId)}/services/${encodeURIComponent(serviceId!)}`,
      );
      onUpdated(current.service.imageUrl ?? '');
      await Promise.all(
        ['services', 'discovery', 'explore-feed'].map((key) =>
          queries.invalidateQueries({ queryKey: [key] }),
        ),
      );
    } catch {
      setError('Não foi possível alterar a foto. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  const input = useRef<HTMLInputElement>(null);
  const [progress,setProgress]=useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queries = useQueryClient();
  async function upload(file: Blob, name: string, type: string) {
    let pendingMediaId: string | null = null;
    setBusy(true);setProgress(0);
    setError(null);
    controller.current = new AbortController();
    try {
      if (
        type.startsWith('video/') &&
        (!['video/mp4', 'video/quicktime'].includes(type) || file.size > 100 * 1024 * 1024)
      )
        throw new Error('Vídeo inválido ou acima de 100 MB.');
      const validation = validateImageFile({ size: file.size, type, name }, 10 * 1024 * 1024);
      if (!type.startsWith('video/') && !validation.valid) throw new Error(validation.error);
      const intent = await mediaApi.initiateUpload({
        purpose: type.startsWith('video/')
          ? serviceId
            ? 'SERVICE_VIDEO'
            : 'BARBERSHOP_VIDEO'
          : 'SERVICE_PHOTO',
        barbershopId: shopId,
        fileName: name,
        contentType: type,
        fileSize: file.size,
      });
      pendingMediaId = intent.mediaId;
      if(type.startsWith('video/')&&file.size>10*1024*1024)await mediaApi.uploadMultipart(intent.mediaId,file,type,controller.current.signal,setProgress);
      else {await mediaApi.uploadToPresignedUrl(intent.uploadUrl, file, type, controller.current.signal);setProgress(1);}


      let confirmed = await mediaApi.confirmUpload(intent.mediaId);
      for (
        let attempt = 0;
        confirmed.media.status === 'PENDING' || confirmed.media.status === 'PROCESSING';
        attempt++
      ) {
        if (controller.current?.signal.aborted) throw new Error('Envio cancelado.');
        if (attempt >= 60)
          throw new Error(
            'Não foi possível concluir o processamento neste prazo. Tente enviar novamente.',
          );
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 + attempt * 200, 5000)));
        confirmed = await httpClient.get<typeof confirmed>(
          `/api/media/${encodeURIComponent(intent.mediaId)}/status`,
        );
      }
      if (confirmed.media.status !== 'READY')
        throw new Error('A foto ainda está sendo processada. Tente novamente.');
      const result = serviceId
        ? await httpClient.post<{ item: { publicUrl: string } }>(
            `/api/barbershops/${encodeURIComponent(shopId)}/services/${encodeURIComponent(serviceId)}/media`,
            { mediaId: intent.mediaId, displayOrder: 0 },
          )
        : await mediaApi.addGalleryPhoto(shopId, intent.mediaId, '', false);

      pendingMediaId = null;
      onUpdated(result.item.publicUrl ?? '');
      await Promise.all(
        ['services', 'discovery', 'explore-feed', 'barbershop'].map((key) =>
          queries.invalidateQueries({ queryKey: [key] }),
        ),
      );
    } catch (e) {
      if (pendingMediaId)
        await httpClient
          .delete(`/api/media/${encodeURIComponent(pendingMediaId)}`)
          .catch(() => undefined);
      setError(e instanceof Error ? e.message : 'Falha ao enviar a foto.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  async function pick() {
    if (Platform.OS === 'web') {
      input.current?.click();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:serviceId ? (videoEnabled?['images','videos']:['images']) : ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      if (asset.type === 'video') {
        const { File: NativeFile } = await import('expo-file-system');
        await upload(
          new NativeFile(asset.uri),
          asset.fileName ?? 'video.mp4',
          asset.mimeType ?? 'video/mp4',
        );
      } else {
        const prepared = await preparePickedImage(asset);
        await upload(prepared.file, prepared.name, prepared.type);
      }
    } catch {
      setError('Não foi possível abrir a foto selecionada.');
    }
  }
  return (
    <View style={{ gap: 12 }}>
      {gallery.length > 0 && (
        <ScrollView horizontal>
          {gallery.map((media) => (
            <View key={media.mediaId} style={{ marginRight: 12, gap: 8 }}>
              <Image
                source={{ uri: media.posterUrl ?? media.url }}
                style={{ width: 120, height: 120 }}
                resizeMode="cover"
                accessibilityLabel={
                  media.mimeType.startsWith('video/') ? 'Vídeo do serviço' : 'Foto do serviço'
                }
              />
              <Text>{media.mimeType.startsWith('video/') ? 'Vídeo' : 'Foto'}</Text>
              <Button
                title="Usar como capa"
                disabled={busy}
                onPress={() => void change(media.mediaId, false)}
              />
              <Button
                title="Remover"
                disabled={busy}
                onPress={() => void change(media.mediaId, true)}
              />
            </View>
          ))}
        </ScrollView>
      )}
      {url && (
        <Image
          source={{ uri: url }}
          style={{ width: 150, height: 150 }}
          resizeMode="contain"
          accessibilityLabel="Foto do serviço"
        />
      )}
      {Platform.OS === 'web' && (
        <input
          ref={input}
          type="file"
          accept={
            serviceId
              ? (videoEnabled?'image/jpeg,image/png,image/webp,video/mp4,video/quicktime':'image/jpeg,image/png,image/webp')
              : 'video/mp4,video/quicktime'
          }
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f, f.name, f.type);
          }}
        />
      )}
      <Button
        title={
          busy
            ? `Enviando/processando… ${Math.round(progress*100)}%`
            : serviceId
              ? (videoEnabled?'Enviar foto ou vídeo do serviço':'Enviar foto do serviço')
              : 'Enviar vídeo da barbearia'
        }
        disabled={busy||(!serviceId&&!videoEnabled)}
        onPress={() => void pick()}
      />
      {!serviceId&&!videoEnabled&&<Text>Envio de vídeos em preparação.</Text>}
      {busy && <Button title="Cancelar envio" onPress={() => controller.current?.abort()} />}{' '}
      {error && <Text accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
