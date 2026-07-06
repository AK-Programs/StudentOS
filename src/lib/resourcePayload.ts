/**
 * Builds the common payload shape used when saving a school resource or
 * assignment to Supabase.  Previously duplicated between
 * SimpleResourceManager and AssignmentUploadForm.
 */
export interface ResourceSaveInput {
  id?: string;
  type: string;
  title: string;
  content: string;
  fileUrl?: string | null;
  storagePath?: string | null;
  galleryUrls?: { url: string; name: string }[];
  fileName?: string | null;
  dueDate?: string | null;
  targetGrade?: string;
  targetSection?: string;
  author?: string;
  existingCreatedAt?: number;
}

export function buildResourcePayload(input: ResourceSaveInput) {
  const now = Date.now();
  return {
    id: input.id || `res-${now}-${Math.random().toString(36).substring(2, 9)}`,
    type: input.type || 'resource',
    resourceType: input.type || 'resource',
    title: input.title || '',
    content: input.content || '',
    description: input.content || '',
    url: input.fileUrl || null,
    fileUrl: input.fileUrl || null,
    fileData: input.fileUrl || null,
    storagePath: input.storagePath || null,
    galleryUrls: input.galleryUrls || [],
    fileName: input.fileName || null,
    dueDate: input.dueDate || null,
    targetGrade: input.targetGrade || 'All Grades',
    class: input.targetGrade || 'All Grades',
    targetSection: input.targetSection || 'All Sections',
    section: input.targetSection || 'All Sections',
    createdAt: input.existingCreatedAt || now,
    created_at: input.existingCreatedAt || now,
    author: input.author || 'Teacher',
  };
}

/**
 * Returns the Supabase table name for a given resource category.
 */
export function getResourceTableName(category: string): 'assignments' | 'school_resources' {
  return category === 'assignment' ? 'assignments' : 'school_resources';
}
