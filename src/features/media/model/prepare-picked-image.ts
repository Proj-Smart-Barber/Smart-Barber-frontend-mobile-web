export async function preparePickedImage(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
}) {
  let uri = asset.uri;
  let name = asset.fileName ?? 'photo.jpg';
  let type = asset.mimeType ?? 'image/jpeg';
  if (/hei[cf]/i.test(type) || /\.hei[cf]$/i.test(name)) {
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    const converted = await manipulateAsync(
      uri,
      asset.width && asset.width > 1080 ? [{ resize: { width: 1080 } }] : [],
      { compress: 0.82, format: SaveFormat.JPEG },
    );
    uri = converted.uri;
    name = name.replace(/\.[^.]+$/, '') + '.jpg';
    type = 'image/jpeg';
  }
  const file = await (await fetch(uri)).blob();
  return { file, name, type };
}
