export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';

export type Member = {
    id: string;
    name: string;
    avatarColor: string;
    role: Role;
};

export type PlaceCategory =
    'cafe' | 'food' | 'attraction' | 'nature' | 'shopping';

export type PlaceStatus = 'candidate' | 'saved' | 'hold';

export type Vote = {
    memberId: string;
    value: 'up' | 'down';
};

export type Comment = {
    id: string;
    memberId: string;
    text: string;
    createdAt: string;
};

export type Place = {
    id: string;
    name: string;
    address: string;
    category: PlaceCategory;
    status: PlaceStatus;
    image: string;
    lat: number;
    lng: number;
    addedBy: string;
    note?: string;
    votes: Vote[];
    comments: Comment[];
    duplicateOf?: string;
};

export type ActivityLog = {
    id: string;
    memberId: string;
    action: string;
    target: string;
    createdAt: string;
    undoable: boolean;
};

export type TravelRecord = {
    id: string;
    memberId: string;
    day: 1 | 2 | 3;
    time: string;
    createdAt: string;
    memo?: string;
    placeId?: string;
    images: string[];
};

export type Expense = {
    id: string;
    title: string;
    amount: number;
    date: string;
    paidBy: string;
    participantCount: number;
};
