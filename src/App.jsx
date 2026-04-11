import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import './index.css';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { Bell, LogOut, CheckCircle, Loader2, ShieldCheck, User } from 'lucide-react';

const appId = 'net-ten-accounting';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appSettings, setAppSettings] = useState({ adminEmail: 'admin@netten.com', adminPass: 'admin' });
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth:", err));
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_config', 'settings'), (s) => {
      if (s.exists()) setAppSettings(prev => ({ ...prev, ...s.data() }));
    });
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), (s) => {
      setClients(s.docs.map(d => ({ ...d.data(), firestoreId: d.id })));
    });
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), (s) => {
      setNotifications(s.docs.map(d => ({ ...d.data(), firestoreId: d.id })));
    });
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-slate-900" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      {/* PROFESSIONAL HEADER */}
      <header className="bg-[#0f172a] text-white sticky top-0 z-50 shadow-lg border-b border-slate-700">
        <div className="max-w-md mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-full shadow-inner">
              <img 
                src="https://image2url.com/r2/default/images/1774110665422-b7648686-3a6e-4dd7-8fb7-81e80f230e33.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-full"
              />
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight">NET TEN LTD</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Accounting Services</p>
            </div>
          </div>
          {session && (
            <button onClick={() => setSession(null)} className="p-2 bg-slate-800 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={18} className="mr-3 text-emerald-400" />
          <span className="font-medium text-sm">{toast}</span>
        </div>
      )}

      <main className="max-w-md mx-auto p-6">
        {!session ? (
          <LoginScreen onLogin={setSession} appSettings={appSettings} clients={clients} showToast={showToast} />
        ) : session.role === 'admin' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Administrator</h2>
              <p className="text-slate-500 text-sm mt-1">Control Panel Active</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                 <p className="text-xs font-bold text-slate-400 uppercase">Clients</p>
                 <p className="text-2xl font-black text-slate-900">{clients.length}</p>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                 <p className="text-xs font-bold text-slate-400 uppercase">Alerts</p>
                 <p className="text-2xl font-black text-slate-900">{notifications.length}</p>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-3xl shadow-xl border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">Welcome, {session.name}</h2>
              <p className="text-slate-500 text-sm">Client ID: <span className="font-mono text-blue-600 font-bold">{session.clientId}</span></p>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                <Bell size={20} className="mr-2 text-blue-500" />
                Latest Updates
              </h3>
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-700 border border-slate-100">
                      {n.message}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 italic text-sm">No new notifications at this time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin, appSettings, clients, showToast }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({ email: '', pass: '', id: '', code: '' });

  const handleSub = (e) => {
    e.preventDefault();
    if (isAdmin) {
      if (form.email === appSettings.adminEmail && form.pass === appSettings.adminPass) {
        onLogin({ role: 'admin' });
        showToast("Access Granted: Admin");
      } else showToast("Invalid Administrator Credentials");
    } else {
      const c = clients.find(cl => cl.clientId === form.id && cl.accessCode === form.code);
      if (c) { 
        onLogin({ ...c, role: 'client' }); 
        showToast(`Welcome back, ${c.name}`); 
      }
      else showToast("Invalid Client ID or Access Code");
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 mt-4 animate-in zoom-in-95 duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          {isAdmin ? <ShieldCheck size={32} /> : <User size={32} />}
        </div>
        <h2 className="font-black text-2xl text-slate-900">{isAdmin ? 'Admin Portal' : 'Client Login'}</h2>
        <p className="text-slate-500 text-sm mt-1">Please enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSub} className="space-y-4">
        {isAdmin ? (
          <>
            <input required className="w-full bg-slate-50 border-slate-200 border-2 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all" placeholder="Admin Email" onChange={e => setForm({...form, email: e.target.value})} />
            <input required className="w-full bg-slate-50 border-slate-200 border-2 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all" type="password" placeholder="Password" onChange={e => setForm({...form, pass: e.target.value})} />
          </>
        ) : (
          <>
            <input required className="w-full bg-slate-50 border-slate-200 border-2 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all" placeholder="Client ID" onChange={e => setForm({...form, id: e.target.value})} />
            <input required className="w-full bg-slate-50 border-slate-200 border-2 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all" type="password" placeholder="Access Code" onChange={e => setForm({...form, code: e.target.value})} />
          </>
        )}
        <button className="w-full bg-[#0f172a] hover:bg-slate-800 text-white p-4 rounded-2xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">
          Sign In
        </button>
      </form>
      
      <div className="mt-8 pt-6 border-t border-slate-100">
        <button onClick={() => setIsAdmin(!isAdmin)} className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors">
          {isAdmin ? 'Back to Client Login' : 'Administrator Access'}
        </button>
      </div>
    </div>
  );
}
