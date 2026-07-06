import { describe, it, expect } from 'vitest';
import {
  INITIAL_ANNOUNCEMENTS,
  MOCK_QUIZZES,
  AI_PERSONAS,
  INITIAL_FEEDBACK,
  INITIAL_MATERIALS,
  MOCK_SCHEDULES,
} from '../mockData';

describe('mockData', () => {
  describe('INITIAL_ANNOUNCEMENTS', () => {
    it('contains at least one announcement', () => {
      expect(INITIAL_ANNOUNCEMENTS.length).toBeGreaterThan(0);
    });

    it('each announcement has required fields', () => {
      for (const ann of INITIAL_ANNOUNCEMENTS) {
        expect(ann).toHaveProperty('id');
        expect(ann).toHaveProperty('title');
        expect(ann).toHaveProperty('content');
        expect(ann).toHaveProperty('date');
        expect(ann).toHaveProperty('tag');
        expect(ann).toHaveProperty('tagColor');
        expect(ann.id).toBeTruthy();
        expect(ann.title).toBeTruthy();
        expect(ann.content).toBeTruthy();
      }
    });

    it('has unique ids', () => {
      const ids = INITIAL_ANNOUNCEMENTS.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('MOCK_QUIZZES', () => {
    it('contains quizzes for Physics, Chemistry, Computer Science, and Mathematics', () => {
      expect(MOCK_QUIZZES).toHaveProperty('Physics');
      expect(MOCK_QUIZZES).toHaveProperty('Chemistry');
      expect(MOCK_QUIZZES).toHaveProperty('Computer Science');
      expect(MOCK_QUIZZES).toHaveProperty('Mathematics');
    });

    it('each quiz question has required fields', () => {
      for (const [subject, questions] of Object.entries(MOCK_QUIZZES)) {
        expect(questions.length).toBeGreaterThan(0);
        for (const q of questions) {
          expect(q).toHaveProperty('id');
          expect(q).toHaveProperty('question');
          expect(q).toHaveProperty('options');
          expect(q).toHaveProperty('correctOptionIndex');
          expect(q).toHaveProperty('explanation');
          expect(q.id).toBeTruthy();
          expect(q.question).toBeTruthy();
          expect(q.options.length).toBe(4);
          expect(q.correctOptionIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctOptionIndex).toBeLessThan(q.options.length);
          expect(q.explanation).toBeTruthy();
        }
      }
    });

    it('quiz questions have unique ids within subjects', () => {
      for (const questions of Object.values(MOCK_QUIZZES)) {
        const ids = questions.map(q => q.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  describe('AI_PERSONAS', () => {
    it('contains at least 4 personas', () => {
      expect(AI_PERSONAS.length).toBeGreaterThanOrEqual(4);
    });

    it('each persona has required fields', () => {
      for (const persona of AI_PERSONAS) {
        expect(persona).toHaveProperty('id');
        expect(persona).toHaveProperty('name');
        expect(persona).toHaveProperty('speciality');
        expect(persona).toHaveProperty('style');
        expect(persona).toHaveProperty('systemPrompt');
        expect(persona).toHaveProperty('avatarChar');
        expect(persona).toHaveProperty('avatarColor');
        expect(persona.id).toBeTruthy();
        expect(persona.name).toBeTruthy();
        expect(persona.systemPrompt).toBeTruthy();
      }
    });

    it('has unique persona ids', () => {
      const ids = AI_PERSONAS.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('contains specific expected personas', () => {
      const ids = AI_PERSONAS.map(p => p.id);
      expect(ids).toContain('elara');
      expect(ids).toContain('ruby');
      expect(ids).toContain('solara');
      expect(ids).toContain('study_buddy');
    });
  });

  describe('INITIAL_FEEDBACK', () => {
    it('contains feedback posts', () => {
      expect(INITIAL_FEEDBACK.length).toBeGreaterThan(0);
    });

    it('each feedback post has required fields', () => {
      for (const fb of INITIAL_FEEDBACK) {
        expect(fb).toHaveProperty('id');
        expect(fb).toHaveProperty('author');
        expect(fb).toHaveProperty('role');
        expect(fb).toHaveProperty('text');
        expect(fb).toHaveProperty('votes');
        expect(fb).toHaveProperty('category');
        expect(fb).toHaveProperty('status');
        expect(fb).toHaveProperty('createdAt');
        expect(fb).toHaveProperty('replies');
        expect(typeof fb.votes).toBe('number');
        expect(['facilities', 'academic', 'events', 'other']).toContain(fb.category);
        expect(['pending', 'in-progress', 'solved', 'planned']).toContain(fb.status);
        expect(Array.isArray(fb.replies)).toBe(true);
      }
    });

    it('has unique ids', () => {
      const ids = INITIAL_FEEDBACK.map(f => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('INITIAL_MATERIALS', () => {
    it('contains materials', () => {
      expect(INITIAL_MATERIALS.length).toBeGreaterThan(0);
    });

    it('each material has required fields', () => {
      for (const mat of INITIAL_MATERIALS) {
        expect(mat).toHaveProperty('id');
        expect(mat).toHaveProperty('title');
        expect(mat).toHaveProperty('subject');
        expect(mat).toHaveProperty('type');
        expect(mat).toHaveProperty('description');
        expect(mat).toHaveProperty('uploadedBy');
        expect(mat).toHaveProperty('createdAt');
        expect(mat.id).toBeTruthy();
        expect(mat.title).toBeTruthy();
      }
    });

    it('has unique ids', () => {
      const ids = INITIAL_MATERIALS.map(m => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('MOCK_SCHEDULES', () => {
    it('contains schedule items', () => {
      expect(MOCK_SCHEDULES.length).toBeGreaterThan(0);
    });

    it('each schedule item has required fields', () => {
      for (const item of MOCK_SCHEDULES) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('subject');
        expect(item).toHaveProperty('time');
        expect(item).toHaveProperty('day');
        expect(item.id).toBeTruthy();
        expect(item.subject).toBeTruthy();
        expect(item.time).toMatch(/\d{2}:\d{2}/);
      }
    });

    it('has unique ids', () => {
      const ids = MOCK_SCHEDULES.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
