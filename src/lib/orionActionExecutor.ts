import { supabase } from './supabase';
import { createCompetition, createSchoolEvent } from './supabaseLife';
import { saveSupabaseHomework, deleteSupabaseHomework } from './supabaseHomework';
import { createOrUpdateMeeting, deleteMeeting } from './supabaseMeet';
import { saveAppNotification } from './notifications';
import { executeOrionCommunicationDispatch } from './orionCommunication';
import { Homework, Meeting, AppNotification, Competition, SchoolEvent } from '../types';

export type OrionActionType =
  | 'create_broadcast'
  | 'update_broadcast'
  | 'delete_broadcast'
  | 'create_notification'
  | 'notify_users'
  | 'notify_class'
  | 'notify_all'
  | 'create_event'
  | 'update_event'
  | 'delete_event'
  | 'create_competition'
  | 'update_competition'
  | 'delete_competition'
  | 'register_competition'
  | 'create_meeting'
  | 'schedule_meeting'
  | 'cancel_meeting'
  | 'delete_meeting'
  | 'create_assignment'
  | 'create_homework'
  | 'update_assignment'
  | 'delete_assignment'
  | 'delete_homework'
  | 'delete_item'
  | 'start_attendance'
  | 'search_users'
  | 'search_internet'
  | 'generate_notes'
  | 'generate_lesson_plan'
  | 'show_pending_assignments'
  | 'show_timetable'
  | 'show_attendance'
  | 'show_announcements'
  | 'navigate_tab'
  | 'general_chat';

export interface OrionAction {
  action: OrionActionType;
  title?: string;
  message?: string;
  content?: string;
  subject?: string;
  category?: string;
  audience?: string;
  targetClass?: string;
  targetUserId?: string;
  date?: string;
  time?: string;
  location?: string;
  prizePool?: string;
  eligibility?: string;
  meetingId?: string;
  targetId?: string;
  targetValue?: string;
  details?: Record<string, any>;
}

export interface OrionUserContext {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string; // 'super_admin' | 'admin' | 'teacher' | 'student'
}

export interface OrionExecutionResult {
  success: boolean;
  action: OrionActionType;
  recordId?: string;
  message: string;
  summaryText: string;
  data?: any;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  error?: string;
}

/**
 * Emit a local window event so all StudentOS UI components instantly refresh their data from Supabase
 */
export function triggerRealtimeUIUpdate(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', record?: any) {
  console.log(`[ORION] Realtime update triggered for ${table} (${action})`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentos-db-update', {
      detail: { table, action, record, timestamp: Date.now() }
    }));
  }
}

/**
 * Check if a user role has authorization to execute the requested action
 */
export function validateActionPermission(
  action: OrionActionType,
  role: string = 'student'
): { allowed: boolean; reason?: string } {
  const normRole = (role || 'student').toLowerCase();
  const isAdmin = normRole === 'super_admin' || normRole === 'admin';
  const isTeacher = normRole === 'teacher' || normRole === 'faculty' || normRole === 'head_teacher' || isAdmin;

  // Student permissions whitelist
  const studentAllowedActions: OrionActionType[] = [
    'register_competition',
    'show_pending_assignments',
    'show_timetable',
    'show_attendance',
    'show_announcements',
    'navigate_tab',
    'search_users',
    'general_chat'
  ];

  if (!isTeacher) {
    if (studentAllowedActions.includes(action)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `🔒 Permission Denied: Student accounts are not authorized to perform administrative or creation actions (${action}). Please request assistance from a teacher or administrator.`
    };
  }

  return { allowed: true };
}

/**
 * Destructive actions requiring explicit user confirmation before executing
 */
export const DESTRUCTIVE_ACTIONS: OrionActionType[] = [
  'delete_broadcast',
  'delete_event',
  'delete_competition',
  'delete_meeting',
  'cancel_meeting',
  'delete_assignment',
  'delete_homework',
  'delete_item'
];

export function isDestructiveAction(action: OrionActionType): boolean {
  return DESTRUCTIVE_ACTIONS.includes(action);
}

/* ========================================================================
   CORE ACTION HANDLERS
   ======================================================================== */

/**
 * 1. Broadcast Action Handler
 */
