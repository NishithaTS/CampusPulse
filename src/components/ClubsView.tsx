import React, { useState, useEffect } from 'react';
import { Users, Bookmark, Sparkles, Check, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { Club, EventItem } from '../types.ts';
import { api } from '../services/api.ts';

interface ClubsViewProps {
  onSelectEvent: (event: EventItem) => void;
}

export const ClubsView: React.FC<ClubsViewProps> = ({ onSelectEvent }) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const list = await api.getClubs();
      setClubs(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleToggleFollow = async (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.toggleFollowClub(clubId);
      setClubs((prev) =>
        prev.map((c) =>
          c.id === clubId ? { ...c, isFollowed: res.isFollowed, followedCount: res.followedCount } : c
        )
      );
      if (selectedClub && selectedClub.id === clubId) {
        setSelectedClub((prev) =>
          prev ? { ...prev, isFollowed: res.isFollowed, followedCount: res.followedCount } : null
        );
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenClubDetails = async (clubId: string) => {
    try {
      const detail = await api.getClub(clubId);
      setSelectedClub(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClubs = clubs.filter(
    (c) => selectedCategory === 'All' || c.category.toLowerCase() === selectedCategory.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Campus Clubs & Societies</h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-medium">
            Follow official societies to receive instant notifications and priority event recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-300 text-xs font-semibold outline-none bg-white"
          >
            <option value="All">All Disciplines</option>
            <option value="Technical">Technical</option>
            <option value="Cultural">Cultural</option>
            <option value="Sports">Sports</option>
            <option value="Entrepreneurship">Entrepreneurship</option>
          </select>
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClubs.map((club) => (
          <div
            key={club.id}
            onClick={() => handleOpenClubDetails(club.id)}
            className="bg-white rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all p-5 flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <img
                  src={club.logo}
                  alt={club.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-neutral-200 shadow-xs group-hover:scale-105 transition-transform"
                />
                <button
                  type="button"
                  onClick={(e) => handleToggleFollow(club.id, e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs ${
                    club.isFollowed
                      ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {club.isFollowed ? 'Following' : '+ Follow'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                  {club.category}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">[{club.code}]</span>
              </div>

              <h3 className="text-base font-bold text-neutral-900 group-hover:text-red-600 transition-colors">
                {club.name}
              </h3>
              <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2 leading-relaxed">
                {club.description}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5" />
                {club.followedCount} followers
              </span>
              <span className="font-semibold text-red-600 group-hover:underline flex items-center gap-1">
                View Club Page <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Club Detailed Modal */}
      {selectedClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-neutral-200 flex items-start justify-between bg-neutral-50">
              <div className="flex items-center gap-4">
                <img
                  src={selectedClub.logo}
                  alt={selectedClub.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-neutral-300"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-neutral-900">{selectedClub.name}</h3>
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-xs text-neutral-500">{selectedClub.category} • Faculty: {selectedClub.facultyCoordinator}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClub(null)}
                className="p-2 rounded-xl hover:bg-neutral-200 text-neutral-500"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div>
                <h4 className="font-bold text-neutral-800 text-sm mb-1">About the Society</h4>
                <p className="text-neutral-600 leading-relaxed">{selectedClub.description}</p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-neutral-400 font-bold block mb-0.5">Faculty In-charge</span>
                  <span className="font-semibold text-neutral-900">{selectedClub.facultyCoordinator}</span>
                </div>
                <div>
                  <span className="text-neutral-400 font-bold block mb-0.5">Student Leads</span>
                  <span className="font-semibold text-neutral-900">
                    {selectedClub.studentCoordinators?.join(', ') || 'Student Council'}
                  </span>
                </div>
              </div>

              {/* Upcoming Events by this Club */}
              <div className="space-y-2">
                <h4 className="font-bold text-neutral-800 text-sm">Upcoming Events by this Club</h4>
                {selectedClub.upcomingEvents && selectedClub.upcomingEvents.length > 0 ? (
                  selectedClub.upcomingEvents.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => {
                        setSelectedClub(null);
                        onSelectEvent(e);
                      }}
                      className="p-3 bg-white rounded-2xl border border-neutral-200 hover:border-red-400 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <h5 className="font-bold text-neutral-900">{e.title}</h5>
                        <span className="text-[11px] text-neutral-500">{e.date} • {e.venueName}</span>
                      </div>
                      <span className="text-red-600 font-semibold text-xs flex items-center gap-1">
                        Register <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-400 italic py-2">No upcoming events currently scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
