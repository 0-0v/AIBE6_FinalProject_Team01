import { create } from 'zustand'
import {
    addBookmark,
    addCardComment,
    deleteCardComment,
    fetchCardComments,
    fetchPublicCards,
    removeBookmark,
    type CardComment,
    type CardSort,
    type PublicCardPage,
} from '../api/card-api'

type ExploreCardState = {
    data: PublicCardPage | null
    commentsByCardId: Record<number, CardComment[]>
    isLoading: boolean
    commentsLoading: boolean
    error: string | null
    loadCards: (
        page: number,
        sort: CardSort,
        query: string,
        travelStyle: string | null,
    ) => Promise<void>
    toggleBookmark: (cardId: number) => Promise<void>
    loadComments: (cardId: number) => Promise<void>
    createComment: (cardId: number, content: string) => Promise<boolean>
    removeComment: (cardId: number, commentId: number) => Promise<void>
}

function messageOf(error: unknown) {
    return error instanceof Error
        ? error.message
        : '요청을 처리하는 중 오류가 발생했습니다.'
}

function changeCommentCount(
    data: PublicCardPage | null,
    cardId: number,
    amount: number,
) {
    if (!data) return data
    return {
        ...data,
        content: data.content.map((card) =>
            card.id === cardId
                ? {
                      ...card,
                      commentCount: Math.max(0, card.commentCount + amount),
                  }
                : card,
        ),
    }
}

export const useExploreCardStore = create<ExploreCardState>((set, get) => ({
    data: null,
    commentsByCardId: {},
    isLoading: false,
    commentsLoading: false,
    error: null,

    loadCards: async (page, sort, query, travelStyle) => {
        set({ isLoading: true, error: null })
        try {
            const data = await fetchPublicCards(page, sort, query, travelStyle)
            set({ data, isLoading: false })
        } catch (error) {
            set({ error: messageOf(error), isLoading: false })
        }
    },

    toggleBookmark: async (cardId) => {
        const card = get().data?.content.find((item) => item.id === cardId)
        if (!card || card.ownCard) return

        try {
            if (card.bookmarked) await removeBookmark(cardId)
            else await addBookmark(cardId)

            set((state) => ({
                data: state.data
                    ? {
                          ...state.data,
                          content: state.data.content.map((item) =>
                              item.id === cardId
                                  ? {
                                        ...item,
                                        bookmarked: !item.bookmarked,
                                        bookmarkCount:
                                            item.bookmarkCount +
                                            (item.bookmarked ? -1 : 1),
                                    }
                                  : item,
                          ),
                      }
                    : null,
                error: null,
            }))
        } catch (error) {
            set({ error: messageOf(error) })
        }
    },

    loadComments: async (cardId) => {
        set({ commentsLoading: true, error: null })
        try {
            const comments = await fetchCardComments(cardId)
            set((state) => ({
                commentsByCardId: {
                    ...state.commentsByCardId,
                    [cardId]: comments,
                },
                commentsLoading: false,
            }))
        } catch (error) {
            set({ error: messageOf(error), commentsLoading: false })
        }
    },

    createComment: async (cardId, content) => {
        try {
            const comment = await addCardComment(cardId, content)
            set((state) => ({
                commentsByCardId: {
                    ...state.commentsByCardId,
                    [cardId]: [
                        ...(state.commentsByCardId[cardId] ?? []),
                        comment,
                    ],
                },
                data: changeCommentCount(state.data, cardId, 1),
                error: null,
            }))
            return true
        } catch (error) {
            set({ error: messageOf(error) })
            return false
        }
    },

    removeComment: async (cardId, commentId) => {
        try {
            await deleteCardComment(cardId, commentId)
            set((state) => ({
                commentsByCardId: {
                    ...state.commentsByCardId,
                    [cardId]: (state.commentsByCardId[cardId] ?? []).filter(
                        (comment) => comment.id !== commentId,
                    ),
                },
                data: changeCommentCount(state.data, cardId, -1),
                error: null,
            }))
        } catch (error) {
            set({ error: messageOf(error) })
        }
    },
}))
