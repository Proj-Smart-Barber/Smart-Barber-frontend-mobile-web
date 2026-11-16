export async function preparePickedImage(asset) {
    var _a, _b;
    let uri = asset.uri;
    let name = (_a = asset.fileName) !== null && _a !== void 0 ? _a : 'photo.jpg';
    let type = (_b = asset.mimeType) !== null && _b !== void 0 ? _b : 'image/jpeg';
    if (/hei[cf]/i.test(type) || /\.hei[cf]$/i.test(name)) {
        const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
        const converted = await manipulateAsync(uri, asset.width && asset.width > 1080 ? [{ resize: { width: 1080 } }] : [], { compress: 0.82, format: SaveFormat.JPEG });
        uri = converted.uri;
        name = name.replace(/\.[^.]+$/, '') + '.jpg';
        type = 'image/jpeg';
    }
    const file = await (await fetch(uri)).blob();
    return { file, name, type };
}
