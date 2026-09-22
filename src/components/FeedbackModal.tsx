import React, { useState } from 'react';
import { X, Star, CheckCircle2, AlertTriangle } from 'lucide-react';
import { EventItem } from '../types.ts';
import { api } from '../services/api.ts';

interface FeedbackModalProps {
  event: EventItem;
  onClose: () => void;
  onFeedbackSubmitted: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  event,
  onClose,
  onFeedbackSubmitted,
}) => {
  const [overallRating, setOverallRating] = useState(5);
  const [contentRating, setContentRating] = useState(5);
  const [speakerRating, setSpeakerRating] = useState(5);
  const [organizationRating, setOrganizationRating] = useState(5);
  const [venueRating, setVenueRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api.submitFeedback(event.id, {
        overallRating,
        contentRating,
        speakerRating,
        organizationRating,
        venueRating,
        comment,
      });
      setSuccess(true);
      setTimeout(() => {
        onFeedbackSubmitted();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarSelector = (value: number, onChange: (val: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-1 text-neutral-300 hover:text-amber-400 focus:outline-none transition-colors"
        >
          <Star
            className={`w-5 h-5 ${
              star <= value ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Event Feedback</h3>
            <p className="text-xs text-neutral-500 truncate max-w-xs">{event.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-200 text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-neutral-900">Thank You for Your Feedback!</h4>
            <p className="text-xs text-neutral-600">
              Your response helps organizers and faculty improve campus events.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Overall Rating */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-neutral-900 block text-sm">Overall Experience</span>
                <span className="text-neutral-500 text-[11px]">How was the event as a whole?</span>
              </div>
              {renderStarSelector(overallRating, setOverallRating)}
            </div>

            {/* Dimensional Ratings */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                <span className="font-semibold text-neutral-700">Content Quality & Relevance</span>
                {renderStarSelector(contentRating, setContentRating)}
              </div>
              <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                <span className="font-semibold text-neutral-700">Speaker / Instructor</span>
                {renderStarSelector(speakerRating, setSpeakerRating)}
              </div>
              <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                <span className="font-semibold text-neutral-700">Organization & Punctuality</span>
                {renderStarSelector(organizationRating, setOrganizationRating)}
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-neutral-700">Venue & Facilities</span>
                {renderStarSelector(venueRating, setVenueRating)}
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="font-bold text-neutral-700 block mb-1">
                Comments & Suggestions (Optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like most? What can be improved for the next session?"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 outline-none text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Verified Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