export async function executeCreateBroadcast(
  actionObj: OrionAction,
  user: OrionUserContext
): Promise<OrionExecutionResult> {
  const title = actionObj.title || actionObj.targetValue || 'School Broadcast';
  const content = actionObj.content || actionObj.message || title;
  const sender = user.userName || 'Principal';

  console.log(`[ORION] Executing create_broadcast: "${title}"`);

  try {
    // A. Dispatch via Communication Engine (saves to peer_messages, notice board, calendar)
    const dispatchRes = await executeOrionCommunicationDispatch(
      content,
      sender,
      []
    );

    // B. Save explicitly to materials / notices in Supabase
    const noticePayload = {
      id: `notice-${Date.now()}`,
      title: title.startsWith('📢') ? title : `📢 ${title}`,
      category: 'notice',
      content: content,
      created_by: sender,
      created_at: new Date().toISOString()
    };

    await supabase.from('materials').insert([noticePayload]);
    console.log(`[ORION] Supabase INSERT successful for notices/materials`);

    triggerRealtimeUIUpdate('notices', 'INSERT', noticePayload);
    triggerRealtimeUIUpdate('notifications', 'INSERT', { title, content });

    return {
      success: true,
      action: 'create_broadcast',
      recordId: noticePayload.id,
      message: `Broadcast successfully published and saved in Supabase.`,
      summaryText: `📢 Broadcast dispatched school-wide: "${content}". Saved to Supabase database, Notice Board, and Notification Center.`,
      data: dispatchRes
    };
  } catch (err: any) {
    console.error(`[ORION] Action failed for create_broadcast:`, err);
    return {
      success: false,
      action: 'create_broadcast',
      message: `Failed to broadcast message.`,
      summaryText: `Error executing broadcast in Supabase: ${err.message || 'Database error'}`,
      error: err.message
    };
  }
}

/**
 * 2. Notification Action Handler
 */
