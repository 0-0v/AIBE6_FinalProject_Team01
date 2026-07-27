import assert from 'node:assert/strict'
import test from 'node:test'
import {
    mergeTravelRecordPhotoUrls,
    uploadTravelRecordPhotos,
} from './travel-record-photos.ts'

test('t1 선택한 사진을 모두 업로드하고 반환 URL을 기록에 연결한다', async () => {
    const first = { name: 'first.png' }
    const second = { name: 'second.png' }

    const uploadedUrls = await uploadTravelRecordPhotos(
        [first, second],
        async (file) => `/uploads/travel-records/1/${file.name}`,
    )
    const recordImageUrls = mergeTravelRecordPhotoUrls(
        ['/trip-record-1.png'],
        uploadedUrls,
    )

    assert.deepEqual(recordImageUrls, [
        '/trip-record-1.png',
        '/uploads/travel-records/1/first.png',
        '/uploads/travel-records/1/second.png',
    ])
})

test('t2 재시도할 때 동일한 업로드 URL은 중복 연결하지 않는다', () => {
    assert.deepEqual(
        mergeTravelRecordPhotoUrls(
            ['/uploads/travel-records/1/photo.png'],
            ['/uploads/travel-records/1/photo.png'],
        ),
        ['/uploads/travel-records/1/photo.png'],
    )
})
