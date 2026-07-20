import { Member, Place, ActivityLog, Room } from './types'

export const currentUserId = 'm1'

export const members: Member[] = [
    { id: 'm1', name: '지현', avatarColor: '#0f766e', role: 'OWNER' },
    { id: 'm2', name: '민수', avatarColor: '#ea580c', role: 'EDITOR' },
    { id: 'm3', name: '서연', avatarColor: '#7c3aed', role: 'EDITOR' },
    { id: 'm4', name: '준호', avatarColor: '#2563eb', role: 'VIEWER' },
]

export const CATEGORY_META: Record<
    string,
    { label: string; color: string; emoji: string }
> = {
    cafe: { label: '카페', color: '#b45309', emoji: '☕️' },
    food: { label: '맛집', color: '#dc2626', emoji: '🍜' },
    attraction: { label: '명소', color: '#7c3aed', emoji: '🏛️' },
    nature: { label: '자연', color: '#0f766e', emoji: '🌿' },
    shopping: { label: '쇼핑', color: '#2563eb', emoji: '🛍️' },
}

const IMG = {
    cafe: '/5c004c76-d2d5-4fab-8307-e5df0c194dc1.jpg',
    beach: '/ec246eb2-6c56-4a2e-aa65-d09ffc9a62c9.jpg',
    restaurant: '/67984159-ee93-4d51-aadd-43522138b92a.jpg',
    viewpoint: '/0844eb8a-06d8-4ab3-83ad-92012ae8d8fe.jpg',
    market: '/9e582d3a-c3de-4ac9-a64e-952cdb17a104.jpg',
}

export const initialPlaces: Place[] = [
    {
        id: 'p1',
        name: '오설록 티 뮤지엄',
        address: '제주 서귀포시 신화역사로 15',
        category: 'cafe',
        status: 'saved',
        image: IMG.cafe,
        lat: 42,
        lng: 30,
        addedBy: 'm1',
        note: '녹차 아이스크림 필수! 오전에 사람 적음',
        votes: [
            { memberId: 'm1', value: 'up' },
            { memberId: 'm2', value: 'up' },
            { memberId: 'm3', value: 'up' },
        ],

        comments: [
            {
                id: 'c1',
                memberId: 'm2',
                text: '여기 진짜 좋았어요 👍',
                createdAt: '2일 전',
            },
        ],
    },
    {
        id: 'p2',
        name: '협재 해수욕장',
        address: '제주 제주시 한림읍 협재리',
        category: 'nature',
        status: 'saved',
        image: IMG.beach,
        lat: 22,
        lng: 20,
        addedBy: 'm3',
        note: '에메랄드빛 바다, 일몰 명소',
        votes: [
            { memberId: 'm1', value: 'up' },
            { memberId: 'm3', value: 'up' },
            { memberId: 'm4', value: 'up' },
        ],

        comments: [],
    },
    {
        id: 'p3',
        name: '자매국수',
        address: '제주 제주시 항골남길 46',
        category: 'food',
        status: 'candidate',
        image: IMG.restaurant,
        lat: 55,
        lng: 55,
        addedBy: 'm2',
        note: '고기국수 맛집, 웨이팅 있음',
        votes: [
            { memberId: 'm2', value: 'up' },
            { memberId: 'm1', value: 'down' },
        ],

        comments: [
            {
                id: 'c2',
                memberId: 'm4',
                text: '웨이팅 얼마나 하나요?',
                createdAt: '1일 전',
            },
        ],
    },
    {
        id: 'p4',
        name: '성산일출봉',
        address: '제주 서귀포시 성산읍 성산리 1',
        category: 'attraction',
        status: 'candidate',
        image: IMG.viewpoint,
        lat: 70,
        lng: 78,
        addedBy: 'm1',
        votes: [{ memberId: 'm1', value: 'up' }],
        comments: [],
    },
    {
        id: 'p5',
        name: '동문시장',
        address: '제주 제주시 관덕로14길 20',
        category: 'shopping',
        status: 'hold',
        image: IMG.market,
        lat: 48,
        lng: 42,
        addedBy: 'm3',
        note: '야시장 먹거리 많음',
        votes: [{ memberId: 'm3', value: 'up' }],
        comments: [],
    },
    {
        id: 'p6',
        name: '오설록 카페',
        address: '제주 서귀포시 신화역사로 15',
        category: 'cafe',
        status: 'candidate',
        image: IMG.cafe,
        lat: 43,
        lng: 31,
        addedBy: 'm4',
        note: '오설록이랑 같은 곳 같은데?',
        votes: [],
        comments: [],
        duplicateOf: 'p1',
    },
]

export const rooms: Room[] = [
    {
        id: 'jeju-family',
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
