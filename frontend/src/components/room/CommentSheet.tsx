import React, { useState } from 'react';
import { XIcon, SendIcon } from 'lucide-react';
import { Place } from '../../data/types';
import { members } from '../../data/mockData';
import { Avatar } from '../common/Avatar';

type Props = {
    place: Place;
    canWrite: boolean;
    onClose: () => void;
    onAddComment: (text: string) => void;
};

export function CommentSheet({
    place,
    canWrite,
    onClose,
    onAddComment,
}: Props) {
    const [text, setText] = useState('');

    function submit() {
        if (!text.trim()) return;
        onAddComment(text.trim());
        setText('');
    }

    return (
        <div className="absolute inset-0 z-40 flex flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                    <h3 className="font-bold">댓글</h3>
                    <p className="text-xs text-slate-400">{place.name}</p>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                    <XIcon size={18} />
                </button>
            </div>

            <div className="mp-scroll flex-1 space-y-4 overflow-y-auto p-4">
                {place.comments.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400">
                        아직 댓글이 없어요. 첫 의견을 남겨보세요!
                    </p>
                )}
                {place.comments.map((c) => {
                    const author = members.find((m) => m.id === c.memberId);
                    return (
                        <div key={c.id} className="flex gap-2.5">
                            {author && (
                                <Avatar
                                    name={author.name}
                                    color={author.avatarColor}
                                    size={30}
                                />
                            )}
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-semibold">
                                        {author?.name}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        {c.createdAt}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm text-slate-600">
                                    {c.text}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {canWrite ? (
                <div className="border-t border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submit()}
                            placeholder="댓글 입력…"
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-100"
                        />

                        <button
                            onClick={submit}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-700"
                        >
                            <SendIcon size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-400">
                    조회 전용 모드에서는 댓글을 남길 수 없어요
                </div>
            )}
        </div>
    );
}
