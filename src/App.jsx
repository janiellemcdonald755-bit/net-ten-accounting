import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import './index.css';
const appId = 'net-ten-accounting';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore';
import { 
  Users, Settings, Bell, LogOut, Calendar, Building, 
  Plus, Edit2, Trash2, CheckCircle, ArrowRight, 
  X, Copy, PhoneCall, Loader2, Send, Info, Lock, MapPin, User
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
    const [isAsAdmin, setIsAsAdmin] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', clientId: '', accessCode: '' });
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(null); 
const handleSubmit = (e) => {
    e.preventDefault();
    if (isAsAdmin) {
      const targetEmail = appSettings.adminEmail || 'admin@netten.com';
      const targetPass = appSettings.adminPass || 'admin';
      if (formData.email === targetEmail && formData.password === targetPass) {
        setSession({ role: 'admin' });
        showToast("Welcome Admin");
      } else {
        showToast("Invalid Admin credentials");
      }
    } else {
      const client = clients.find(c => c.clientId === formData.clientId && c.accessCode === formData.accessCode);
      if (client) {
        setSession({ ...client, role: 'client' });
        showToast(`Welcome ${client.name}`);
      } else {
        showToast("Invalid Client ID or Access Code");
      }
    }
  };
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    script.async = true;
    document.head.appendChild(script);
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
        const data = docSnap.data();
        setAppSettings(prev => ({ ...prev, ...data }));
      }
    }, (err) => console.error("Settings error:", err));

    const clientsCol = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const unsubClients = onSnapshot(clientsCol, (snapshot) => {
      const clientList = snapshot.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
      setClients(clientList);
    }, (err) => console.error("Clients error:", err));

    const notifCol = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
    const unsubNotifs = onSnapshot(notifCol, (snapshot) => {
      const notifList = snapshot.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
      setNotifications(notifList);
    }, (err) => console.error("Notifs error:", err));

    return () => {
      unsubSettings();
      unsubClients();
      unsubNotifs();
    };
  }, [user]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-900" size={48} />
      </div>
    );
  }

  const handleLogout = () => {
    setSession(null);
    showToast("Logged out successfully");
  };

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
            showToast={showToast}
          />
        ) : (
          <ClientDashboard 
            client={session}
            notifications={notifications}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
}
