import { describe, it, expect, vi } from 'vitest';

const mockChannel = { subscribe: vi.fn() };

vi.mock('../supabase', () => ({
  supabase: {
    channel: vi.fn((name: string) => mockChannel),
  },
}));

const { createRealtimeChannel } = await import('../wsHelper');
const { supabase } = await import('../supabase');

describe('wsHelper', () => {
  describe('createRealtimeChannel', () => {
    it('creates a channel with the given name', () => {
      const result = createRealtimeChannel('test-channel');
      expect(supabase.channel).toHaveBeenCalledWith('test-channel');
      expect(result).toBe(mockChannel);
    });

    it('returns null if channel creation throws', () => {
      vi.mocked(supabase.channel).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      const result = createRealtimeChannel('fail-channel');
      expect(result).toBeNull();
    });
  });
});
