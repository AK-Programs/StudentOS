import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'uploads/test.pdf' }, error: null }),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://storage.example.com/${path}` },
        })),
      })),
    },
  },
}));

const { uploadFileToStorage } = await import('../storageHelper');

describe('storageHelper', () => {
  describe('uploadFileToStorage', () => {
    it('uploads a file and returns url and path', async () => {
      const file = new File(['test content'], 'my-document.pdf', { type: 'application/pdf' });
      const result = await uploadFileToStorage(file);
      expect(result.url).toContain('https://storage.example.com/');
      expect(result.path).toContain('uploads/');
      expect(result.path).toContain('my-document.pdf');
    });

    it('sanitizes file name by replacing special characters with underscores', async () => {
      const file = new File(['data'], 'file (with) special chars!.txt', { type: 'text/plain' });
      const result = await uploadFileToStorage(file);
      // The path should contain the sanitized filename
      expect(result.path).toMatch(/uploads\/[\d.]+_file__with__special_chars_.txt/);
    });

    it('uses custom path prefix', async () => {
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadFileToStorage(file, undefined, 'images');
      expect(result.path).toContain('images/');
    });

    it('uses default "uploads" path prefix when none specified', async () => {
      const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
      const result = await uploadFileToStorage(file);
      expect(result.path).toMatch(/^uploads\//);
    });

    it('throws error when upload fails', async () => {
      const { supabase } = await import('../supabase');
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Bucket not found', status: 404 },
        }),
        getPublicUrl: vi.fn(),
      } as any);

      const file = new File(['data'], 'fail.pdf', { type: 'application/pdf' });
      await expect(uploadFileToStorage(file)).rejects.toThrow('Upload failed: Bucket not found');
    });
  });
});
