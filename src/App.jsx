import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import './index.css';
const appId = 'net-ten-accounting';
import { 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Bell, LogOut, CheckCircle, Loader2
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appSettings, setAppSettings] = useState({ 
    loginMethod: 'EMAIL_PASS',
    adminEmail: 'admin@netten.com',
    adminPass: 'admin'
  });
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(null); 

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    setSession(null);
    showToast("Logged out successfully");
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'app_config', 'settings');
    const unsubSettings = onSnapshot(settingsDoc, (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
    });

    const clientsCol = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubClients = onSnapshot(clientsCol, (snapshot) => {
      setClients(snapshot.docs.map(d => ({ ...d.data(), firestoreId: d.id })));
    });

    const notifCol = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
    const unsubNotifs = onSnapshot(notifCol, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ ...d.data(), firestoreId: d.id })));
    });

    return () => {
      unsubSettings();
      unsubClients();
      unsubNotifs();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-900" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20 md:pb-0">
      <header 
        style={{ backgroundColor: '#0f172a', color: 'white', padding: '10px' }}
        className="bg-slate-900 text-white sticky top-0 z-50 shadow-md"
      >
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="https://image2url.com/r2/default/images/1774110665422-b7648686-3a6e-4dd7-8fb7-81e80f230e33.png" 
              alt="NET TEN LTD Logo" 
              style={{ width: '40px', height: '40px', minWidth: '40px', objectFit: 'contain' }} 
              className="bg-white rounded-full p-1"
            />
            <h1 className="font-bold text-lg tracking-wider">NET TEN LTD</h1>
          </div>
          {session && (
            <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center">
          <CheckCircle size={16} className="mr-2 text-green-400" />
          {toast}
        </div>
      )}

      <main className="max-w-md mx-auto h-full">
        {!session ? (
          <LoginScreen 
            onLogin={setSession}
            appSettings={appSettings}
            clients={clients}
            showToast={showToast}
          />
        ) : session.role === 'admin' ? (
          <AdminDashboard 
            appSettings={appSettings}
            clients={clients}
            notifications={notifications}
          />
        ) : (
          <ClientDashboard 
            client={session}
            notifications={notifications}
          />
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function LoginScreen({ onLogin, appSettings, clients, showToast }) {
  const [isAsAdmin, setIsAsAdmin] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', clientId: '', accessCode: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isAsAdmin) {
      if (formData.email === appSettings.adminEmail && formData.password === appSettings.adminPass) {
        onLogin({ role: 'admin' });
        showToast("Welcome Admin");
      } else {
        showToast("Invalid Admin credentials");
      }
    } else {
      const client = clients.find(c => c.clientId === formData.clientId && c.accessCode === formData.accessCode);
      if (client) {
        onLogin({ ...client, role: 'client' });
        showToast(`Welcome ${client.name}`);
      } else {
        showToast("Invalid Client ID or Access Code");
      }
    }
  };

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-center">{isAsAdmin ? 'Admin Login' : 'Client Access'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAsAdmin ? (
            <>
              <input type="email" placeholder="Admin Email" required className="w-full p-3 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="password" placeholder="Password" required className="w-full p-3 border rounded" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </>
          ) : (
            <>
              <input type="text" placeholder="Client ID" required className="w-full p-3 border rounded" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} />
              <input type="password" placeholder="Access Code" required className="w-full p-3 border rounded" value={formData.accessCode} onChange={e => setFormData({...formData, accessCode: e.target.value})} />
            </>
          )}
          <button type="submit" className="w-full bg-slate-900 text-white p-3 rounded font-bold hover:bg-slate-800 transition-colors">Sign In</button>
        </form>
        <button onClick={() => setIsAsAdmin(!isAsAdmin)} className="w-full mt-4 text-sm text-gray-500">
          {isAsAdmin ? 'Switch to Client Access' : 'Switch to Admin Login'}
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ clients, notifications }) {
  return (
    <div className="p-4 text-center">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Admin Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 uppercase font-bold">Clients</p>
          <p className="text-2xl font-black text-slate-900">{clients.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 uppercase font-bold">Alerts</p>
          <p className="text-2xl font-black text-slate-900">{notifications.length}</p>
        </div>
      </div>
      <p className="mt-8 italic text-slate-400">Admin management console active.</p>
    </div>
  );
}

function ClientDashboard({ client, notifications }) {
  return (
    <div className="p-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Hello, {client.name}</h2>
        <p className="text-slate-500">Client ID: {client.clientId}</p>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
          <Bell size={18} className="mr-2 text-slate-900" />
          Notifications
        </h3>
        {notifications.length > 0 ? (
          notifications.map((n, i) => (
            <div key={i} className="py-3 border-b border-slate-50 last:border-0 text-sm text-slate-600">
              {n.message}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 italic">No new updates at this time.</p>
        )}
      </div>
    </div>
  );
}
