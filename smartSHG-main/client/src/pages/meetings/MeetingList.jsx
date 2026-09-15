import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { meetingService } from '../../services/meetingService';
import { memberService } from '../../services/memberService';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import { formatDate } from '../../utils/formatters';
import {
  CalendarDays,
  PlusCircle,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  UserCheck,
  Check,
  X,
} from 'lucide-react';

export const MeetingList = () => {
  const { t } = useTranslation();
  const { activeGroup, isHead, user } = useAuth();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberAttendance, setMemberAttendance] = useState(null);

  // Create Meeting Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [time, setTime] = useState('10:30 AM');
  const [location, setLocation] = useState('Village Community Center');
  const [agenda, setAgenda] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  // Take Attendance Modal State
  const [attendanceMeeting, setAttendanceMeeting] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [attendeeStatuses, setAttendeeStatuses] = useState({}); // { memberId: 'PRESENT'|'ABSENT'|'LATE' }
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  const loadData = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError('');

      const [meetingsRes, membersRes, attendanceRes] = await Promise.all([
        meetingService.listMeetings(activeGroup._id || activeGroup.id),
        isHead
          ? memberService.listMembers(activeGroup._id || activeGroup.id, { status: 'ACTIVE' })
          : Promise.resolve({ success: true, members: [] }),
        !isHead ? meetingService.getMyAttendance(activeGroup._id || activeGroup.id) : Promise.resolve(null),
      ]);

      if (meetingsRes.success) setMeetings(meetingsRes.meetings || []);
      if (membersRes.success) setMembersList(membersRes.members || []);
      if (attendanceRes?.success) setMemberAttendance(attendanceRes);
    } catch (err) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGroup]);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      setSubmittingMeeting(true);
      await meetingService.createMeeting(activeGroup._id || activeGroup.id, {
        title,
        meetingDate,
        time,
        location,
        agenda,
        notes,
      });
      setShowCreateModal(false);
      setTitle('');
      setMeetingDate('');
      setAgenda('');
      setNotes('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create meeting');
    } finally {
      setSubmittingMeeting(false);
    }
  };

  const openAttendanceModal = (meeting) => {
    setAttendanceMeeting(meeting);
    const initial = {};
    membersList.forEach((m) => {
      initial[m._id] = 'PRESENT';
    });
    setAttendeeStatuses(initial);
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceMeeting) return;
    try {
      setSubmittingAttendance(true);
      const attendees = Object.entries(attendeeStatuses).map(([memberId, status]) => ({
        memberId,
        status,
      }));

      await meetingService.recordAttendance(
        activeGroup._id || activeGroup.id,
        attendanceMeeting._id,
        attendees
      );
      setAttendanceMeeting(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to record attendance');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('meetings.title')}
        subtitle={t('meetings.subtitle')}
        actionButton={
          isHead && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              {t('meetings.createMeeting')}
            </button>
          )
        }
      />

      {/* Member Attendance Overview Banner */}
      {!isHead && memberAttendance && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-900 uppercase">Your Attendance Track Record</p>
            <p className="text-sm font-semibold text-emerald-950 mt-0.5">
              Attended {memberAttendance.summary?.presentCount} of {memberAttendance.summary?.totalMeetings} meetings ({memberAttendance.summary?.attendancePercentage}%)
            </p>
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {memberAttendance.summary?.attendancePercentage}%
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading group meetings and minutes..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          description="Schedule a regular monthly meeting to maintain the Panchasutra and record member attendance."
          icon={CalendarDays}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetings.map((m) => (
            <div
              key={m._id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">{m.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(m.meetingDate)} at {m.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.location}</span>
                  </div>
                </div>
                <StatusBadge status={m.status} />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                <p className="font-semibold text-slate-700">Agenda:</p>
                <p className="text-slate-600 leading-relaxed">{m.agenda}</p>
                {m.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="font-semibold text-slate-700">Resolutions / Minutes:</p>
                    <p className="text-slate-600 italic leading-relaxed">{m.notes}</p>
                  </div>
                )}
              </div>

              {isHead && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => openAttendanceModal(m)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {m.status === 'COMPLETED' ? 'Update Attendance' : 'Take Attendance'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('meetings.createMeeting')}
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Savings & Internal Loan Distribution"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Meeting Date *
              </label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Time *
              </label>
              <input
                type="text"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:30 AM"
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Meeting Location *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Anganwadi Center / Community Hall"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Agenda *
            </label>
            <textarea
              required
              rows="2"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Key discussion items, savings targets, loan requests..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Minutes & Action Items (Optional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recorded resolutions, decisions, and tasks..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingMeeting}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50"
            >
              {submittingMeeting ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Take Attendance Modal */}
      {attendanceMeeting && (
        <Modal
          isOpen={Boolean(attendanceMeeting)}
          onClose={() => setAttendanceMeeting(null)}
          title={`Take Attendance - ${attendanceMeeting.title}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <p className="text-xs text-slate-500">
              Mark member attendance status for {formatDate(attendanceMeeting.meetingDate)}:
            </p>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto border rounded-xl">
              {membersList.map((m) => {
                const currentStatus = attendeeStatuses[m._id] || 'PRESENT';
                return (
                  <div key={m._id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{m.userId?.name}</p>
                      <p className="text-[10px] text-slate-400">{m.memberNumber}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {['PRESENT', 'LATE', 'ABSENT'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setAttendeeStatuses((prev) => ({ ...prev, [m._id]: st }))}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                            currentStatus === st
                              ? st === 'PRESENT'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : st === 'LATE'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setAttendanceMeeting(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAttendance}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50"
              >
                {submittingAttendance ? 'Saving...' : 'Save Attendance Register'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
