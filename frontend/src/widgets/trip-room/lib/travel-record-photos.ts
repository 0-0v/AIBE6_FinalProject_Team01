export async function uploadTravelRecordPhotos(
    files: File[],
    upload: (file: File) => Promise<string>,
) {
    return Promise.all(files.map(upload))
}

export function mergeTravelRecordPhotoUrls(
    selectedImageUrls: string[],
    uploadedImageUrls: string[],
) {
    return [...new Set([...selectedImageUrls, ...uploadedImageUrls])]
}
