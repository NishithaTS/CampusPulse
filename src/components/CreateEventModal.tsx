import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Venue, CustomField, EventItem } from '../types.ts';

interface CreateEventModalProps {
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onEventCreated }) => {
  const [step, setStep] = useState<number>(1);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Technical');
  const [tagsInput, setTagsInput] = useState('AI, Workshop, Engineering');
  const [posterUrl, setPosterUrl] = useState('https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&auto=format&fit=crop&q=80');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:30');
  const [venueId, setVenueId] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [eligibility, setEligibility] = useState('Open to all registered students with campus ID');
  const [entryRequirements, setEntryRequirements] = useState('Bring student ID card & laptop if needed');
  const [contactInfo, setContactInfo] = useState('events@college.edu');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerRole, setSpeakerRole] = useState('');
  const [speakerTopic, setSpeakerTopic] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // AI Extraction State
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [aiDetectedBanner, setAiDetectedBanner] = useState<string | null>(null);

  // Duplicate Detection State
  const [duplicateWarning, setDuplicateWarning] = useState<{ isDuplicate: boolean; match?: any; score: number; reason?: string } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [dismissDuplicate, setDismissDuplicate] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const vList = await api.getVenues();
        setVenues(vList);
        if (vList.length > 0 && !venueId) {
          setVenueId(vList[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVenues(false);
      }
    };
    fetchVenues();

    // Default date to 3 days ahead
    const d = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    setDate(d);
  }, []);

  // Pre-flight duplicate check on step changes or title/date changes
  const checkDuplicateEvent = async () => {
    if (!title || !date) return;
    try {
      setIsCheckingDuplicate(true);
      const res = await api.checkDuplicate({ title, date, startTime, venueId });
      if (res.isDuplicate) {
        setDuplicateWarning(res);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      // Non-blocking
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handlePosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPosterUrl(base64);

      // Trigger Gemini AI Poster Extraction
      try {
        setIsExtractingAI(true);
        setError(null);
        const res = await api.extractPosterAI(base64, file.type);
        if (res.success && res.data) {
          const data = res.data;
          if (data.title) setTitle(data.title);
          if (data.category) setCategory(data.category);
          if (data.tags && Array.isArray(data.tags)) setTagsInput(data.tags.join(', '));
          if (data.date) setDate(data.date);
          if (data.startTime) setStartTime(data.startTime);
          if (data.endTime) setEndTime(data.endTime);
          if (data.description) setDescription(data.description);
          if (data.speakerName) setSpeakerName(data.speakerName);
          if (data.speakerRole) setSpeakerRole(data.speakerRole);
          if (data.speakerTopic) setSpeakerTopic(data.speakerTopic);
          if (data.capacity) setCapacity(Number(data.capacity));
          if (data.eligibility) setEligibility(data.eligibility);
          if (data.entryRequirements) setEntryRequirements(data.entryRequirements);
          if (data.contactInfo) setContactInfo(data.contactInfo);

          setAiDetectedBanner(`AI detected event data with ${data.confidenceScore || 94}% confidence. Please review the populated fields below.`);
        }
      } catch (err: any) {
        console.warn('AI poster extraction failed:', err);
      } finally {
        setIsExtractingAI(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      label: 'GitHub Profile or Portfolio Link',
      type: 'text',
      required: false,
    };
    setCustomFields([...customFields, newField]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const handleSubmit = async (submitStatus: 'draft' | 'pending_approval' | 'published') => {
    if (!title || !description || !date || !venueId) {
      setError('Please provide all mandatory fields: Title, Description, Date, and Venue.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const eventPayload = {
        title,
        description,
        category,
        tags: parsedTags,
        posterUrl,
        date,
        startTime,
        endTime,
        venueId,
        capacity: Number(capacity),
        waitlistEnabled,
        eligibility,
        entryRequirements,
        contactInfo,
        speaker: speakerName ? { name: speakerName, role: speakerRole, topic: speakerTopic } : undefined,
        customFields,
        status: submitStatus,
      };

      const res = await api.createEvent(eventPayload);
      if (res.success) {
        onEventCreated(res.event);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Step Stepper */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900">Create Campus Event</h3>
            <p className="text-xs text-neutral-500">Step {step} of 4 • {step === 1 ? 'Basic Info & Poster' : step === 2 ? 'Schedule & Venue' : step === 3 ? 'Audience & Questions' : 'Speaker & Finalize'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper progress indicator */}
        <div className="w-full bg-neutral-100 h-1">
          <div
            className="bg-red-600 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Detected Banner */}
          {aiDetectedBanner && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-50 to-indigo-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
              <Sparkles className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">✨ AI Poster Extraction Applied</p>
                <p className="text-red-700 mt-0.5">{aiDetectedBanner}</p>
              </div>
              <button
                type="button"
                onClick={() => setAiDetectedBanner(null)}
                className="text-red-500 hover:text-red-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Duplicate Event Warning Alert */}
          {duplicateWarning && duplicateWarning.isDuplicate && !dismissDuplicate && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-950">Possible Duplicate Event Detected ({duplicateWarning.score}% Match)</p>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    {duplicateWarning.reason || `A similar event "${duplicateWarning.match?.title}" is already scheduled on ${duplicateWarning.match?.date}.`}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setDismissDuplicate(true)}
                  className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 font-semibold hover:bg-amber-100"
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Basic Info & Poster Upload / AI Extraction */}
          {step === 1 && (
            <div className="space-y-4">
              {/* AI Poster Uploader Card */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 hover:bg-red-50/70 transition-colors text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  {isExtractingAI ? <Sparkles className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">Upload Event Poster to Auto-Fill with AI</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Upload an image or flyer and Gemini Vision will extract the title, speaker, date, venue, and tags.
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePosterFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isExtractingAI}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isExtractingAI ? 'Analyzing Poster with AI...' : 'Select Poster Image'}
                </button>
              </div>

              {/* Event Title */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KSIT Robotics Hackathon 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={checkDuplicateEvent}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-900 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              {/* Category & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-medium outline-none"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Academic">Academic</option>
                    <option value="Workshops">Workshops</option>
                    <option value="Hackathons">Hackathons</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Career">Career & Placement</option>
                    <option value="Entrepreneurship">Entrepreneurship</option>
                    <option value="Seminars">Seminars</option>
                    <option value="Competitions">Competitions</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="AI, Python, Coding, Networking"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Poster Image URL Preview */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Poster Preview / URL</label>
                <div className="flex items-center gap-3">
                  <img
                    src={posterUrl}
                    alt="Poster Preview"
                    className="w-16 h-12 rounded-lg object-cover border border-neutral-300 shrink-0"
                  />
                  <input
                    type="text"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="Image URL or uploaded file preview"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none text-neutral-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Full Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide complete details about event objectives, schedule highlights, prerequisites, and learning outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Date, Time & Venue */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onBlur={checkDuplicateEvent}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onBlur={checkDuplicateEvent}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none font-medium"
                  />
                </div>
              </div>

              {/* Venue Selector */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Campus Venue <span className="text-rose-500">*</span>
                </label>
                <select
                  value={venueId}
                  onChange={(e) => {
                    setVenueId(e.target.value);
                    const v = venues.find((x) => x.id === e.target.value);
                    if (v) setCapacity(v.capacity);
                  }}
                  onBlur={checkDuplicateEvent}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold outline-none"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.building} - {v.room}) • Capacity: {v.capacity} seats
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Venues are linked to the campus map and navigation system.
                </p>
              </div>

              {/* Capacity & Waitlist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none font-medium"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waitlistEnabled}
                      onChange={(e) => setWaitlistEnabled(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded-md"
                    />
                    <span className="font-semibold text-neutral-800">Enable automated waitlist if seats fill up</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Eligibility & Custom Registration Questions */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Eligibility Criteria</label>
                <input
                  type="text"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder="e.g. Open to all students / CS 3rd & 4th year only"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Entry Requirements</label>
                <input
                  type="text"
                  value={entryRequirements}
                  onChange={(e) => setEntryRequirements(e.target.value)}
                  placeholder="e.g. Bring college ID and laptop with charger"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none"
                />
              </div>

              {/* Custom Registration Fields */}
              <div className="pt-2 border-t border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Custom Registration Questions</h4>
                    <p className="text-[11px] text-neutral-500">Ask registrants specific questions during sign-up.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>

                {customFields.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic p-3 bg-neutral-50 rounded-xl text-center">
                    No custom questions added. Only standard student profile info will be collected.
                  </p>
                ) : (
                  customFields.map((field, index) => (
                    <div key={field.id} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const updated = [...customFields];
                            updated[index].label = e.target.value;
                            setCustomFields(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-300 text-xs font-semibold outline-none"
                        />
                      </div>
                      <label className="flex items-center gap-1 text-xs text-neutral-600">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => {
                            const updated = [...customFields];
                            updated[index].required = e.target.checked;
                            setCustomFields(updated);
                          }}
                          className="w-3.5 h-3.5 text-red-600 rounded"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Speaker & Contact Info */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="text-xs font-bold text-neutral-900">Featured Speaker / Guest Details (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Speaker Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Jane Smith"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">Speaker Designation / Role</label>
                    <input
                      type="text"
                      placeholder="e.g. Principal AI Scientist, Research Labs"
                      value={speakerRole}
                      onChange={(e) => setSpeakerRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Session Topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed LLMs on Campus Clusters"
                    value={speakerTopic}
                    onChange={(e) => setSpeakerTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Organizer Contact Information</label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Official club or faculty email for queries"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                <p className="font-semibold">Campus Verification Notice</p>
                <p className="text-red-700 mt-0.5">
                  Your event will be submitted to the Dean of Student Affairs / Administration for official verification and badge assignment before public listing.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="px-5 py-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!title || !description)) {
                    setError('Please provide a Title and Description.');
                    return;
                  }
                  setError(null);
                  setStep(step + 1);
                }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit('draft')}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit('pending_approval')}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
