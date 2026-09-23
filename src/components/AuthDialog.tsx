import React, { useState } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthDialogProps {
  onClose: () => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [selectedRole, setSelectedRole] = useState<'student' | 'coordinator' | 'organizer' | 'admin'>('student');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') await login({ email, password, role: selectedRole });
      else await register({ name, email, password, department, campus: 'KSIT', role: selectedRole });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171313]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
      <div className="w-full max-w-md rounded-[2rem] bg-[#fffdfb] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b51f1a]">KSIT CampusPulse</p>
            <h2 id="auth-dialog-title" className="mt-2 text-3xl font-black tracking-tight text-[#171313]">{mode === 'login' ? 'Welcome back.' : 'Join the pulse.'}</h2>
            <p className="mt-2 text-sm text-neutral-500">Sign in to save events, register, and manage your profile.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close authentication dialog" className="rounded-full p-2 text-neutral-500 hover:bg-[#fff0eb] hover:text-[#b51f1a]"><X /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'register' && <label className="flex flex-col gap-1.5 text-sm font-semibold">Full name<input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-[#eaded7] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]" /></label>}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-[#eaded7] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]" /></label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Password<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border border-[#eaded7] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]" /></label>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">Choose your role</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['student', 'Student', 'Discover and attend events'],
                ['coordinator', 'Coordinator', 'Create and manage club events'],
                ['organizer', 'Organizer', 'Manage assigned events'],
                ['admin', 'Admin', 'Manage the entire KSIT platform'],
              ].map(([value, label, description]) => (
                <label key={value} className={`cursor-pointer rounded-xl border p-3 transition ${selectedRole === value ? 'border-[#c52a22] bg-[#fff0eb] ring-1 ring-[#c52a22]' : 'border-[#eaded7] hover:border-[#c52a22]'}`}>
                  <input type="radio" name="role" value={value} checked={selectedRole === value} onChange={() => setSelectedRole(value as typeof selectedRole)} className="sr-only" />
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-neutral-500">{description}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {mode === 'register' && <label className="flex flex-col gap-1.5 text-sm font-semibold">Department<select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-xl border border-[#eaded7] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]"><option>Computer Science</option><option>Electronics & Comm.</option><option>Mechanical</option><option>Management & MBA</option></select></label>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={submitting} type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#c52a22] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#9f1e19] disabled:cursor-not-allowed disabled:opacity-60">{mode === 'login' ? <LogIn /> : <UserPlus />}{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="mt-5 w-full text-center text-sm font-semibold text-[#b51f1a] hover:underline">{mode === 'login' ? 'New to CampusPulse? Create an account' : 'Already have an account? Sign in'}</button>
      </div>
    </div>
  );
};

interface ProfileDialogProps { onClose: () => void; }
export const ProfileDialog: React.FC<ProfileDialogProps> = ({ onClose }) => {
  const { user, profile, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [department, setDepartment] = useState(profile?.department || 'Computer Science');
  const [year, setYear] = useState(profile?.year || '1');
  const [interests, setInterests] = useState((profile?.interests || []).join(', '));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await updateProfile({ name, phone, department, year, interests: interests.split(',').map((item: string) => item.trim()).filter(Boolean) });
      setSaved(true);
      window.setTimeout(onClose, 700);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save your profile.'); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171313]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title"><div className="w-full max-w-lg rounded-[2rem] bg-[#fffdfb] p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b51f1a]">Your KSIT profile</p><h2 id="profile-dialog-title" className="mt-2 text-3xl font-black tracking-tight">Edit details</h2></div><button type="button" onClick={onClose} aria-label="Close profile dialog" className="rounded-full p-2 text-neutral-500 hover:bg-[#fff0eb] hover:text-[#b51f1a]"><X /></button></div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">Full name<input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-[#eaded7] px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]" /></label><label className="flex flex-col gap-1.5 text-sm font-semibold">Department<select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-xl border border-[#eaded7] px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]"><option>Computer Science</option><option>Electronics & Comm.</option><option>Mechanical</option><option>Management & MBA</option><option>Arts & Design</option></select></label><label className="flex flex-col gap-1.5 text-sm font-semibold">Year<input value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl border border-[#eaded7] px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]" /></label><label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl border border-[#eaded7] px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]" /></label><label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">Interests<span className="text-xs font-normal text-neutral-500">Separate interests with commas</span><input value={interests} onChange={(e) => setInterests(e.target.value)} className="rounded-xl border border-[#eaded7] px-3 py-2.5 font-normal outline-none focus:border-[#c52a22]" /></label>{error && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button disabled={saved} type="submit" className="sm:col-span-2 rounded-xl bg-[#c52a22] px-4 py-3 text-sm font-bold text-white hover:bg-[#9f1e19] disabled:opacity-70">{saved ? 'Saved' : 'Save profile'}</button></form></div></div>;
};

export default AuthDialog;