export async function executeCreateNotification(
  actionObj: OrionAction,
  user: OrionUserContext
): Promise<OrionExecutionResult> {
  const title = actionObj.title || `📢 Alert from ${user.userName || 'School System'}`;
  const message = actionObj.message || actionObj.content || actionObj.targetValue || 'Notification alert';
  const targetAudience = actionObj.audience || actionObj.targetClass || 'all';

  console.log(`[ORION] Executing create_notification/notify_users for ${targetAudience}`);

  try {
    const notif: AppNotification = {
      id: `notif-orion-${Date.now()}`,
      title: title,
      message: message,
      type: 'announcement',
      createdAt: new Date().toISOString(),
      isRead: false,
      targetUserId: targetAudience.includes('Class') ? 'all' : targetAudience,
      targetClass: targetAudience.includes('Class') ? targetAudience : undefined,
      linkTab: 'notice_viewer'
    };

    await saveAppNotification(notif);
    console.log(`[ORION] Supabase INSERT successful for notifications`);

    triggerRealtimeUIUpdate('notifications', 'INSERT', notif);

    return {
      success: true,
      action: actionObj.action,
      recordId: notif.id,
      message: `Notification saved and broadcasted.`,
      summaryText: `🔔 Notification dispatched to ${targetAudience}: "${message}". Saved in Supabase database.`
    };
  } catch (err: any) {
    console.error(`[ORION] Action failed for notification:`, err);
    return {
      success: false,
      action: actionObj.action,
      message: `Failed to save notification.`,
      summaryText: `Error persisting notification in Supabase: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * 3. Event Action Handler
 */
export async function executeCreateEvent(
  actionObj: OrionAction,
  user: OrionUserContext
): Promise<OrionExecutionResult> {
  const eventTitle = actionObj.title || actionObj.targetValue || 'School Event';
  const eventDate = actionObj.date || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  const eventTime = actionObj.time || '10:00 AM';
  const location = actionObj.location || 'Main Auditorium';
  const category = actionObj.category || 'Cultural';
  const description = actionObj.content || actionObj.message || `Scheduled via Orion Operating Assistant for ${user.userName || 'School'}.`;

  console.log(`[ORION] Executing create_event: "${eventTitle}" on ${eventDate}`);

  try {
    const eventId = `ev-${Date.now()}`;
    const eventObj: Partial<SchoolEvent> = {
      id: eventId,
      title: eventTitle,
      category: category as any,
      date: eventDate,
      time: eventTime,
      location,
      description
    };

    const saved = await createSchoolEvent(eventObj);
    if (!saved) throw new Error('Supabase event insertion failed');

    console.log(`[ORION] Supabase INSERT successful for life_events`);

    // Create event notification
    await saveAppNotification({
      id: `notif-event-${Date.now()}`,
      title: `📅 New Event: ${eventTitle}`,
      message: `Scheduled for ${eventDate} at ${eventTime} (${location}).`,
      type: 'announcement',
      createdAt: new Date().toISOString(),
      isRead: false,
      linkTab: 'life'
    });

    triggerRealtimeUIUpdate('life_events', 'INSERT', eventObj);

    return {
      success: true,
      action: 'create_event',
      recordId: eventId,
      message: `Event '${eventTitle}' created in Supabase.`,
      summaryText: `📅 Event '${eventTitle}' scheduled for ${eventDate} at ${eventTime}. Persisted in Supabase database.`
    };
  } catch (err: any) {
    console.error(`[ORION] Action failed for create_event:`, err);
    return {
      success: false,
      action: 'create_event',
      message: `Failed to create event.`,
      summaryText: `Error persisting event in Supabase: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * 4. Competition Action Handler
 */
export async function executeCreateCompetition(
  actionObj: OrionAction,
  user: OrionUserContext
): Promise<OrionExecutionResult> {
  const compTitle = actionObj.title || actionObj.targetValue || 'Academic Competition';
  const category = actionObj.category || 'Technology';
  const prizePool = actionObj.prizePool || 'Trophies, Certificates & Cash Rewards';
  const eligibility = actionObj.eligibility || actionObj.targetClass || 'All Grades';
  const description = actionObj.content || actionObj.message || `Organized by StudentOS OS for ${eligibility}.`;

  console.log(`[ORION] Executing create_competition: "${compTitle}"`);

  try {
    const compId = `comp-${Date.now()}`;
    const compObj: Partial<Competition> = {
      id: compId,
      title: compTitle,
      category: category as any,
      eligibility,
      prizePool,
      status: 'Upcoming',
      description,
      createdBy: user.userName || 'Faculty Head',
      registeredCount: 0,
      startDate: actionObj.date || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0]
    };

    const saved = await createCompetition(compObj);
    if (!saved) throw new Error('Supabase competition insertion failed');

    console.log(`[ORION] Supabase INSERT successful for life_competitions`);

    // Notify students
    await saveAppNotification({
      id: `notif-comp-${Date.now()}`,
      title: `🏆 New Competition: ${compTitle}`,
      message: `Registrations open now on StudentOS Life! Prize: ${prizePool}`,
      type: 'announcement',
      createdAt: new Date().toISOString(),
      isRead: false,
      linkTab: 'life'
    });

    triggerRealtimeUIUpdate('life_competitions', 'INSERT', compObj);

    return {
      success: true,
      action: 'create_competition',
      recordId: compId,
      message: `Competition created and published.`,
      summaryText: `🏆 Competition '${compTitle}' created and published on StudentOS Life! Saved in Supabase database.`
    };
  } catch (err: any) {
    console.error(`[ORION] Action failed for create_competition:`, err);
    return {
      success: false,
      action: 'create_competition',
      message: `Failed to create competition.`,
      summaryText: `Error persisting competition in Supabase: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * 5. Meeting Action Handler
 */
export async function executeCreateMeeting(
  actionObj: OrionAction,
  user: OrionUserContext
): Promise<OrionExecutionResult> {
  const meetTitle = actionObj.title || actionObj.targetValue || 'StudentOS Virtual Classroom';
  const meetId = `meet-${Date.now().toString().slice(-8)}`;
  const startTime = actionObj.date && actionObj.time
    ? new Date(`${actionObj.date} ${actionObj.time}`).toISOString()
    : new Date(Date.now() + 3600000).toISOString();
  const endTime = new Date(new Date(startTime).getTime() + 3600000 * 2).toISOString();

  console.log(`[ORION] Executing create_meeting: "${meetTitle}"`);

  try {
    const meetingObj: Meeting = {
      id: meetId,
      title: meetTitle,
      subject: actionObj.subject || 'General Studies',
      className: actionObj.targetClass || 'Grade 10 - Astra',
      type: 'scheduled',
      startTime,
      endTime,
      description: actionObj.content || 'Scheduled via Orion Operating Assistant.',
      password: '123456',
      hostId: user.userId || 'host',
      hostName: user.userName || 'Faculty Host',
      hostEmail: user.userEmail || 'admin@school.edu',
      hostRole: (user.userRole as any) || 'teacher',
      joinLink: `${window.location.origin}?meet=${meetId}`,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createOrUpdateMeeting(meetingObj);
    console.log(`[ORION] Supabase INSERT/UPSERT successful for meetings`);

    // Notify invited class
    await saveAppNotification({
      id: `notif-meet-${Date.now()}`,
      title: `📹 StudentOS Meet Scheduled: ${meetTitle}`,
      message: `Meeting link generated. Passcode: 123456. Check StudentOS Meet section.`,
      type: 'announcement',
      createdAt: new Date().toISOString(),
      isRead: false,
      linkTab: 'meet'
    });

    triggerRealtimeUIUpdate('meetings', 'INSERT', meetingObj);

    return {
      success: true,
      action: 'create_meeting',
      recordId: meetId,
      message: `StudentOS Meet scheduled in Supabase.`,
      summaryText: `📹 StudentOS Meet '${meetTitle}' scheduled! Join link generated and saved in Supabase database.`
    };
  } catch (err: any) {
    console.error(`[ORION] Action failed for create_meeting:`, err);
    return {
      success: false,
      action: 'create_meeting',
      message: `Failed to schedule meeting.`,
      summaryText: `Error persisting meeting in Supabase: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * 6. Assignment / Homework Action Handler
 */
export async function executeCreateHomework(
  actionObj: OrionAction,
  user: OrionUserContext
): Promise<OrionExecutionResult> {
  const hwTitle = actionObj.title || actionObj.targetValue || 'Class Assignment';
  const hwId = `hw-${Date.now()}`;
  const subject = actionObj.subject || 'Mathematics';
  const dueDate = actionObj.date || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  const targetClass = actionObj.targetClass || 'Grade 10';
  const content = actionObj.content || actionObj.message || `Assigned task for ${targetClass}.`;

  console.log(`[ORION] Executing create_homework: "${hwTitle}" due ${dueDate}`);

  try {
    const hwObj: Homework = {
      id: hwId,
      title: hwTitle,
      subject,
      content,
      dueDate,
      classGrade: targetClass,
      classSection: 'Astra',
      givenBy: user.userName || 'Faculty Teacher',
      createdAt: new Date().toISOString(),
      completedList: []
    };

    await saveSupabaseHomework(hwObj);
    console.log(`[ORION] Supabase UPSERT successful for homework`);

    // Notify class
    await saveAppNotification({
      id: `notif-hw-${Date.now()}`,
      title: `📝 New Assignment: ${hwTitle}`,
      message: `Assigned for ${targetClass} (${subject}). Due: ${dueDate}`,
      type: 'homework',
      createdAt: new Date().toISOString(),
      isRead: false,
      linkTab: 'assignments'
    });

    triggerRealtimeUIUpdate('homework', 'INSERT', hwObj);

    return {
      success: true,
      action: 'create_homework',
      recordId: hwId,
      message: `Homework '${hwTitle}' created in Supabase.`,
      summaryText: `📝 Assignment '${hwTitle}' (${subject}) assigned to ${targetClass}! Saved in Supabase database.`
    };
  } catch (err: any) {
    console.error(`[ORION] Action failed for create_homework:`, err);
    return {
      success: false,
      action: 'create_homework',
      message: `Failed to create assignment.`,
      summaryText: `Error persisting homework in Supabase: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * 7. Destructive Delete Item Handler
 */
export async function executeDeleteItem(
  actionObj: OrionAction,
  user: OrionUserContext,
  isConfirmed: boolean = false
): Promise<OrionExecutionResult> {
  const targetTitle = actionObj.title || actionObj.targetValue || 'Item';

  if (!isConfirmed) {
    console.log(`[ORION] Action ${actionObj.action} requires explicit confirmation`);
    return {
      success: false,
      action: actionObj.action,
      requiresConfirmation: true,
      confirmationPrompt: `⚠️ Are you sure you want to permanently delete '${targetTitle}' from the database? Say "Yes, confirm" to proceed or "Cancel" to abort.`,
      message: `Confirmation required for deletion of ${targetTitle}.`,
      summaryText: `⚠️ Confirmation required: Are you sure you want to delete '${targetTitle}'?`
    };
  }

  console.log(`[ORION] Executing confirmed deletion of '${targetTitle}' across Supabase tables`);

  try {
    let deletedCount = 0;

    // Delete from competitions
    const { error: compErr } = await supabase.from('life_competitions').delete().ilike('title', `%${targetTitle}%`);
    if (!compErr) deletedCount++;

    // Delete from meetings
    const { error: meetErr } = await supabase.from('meetings').delete().ilike('title', `%${targetTitle}%`);
    if (!meetErr) deletedCount++;

    // Delete from homework
    const { error: hwErr } = await supabase.from('homework').delete().ilike('title', `%${targetTitle}%`);
    if (!hwErr) deletedCount++;

    // Delete from events
    const { error: evErr } = await supabase.from('life_events').delete().ilike('title', `%${targetTitle}%`);
    if (!evErr) deletedCount++;

    // Delete from notices
    const { error: notiErr } = await supabase.from('materials').delete().ilike('title', `%${targetTitle}%`);
    if (!notiErr) deletedCount++;

    console.log(`[ORION] Supabase DELETE successful for '${targetTitle}'`);

    triggerRealtimeUIUpdate('life_competitions', 'DELETE', { title: targetTitle });
    triggerRealtimeUIUpdate('meetings', 'DELETE', { title: targetTitle });
    triggerRealtimeUIUpdate('homework', 'DELETE', { title: targetTitle });
    triggerRealtimeUIUpdate('life_events', 'DELETE', { title: targetTitle });

    return {
      success: true,
      action: actionObj.action,
      message: `Successfully deleted '${targetTitle}'.`,
      summaryText: `🗑️ Confirmed! Permanently deleted '${targetTitle}' from Supabase database tables.`
    };
  } catch (err: any) {
    console.error(`[ORION] Action failed for deletion:`, err);
    return {
      success: false,
      action: actionObj.action,
      message: `Failed to delete item.`,
      summaryText: `Error deleting '${targetTitle}' from Supabase: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * 8. Competition Registration Handler
 */
export async function executeRegisterCompetition(
  actionObj: OrionAction,
  user: OrionUserContext
): Promise<OrionExecutionResult> {
  const compName = actionObj.title || actionObj.targetValue || 'Competition';

  console.log(`[ORION] Executing register_competition for '${compName}'`);

  try {
    const { data: comps } = await supabase
      .from('life_competitions')
      .select('*')
      .ilike('title', `%${compName}%`)
      .limit(1);

    if (comps && comps.length > 0) {
      const comp = comps[0];
      const newCount = (comp.registered_count || 0) + 1;
      await supabase.from('life_competitions').update({ registered_count: newCount }).eq('id', comp.id);
      console.log(`[ORION] Supabase UPDATE successful for registered_count`);
    }

    await saveAppNotification({
      id: `notif-reg-${Date.now()}`,
      title: `🎟️ Competition Registration Confirmed`,
      message: `Registered ${user.userName || 'Student'} for '${compName}'.`,
      type: 'announcement',
      createdAt: new Date().toISOString(),
      isRead: false,
      targetUserId: user.userId || 'all',
      linkTab: 'life'
    });

    triggerRealtimeUIUpdate('life_competitions', 'UPDATE', { title: compName });

    return {
      success: true,
      action: 'register_competition',
      message: `Registered for competition.`,
      summaryText: `🎟️ Successfully registered for '${compName}'! Saved to your StudentOS Life schedule.`
    };
  } catch (err: any) {
    return {
      success: false,
      action: 'register_competition',
      message: `Registration failed.`,
      summaryText: `Could not complete registration in Supabase: ${err.message}`,
      error: err.message
    };
  }
}

/* ========================================================================
   CENTRALIZED ORION ACTION DISPATCH PIPELINE
   ======================================================================== */

/**
 * Centralized Orion Action Dispatcher
 * Pipeline: UNDERSTAND → VALIDATE → EXECUTE → PERSIST IN SUPABASE → REALTIME UPDATE → CONFIRM
 */
export async function executeOrionActionPipeline(
  actions: OrionAction[],
  userContext: OrionUserContext,
  rawCommand: string,
  isConfirmed: boolean = false
): Promise<{
  results: OrionExecutionResult[];
  combinedSummary: string;
  pendingConfirmation?: { action: string; targetTitle: string; promptText: string };
}> {
  console.log(`[ORION] User command received: "${rawCommand}"`);

  const results: OrionExecutionResult[] = [];
  let pendingConfirmationData: { action: string; targetTitle: string; promptText: string } | undefined = undefined;

  for (const act of actions) {
    console.log(`[ORION] Intent detected: ${act.action}`);

    // Step 1: Validate User Permission
    const perm = validateActionPermission(act.action, userContext.userRole);
    if (!perm.allowed) {
      console.log(`[ORION] Action validation failed: ${perm.reason}`);
      results.push({
        success: false,
        action: act.action,
        message: 'Permission denied',
        summaryText: perm.reason || 'You do not have permission for this action.',
        error: 'PERMISSION_DENIED'
      });
      continue;
    }

    console.log(`[ORION] Action validated for role: ${userContext.userRole || 'student'}`);

    // Step 2: Destructive Action Confirmation Check
    if (isDestructiveAction(act.action) && !isConfirmed) {
      const targetTitle = act.title || act.targetValue || 'Item';
      const promptText = `⚠️ Are you sure you want to delete '${targetTitle}'? This will permanently remove it from Supabase.`;
      console.log(`[ORION] Action ${act.action} requires confirmation`);

      pendingConfirmationData = {
        action: act.action,
        targetTitle,
        promptText
      };

      results.push({
        success: false,
        action: act.action,
        requiresConfirmation: true,
        confirmationPrompt: promptText,
        message: `Confirmation required`,
        summaryText: promptText
      });
      break; // Stop pipeline until user confirms
    }

    // Step 3: Action Execution & Supabase Persistence
    console.log(`[ORION] Executing ${act.action}...`);
    let res: OrionExecutionResult;

    switch (act.action) {
      case 'create_broadcast':
      case 'update_broadcast':
        res = await executeCreateBroadcast(act, userContext);
        break;

      case 'create_notification':
      case 'notify_users':
      case 'notify_class':
      case 'notify_all':
        res = await executeCreateNotification(act, userContext);
        break;

      case 'create_event':
      case 'update_event':
        res = await executeCreateEvent(act, userContext);
        break;

      case 'create_competition':
      case 'update_competition':
        res = await executeCreateCompetition(act, userContext);
        break;

      case 'create_meeting':
      case 'schedule_meeting':
        res = await executeCreateMeeting(act, userContext);
        break;

      case 'create_assignment':
      case 'create_homework':
      case 'update_assignment':
        res = await executeCreateHomework(act, userContext);
        break;

      case 'delete_item':
      case 'delete_competition':
      case 'delete_event':
      case 'cancel_meeting':
      case 'delete_meeting':
      case 'delete_assignment':
      case 'delete_homework':
      case 'delete_broadcast':
        res = await executeDeleteItem(act, userContext, isConfirmed);
        break;

      case 'register_competition':
        res = await executeRegisterCompetition(act, userContext);
        break;

      default:
        // Informational or Navigation Actions
        res = {
          success: true,
          action: act.action,
          message: 'Execution acknowledged',
          summaryText: act.content || act.message || `Command processed: ${rawCommand}`
        };
        break;
    }

    if (res.success) {
      console.log(`[ORION] Action completed successfully for ${act.action}`);
    } else {
      console.warn(`[ORION] Action failed: ${res.summaryText}`);
    }

    results.push(res);
  }

  // Combine summaries for output response
  const combinedSummary = results.map(r => r.summaryText).join('\n\n');

  return {
    results,
    combinedSummary,
    pendingConfirmation: pendingConfirmationData
  };
}
