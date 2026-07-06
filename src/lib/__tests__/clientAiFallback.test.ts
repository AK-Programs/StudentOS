import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
}));

// We need to import after mocking
const { clientSideGemini } = await import('../clientAiFallback');

describe('clientAiFallback', () => {
  describe('clientSideGemini (offline / no API key)', () => {
    it('returns physics response for physics-related prompts', async () => {
      const result = await clientSideGemini('Explain centripetal force');
      expect(result).toContain('Centripetal Force');
      expect(result).toContain('zero');
    });

    it('returns physics response for mechanics keyword', async () => {
      const result = await clientSideGemini('Tell me about mechanics');
      expect(result).toContain('Centripetal Force');
    });

    it('returns physics response for velocity keyword', async () => {
      const result = await clientSideGemini('What is velocity?');
      expect(result).toContain('Centripetal Force');
    });

    it('returns physics response for acceleration keyword', async () => {
      const result = await clientSideGemini('Explain acceleration in detail');
      expect(result).toContain('Centripetal Force');
    });

    it('returns physics response for work + force combination', async () => {
      const result = await clientSideGemini('What is the work done by a force?');
      expect(result).toContain('Centripetal Force');
    });

    it('does not trigger physics for partial word matches like "workspace"', async () => {
      const result = await clientSideGemini('Open my workspace please');
      expect(result).not.toContain('Centripetal Force');
    });

    it('returns chemistry response for acid keyword', async () => {
      const result = await clientSideGemini('Tell me about acid reactions');
      expect(result).toContain('Acid-Base');
      expect(result).toContain('Lewis');
    });

    it('returns chemistry response for synthesis keyword', async () => {
      const result = await clientSideGemini('Explain organic synthesis');
      expect(result).toContain('Acid-Base');
    });

    it('returns chemistry response for chemistry keyword', async () => {
      const result = await clientSideGemini('Help me with chemistry homework');
      expect(result).toContain('Lewis');
    });

    it('returns CS response for BST keyword', async () => {
      const result = await clientSideGemini('What is a BST?');
      expect(result).toContain('Binary Search Tree');
      expect(result).toContain('O(log N)');
    });

    it('returns CS response for algorithm keyword', async () => {
      const result = await clientSideGemini('Explain this algorithm');
      expect(result).toContain('Binary Search Tree');
    });

    it('returns CS response for programming keyword', async () => {
      const result = await clientSideGemini('Help me with programming');
      expect(result).toContain('Binary Search Tree');
    });

    it('returns CS response for complexity keyword', async () => {
      const result = await clientSideGemini('What is time complexity?');
      expect(result).toContain('Binary Search Tree');
    });

    it('returns default greeting for unrecognized topics', async () => {
      const result = await clientSideGemini('hello');
      expect(result).toContain('StudentOS AI Buddy');
      expect(result).toContain('offline mode');
    });

    it('returns default response for random text', async () => {
      const result = await clientSideGemini('what is the weather today?');
      expect(result).toContain('StudentOS AI Buddy');
    });

    it('handles empty string input', async () => {
      const result = await clientSideGemini('');
      expect(result).toContain('StudentOS AI Buddy');
    });
  });
});
