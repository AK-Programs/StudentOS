import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
    })),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

const { mapSupabaseUserToProfile, mapProfileToSupabaseUser } = await import('../supabaseUsers');

describe('supabaseUsers', () => {
  describe('mapSupabaseUserToProfile', () => {
    it('maps a full Supabase user row to UserProfile', () => {
      const row = {
        firebase_uid: 'uid-123',
        id: 'id-456',
        email: 'TEST@Example.com',
        name: 'Alice',
        full_name: 'Alice Wonderland',
        role: 'student',
        permissions: ['read', 'write'],
        class: 'Grade 11',
        grade: 'Grade 11',
        section: 'Astra',
        house: 'Emerald',
        profile_image: 'https://example.com/photo.jpg',
        photoURL: 'https://example.com/photo.jpg',
        accountStatus: 'approved',
        pin: '1234',
        requestedRole: 'teacher',
        studyHours: 20,
        quizzesTaken: 10,
        streakDays: 15,
        lastLogin: 1700000000000,
      };

      const profile = mapSupabaseUserToProfile(row);
      expect(profile.uid).toBe('uid-123');
      expect(profile.email).toBe('test@example.com');
      expect(profile.name).toBe('Alice');
      expect(profile.role).toBe('student');
      expect(profile.permissions).toEqual(['read', 'write']);
      expect(profile.grade).toBe('Grade 11');
      expect(profile.section).toBe('Astra');
      expect(profile.house).toBe('Emerald');
      expect(profile.photoURL).toBe('https://example.com/photo.jpg');
      expect(profile.accountStatus).toBe('approved');
      expect(profile.pin).toBe('1234');
      expect(profile.requestedRole).toBe('teacher');
      expect(profile.studyHours).toBe(20);
      expect(profile.quizzesTaken).toBe(10);
      expect(profile.streakDays).toBe(15);
      expect(profile.lastLogin).toBe(1700000000000);
    });

    it('falls back to id when firebase_uid is missing', () => {
      const row = { id: 'id-789', email: 'bob@test.com', role: 'teacher' };
      const profile = mapSupabaseUserToProfile(row);
      expect(profile.uid).toBe('id-789');
    });

    it('falls back to empty string when neither firebase_uid nor id exist', () => {
      const row = { email: 'x@test.com', role: 'student' };
      const profile = mapSupabaseUserToProfile(row);
      expect(profile.uid).toBe('');
    });

    it('uses default values for missing optional fields', () => {
      const row = { email: 'min@test.com', role: 'student' };
      const profile = mapSupabaseUserToProfile(row);
      expect(profile.name).toBe('Student');
      expect(profile.grade).toBe('Grade 10');
      expect(profile.section).toBe('Solara');
      expect(profile.house).toBe('Ruby');
      expect(profile.photoURL).toBe('');
      expect(profile.avatar).toBe('');
      expect(profile.accountStatus).toBe('approved');
      expect(profile.pin).toBe('');
      expect(profile.studyHours).toBe(14);
      expect(profile.quizzesTaken).toBe(5);
      expect(profile.streakDays).toBe(8);
    });

    it('lowercases email', () => {
      const row = { email: 'MiXeD@CaSe.COM', role: 'admin' };
      const profile = mapSupabaseUserToProfile(row);
      expect(profile.email).toBe('mixed@case.com');
    });

    it('prefers name over full_name', () => {
      const row = { name: 'Short', full_name: 'Full Name', email: 'a@b.com', role: 'student' };
      const profile = mapSupabaseUserToProfile(row);
      expect(profile.name).toBe('Short');
    });

    it('uses full_name when name is missing', () => {
      const row = { full_name: 'Full Name Only', email: 'a@b.com', role: 'student' };
      const profile = mapSupabaseUserToProfile(row);
      expect(profile.name).toBe('Full Name Only');
    });
  });

  describe('mapProfileToSupabaseUser', () => {
    it('maps a UserProfile to Supabase user row format', () => {
      const profile = {
        uid: 'uid-111',
        email: 'UPPER@CASE.com',
        name: 'Test User',
        role: 'teacher' as const,
        permissions: ['manage_students'],
      };

      const result = mapProfileToSupabaseUser(profile);
      expect(result.email).toBe('upper@case.com');
      expect(result.full_name).toBe('Test User');
      expect(result.role).toBe('teacher');
      expect(result.permissions).toEqual(['manage_students']);
    });

    it('handles missing permissions', () => {
      const profile = {
        email: 'no-perms@test.com',
        name: 'No Perms',
        role: 'student' as const,
      };

      const result = mapProfileToSupabaseUser(profile);
      expect(result.permissions).toEqual([]);
    });

    it('handles undefined email gracefully', () => {
      const profile = {
        name: 'No Email',
        role: 'student' as const,
      } as any;

      const result = mapProfileToSupabaseUser(profile);
      expect(result.email).toBeUndefined();
    });
  });
});
