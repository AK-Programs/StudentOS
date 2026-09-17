import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({})),
  },
}));

// Mock localStorage
const localStorageMap = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageMap.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => localStorageMap.set(key, value)),
  removeItem: vi.fn((key: string) => localStorageMap.delete(key)),
  clear: vi.fn(() => localStorageMap.clear()),
};
vi.stubGlobal('localStorage', localStorageMock);

const { getAiBuddyChats, saveAiBuddyChat, deleteAiBuddyChat } = await import('../supabaseChat');

describe('supabaseChat', () => {
  beforeEach(() => {
    localStorageMap.clear();
    vi.clearAllMocks();
  });

  describe('getAiBuddyChats', () => {
    it('returns empty array for empty userId', async () => {
      const result = await getAiBuddyChats('');
      expect(result).toEqual([]);
    });

    it('returns empty array when localStorage has no data', async () => {
      // Supabase mock returns error to trigger localStorage fallback
      const { supabase } = await import('../supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation does not exist' },
        }),
      } as any);

      const result = await getAiBuddyChats('user-1');
      expect(result).toEqual([]);
    });

    it('filters localStorage threads by userId', async () => {
      const threads = [
        { id: 't1', userId: 'user-1', title: 'Thread 1', personaId: 'elara', mode: 'explanatory', messages: [], createdAt: 1 },
        { id: 't2', userId: 'user-2', title: 'Thread 2', personaId: 'ruby', mode: 'socratic', messages: [], createdAt: 2 },
        { id: 't3', userId: 'user-1', title: 'Thread 3', personaId: 'solara', mode: 'coder', messages: [], createdAt: 3 },
      ];
      localStorageMap.set('s_os_ai_threads', JSON.stringify(threads));

      const { supabase } = await import('../supabase');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'not found' },
        }),
      } as any);

      const result = await getAiBuddyChats('user-1');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.userId === 'user-1')).toBe(true);
    });
  });

  describe('saveAiBuddyChat', () => {
    it('does nothing for thread with empty userId', async () => {
      const thread = {
        id: 't1',
        userId: '',
        title: 'Test',
        personaId: 'elara',
        mode: 'explanatory' as const,
        messages: [],
        createdAt: Date.now(),
      };

      await saveAiBuddyChat(thread);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('saves thread to localStorage', async () => {
      const thread = {
        id: 't1',
        userId: 'user-1',
        title: 'Test Thread',
        personaId: 'elara',
        mode: 'explanatory' as const,
        messages: [{ role: 'user' as const, content: 'Hello' }],
        createdAt: Date.now(),
      };

      await saveAiBuddyChat(thread);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        's_os_ai_threads',
        expect.stringContaining('Test Thread')
      );
    });

    it('updates existing thread in localStorage', async () => {
      const thread1 = {
        id: 't1',
        userId: 'user-1',
        title: 'Original',
        personaId: 'elara',
        mode: 'explanatory' as const,
        messages: [],
        createdAt: Date.now(),
      };
      localStorageMap.set('s_os_ai_threads', JSON.stringify([thread1]));

      const updated = { ...thread1, title: 'Updated Title' };
      await saveAiBuddyChat(updated);

      const stored = JSON.parse(localStorageMap.get('s_os_ai_threads')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('Updated Title');
    });
  });

  describe('deleteAiBuddyChat', () => {
    it('removes thread from localStorage by id and userId', async () => {
      const threads = [
        { id: 't1', userId: 'user-1', title: 'Keep' },
        { id: 't2', userId: 'user-1', title: 'Delete Me' },
      ];
      localStorageMap.set('s_os_ai_threads', JSON.stringify(threads));

      await deleteAiBuddyChat('t2', 'user-1');

      const stored = JSON.parse(localStorageMap.get('s_os_ai_threads')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('t1');
    });

    it('does not delete thread belonging to different user', async () => {
      const threads = [
        { id: 't1', userId: 'user-1', title: 'User 1 Thread' },
        { id: 't1', userId: 'user-2', title: 'User 2 Thread Same ID' },
      ];
      localStorageMap.set('s_os_ai_threads', JSON.stringify(threads));

      await deleteAiBuddyChat('t1', 'user-1');

      const stored = JSON.parse(localStorageMap.get('s_os_ai_threads')!);
      // The filter is: t.id !== threadId || t.userId !== userId
      // For {t1, user-2}: 't1' !== 't1' = false, 'user-2' !== 'user-1' = true => kept
      expect(stored).toHaveLength(1);
      expect(stored[0].userId).toBe('user-2');
    });
  });
});
