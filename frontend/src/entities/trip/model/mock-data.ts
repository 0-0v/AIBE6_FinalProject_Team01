import { Member, ActivityLog, Room } from './types'

export const currentUserId = 'm1'

export const members: Member[] = [
    { id: 'm1', name: '지현', avatarColor: '#0f766e', role: 'OWNER' },
    { id: 'm2', name: '민수', avatarColor: '#ea580c', role: 'EDITOR' },
    { id: 'm3', name: '서연', avatarColor: '#7c3aed', role: 'EDITOR' },
    { id: 'm4', name: '준호', avatarColor: '#2563eb', role: 'VIEWER' },
]

const IMG = {
    cafe: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
    beach: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
    restaurant: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
}

export const rooms: Room[] = [
    {
        id: 'jeju-family',
        apiTripId: 1,
        title: '제주도 가족여행',
        date: '2026. 08. 12 – 08. 15',
        location: '제주도',
        dday: 'D-12',
        members: 4,
        progress: 68,
        cover: IMG.beach,
        status: '진행 중',
        color: '#e7657a',
    },
    {
        id: 'busan-friends',
        title: '부산 친구 여행',
        date: '2026. 09. 07 – 09. 09',
        location: '부산광역시',
        dday: 'D-38',
        members: 3,
        progress: 24,
        cover: IMG.restaurant,
        status: '준비 중',
        color: '#f97316',
    },
    {
        id: 'gangneung-weekend',
        title: '강릉 주말 여행',
        date: '2026. 09. 20 – 09. 21',
        location: '강릉시',
        dday: 'D-51',
        members: 2,
        progress: 12,
        cover: IMG.cafe,
        status: '준비 중',
        color: '#0ea5e9',
    },
]

export const initialLogs: ActivityLog[] = [
    {
        id: 'l1',
        memberId: 'm3',
        action: '장소를 등록했어요',
        target: '동문시장',
        createdAt: '10분 전',
        undoable: true,
    },
    {
        id: 'l2',
        memberId: 'm2',
        action: '투표를 시작했어요',
        target: '자매국수',
        createdAt: '32분 전',
        undoable: false,
    },
    {
        id: 'l3',
        memberId: 'm1',
        action: '장소를 지도에 저장했어요',
        target: '협재 해수욕장',
        createdAt: '1시간 전',
        undoable: true,
    },
]
