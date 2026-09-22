import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Users, Calendar, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { Venue, EventItem } from '../types.ts';
import { api } from '../services/api.ts';

interface CampusMapViewProps {
  events: EventItem[];
  selectedVenueId?: string;
  onSelectEvent: (event: EventItem) => void;
}

export const CampusMapView: React.FC<CampusMapViewProps> = ({
  events,
  selectedVenueId,
  onSelectEvent,
}) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [activeVenue, setActiveVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const list = await api.getVenues();
        setVenues(list);
        if (selectedVenueId) {
          const match = list.find((v) => v.id === selectedVenueId);
          if (match) setActiveVenue(match);
        } else if (list.length > 0) {
          setActiveVenue(list[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, [selectedVenueId]);

  // Events scheduled at active venue
  const venueEvents = activeVenue
    ? events.filter((e) => e.venueId === activeVenue.id && e.status === 'published')
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Interactive Campus Map & Venues
            </h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Explore event halls, auditoriums, innovation labs, and sports complexes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
          {/* Visual Interactive Campus Blueprint / 2D Map Canvas */}
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-inner min-h-[380px] sm:min-h-[440px] flex flex-col justify-between border border-slate-800">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Map Header */}
            <div className="relative z-10 flex items-center justify-between text-slate-300 text-xs">
              <span className="font-bold tracking-wider text-slate-400 uppercase">Apex Central Quadrangle</span>
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-full text-[11px] font-mono border border-slate-700">
                Live GPS Grid Active
              </span>
            </div>

            {/* Interactive Campus Venue Markers */}
            <div className="relative z-10 w-full h-[280px] sm:h-[320px]">
              {venues.map((v) => {
                const isSelected = activeVenue?.id === v.id;
                const venueEventCount = events.filter((e) => e.venueId === v.id && e.status === 'published').length;

                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVenue(v)}
                    style={{ left: `${v.coordinates.x}%`, top: `${v.coordinates.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-2xl transition-all duration-200 flex items-center gap-2 group ${
                      isSelected
                        ? 'bg-red-600 text-white ring-4 ring-red-500/40 z-20 scale-110 shadow-xl'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 z-10 hover:scale-105'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs font-bold whitespace-nowrap">{v.name.split(' ')[0]}</span>
                    {venueEventCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                        {venueEventCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="relative z-10 flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-800 pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Selected Venue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Scheduled Events Today
              </span>
            </div>
          </div>

          {/* Venue Sidebar Details */}
          <div className="space-y-4">
            {activeVenue ? (
              <div className="bg-neutral-50 rounded-3xl p-5 border border-neutral-200 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-100/80 px-2 py-0.5 rounded-md">
                    {activeVenue.building}
                  </span>
                  <h3 className="text-lg font-bold text-neutral-900 mt-1.5">{activeVenue.name}</h3>
                  <p className="text-xs text-neutral-500 font-medium">Room: {activeVenue.room}</p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-neutral-200/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Seating Capacity</span>
                    <span className="font-bold text-neutral-900">{activeVenue.capacity} Seats</span>
                  </div>
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-neutral-500 block mb-1.5">Facilities & Equipment</span>
                    <div className="flex flex-wrap gap-1">
                      {activeVenue.facilities.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-medium">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scheduled Events at this venue */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Upcoming Events Here ({venueEvents.length})
                  </h4>

                  {venueEvents.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-3 text-center bg-white rounded-xl border border-neutral-100">
                      No active events scheduled at this venue.
                    </p>
                  ) : (
                    venueEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className="p-3 bg-white rounded-2xl border border-neutral-200 hover:border-red-400 transition-colors cursor-pointer space-y-1 group"
                      >
                        <h5 className="text-xs font-bold text-neutral-900 group-hover:text-red-600 transition-colors line-clamp-1">
                          {evt.title}
                        </h5>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>{evt.date} • {evt.startTime}</span>
                          <span className="text-red-600 font-semibold group-hover:underline flex items-center gap-0.5">
                            Details <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400">Select a venue on the map</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
