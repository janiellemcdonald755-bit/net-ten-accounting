import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
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

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'net-ten-accounting';

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
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="https://image2url.com/r2/default/images/1774110665422-b7648686-3a6e-4dd7-8fb7-81e80f230e33.png" 
              alt="NET TEN LTD Logo" 
              className="w-10 h-10 object-contain bg-white rounded-full p-1"
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
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center animate-in fade-in zoom-in duration-300">
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
            clients={clients} 
            notifications={notifications}
            appSettings={appSettings}
            showToast={showToast}
          />
        ) : (
          <ClientDashboard 
            client={clients.find(c => c.firestoreId === session.clientId)} 
            notifications={notifications}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin, appSettings, clients, showToast }) {
  const [isAsAdmin, setIsAsAdmin] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', clientId: '', accessCode: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isAsAdmin) {
      const targetEmail = appSettings.adminEmail || 'admin@netten.com';
      const targetPass = appSettings.adminPass || 'admin';

      if (formData.email === targetEmail && formData.password === targetPass) {
        onLogin({ role: 'admin' });
        showToast("Welcome Admin");
      } else {
        showToast("Invalid Admin credentials");
      }
    } else {
      let found = null;
      if (appSettings.loginMethod === 'EMAIL_PASS') {
        found = clients.find(c => c.email === formData.email && c.password === formData.password);
      } else if (appSettings.loginMethod === 'PASS_ONLY') {
        found = clients.find(c => c.id === formData.clientId && c.password === formData.password);
      } else { 
        found = clients.find(c => c.email === formData.email && c.accessCode === formData.accessCode);
      }

      if (found) {
        onLogin({ role: 'client', clientId: found.firestoreId });
        showToast(`Welcome ${found.name}`);
      } else {
        showToast("Invalid login details");
      }
    }
  };

  return (
    <div className="p-6 mt-10">
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">
          {isAsAdmin ? 'Admin Portal' : 'Client Portal'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAsAdmin || appSettings.loginMethod === 'EMAIL_PASS' ? (
            <>
              <input 
                type="email" placeholder="Email Address" required
                className="w-full px-4 py-2 border rounded-lg outline-none"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <input 
                type="password" placeholder="Password" required
                className="w-full px-4 py-2 border rounded-lg outline-none"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </>
          ) : appSettings.loginMethod === 'PASS_ONLY' ? (
            <>
              <input 
                type="text" placeholder="Client ID (e.g. C-1001)" required
                className="w-full px-4 py-2 border rounded-lg outline-none"
                value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}
              />
              <input 
                type="password" placeholder="Password" required
                className="w-full px-4 py-2 border rounded-lg outline-none"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </>
          ) : (
            <>
              <input 
                type="email" placeholder="Email Address" required
                className="w-full px-4 py-2 border rounded-lg outline-none"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <input 
                type="text" placeholder="Access Code" required
                className="w-full px-4 py-2 border rounded-lg outline-none"
                value={formData.accessCode} onChange={e => setFormData({...formData, accessCode: e.target.value})}
              />
            </>
          )}
          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold transition-all active:scale-95">
            Login
          </button>
        </form>
        <button 
          onClick={() => setIsAsAdmin(!isAsAdmin)}
          className="w-full mt-4 text-sm text-slate-500 hover:underline"
        >
          Switch to {isAsAdmin ? 'Client' : 'Admin'} Login
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ clients, notifications, appSettings, showToast }) {
  const [activeTab, setActiveTab] = useState('clients');
  const [editingClient, setEditingClient] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [notifTarget, setNotifTarget] = useState('all');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  const [adminForm, setAdminForm] = useState({
    email: appSettings.adminEmail || 'admin@netten.com',
    pass: appSettings.adminPass || 'admin'
  });

  const handleSaveClient = async (data) => {
    const clientsCol = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    try {
      if (editingClient) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingClient.firestoreId);
        await updateDoc(docRef, data);
        showToast("Client updated");
      } else {
        const newId = `C-${1000 + clients.length + 1}`;
        await addDoc(clientsCol, { ...data, id: newId, paymentHistory: [] });
        showToast("Client added");
      }
      setEditingClient(null);
      setIsAdding(false);
    } catch (e) {
      showToast("Error: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this client permanently?")) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'clients', id);
    await deleteDoc(docRef);
    showToast("Client removed");
  };

  const updateLoginMethod = async (method) => {
    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'app_config', 'settings');
    await setDoc(settingsDoc, { loginMethod: method }, { merge: true });
    showToast("Login method updated");
  };

  const updateAdminCreds = async () => {
    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'app_config', 'settings');
    await setDoc(settingsDoc, { 
      adminEmail: adminForm.email, 
      adminPass: adminForm.pass 
    }, { merge: true });
    showToast("Admin credentials updated");
  };

  const sendPushNotification = async () => {
    if (!notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      const notifCol = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
      await addDoc(notifCol, {
        type: 'PUSH',
        target: notifTarget,
        title: 'Net Ten Admin Alert',
        message: notifMessage,
        date: new Date().toLocaleString(),
        read: false,
        timestamp: Date.now()
      });
      setNotifMessage('');
      showToast("Alert sent");
    } catch (e) {
      showToast("Failed to send alert");
    } finally {
      setSendingNotif(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'clients' && !editingClient && !isAdding && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Clients</h2>
              <button onClick={() => setIsAdding(true)} className="p-2 bg-slate-900 text-white rounded-lg"><Plus size={20}/></button>
            </div>
            {clients.map(c => (
              <div key={c.firestoreId} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.id} • Bal: ${c.moneyOwed}</p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{c.businessAddress || 'No business address'}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setEditingClient(c)} className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(c.firestoreId)} className="p-2 text-red-600 bg-red-50 rounded-full hover:bg-red-100"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(editingClient || isAdding) && (
          <ClientForm 
            initialData={editingClient} 
            onSave={handleSaveClient} 
            onCancel={() => { setEditingClient(null); setIsAdding(false); }} 
          />
        )}

        {activeTab === 'push' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Send Alert</h2>
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Recipient</label>
                <select 
                  className="w-full p-3 border rounded-lg bg-slate-50 outline-none"
                  value={notifTarget}
                  onChange={(e) => setNotifTarget(e.target.value)}
                >
                  <option value="all">All Registered Clients</option>
                  {clients.map(c => (
                    <option key={c.firestoreId} value={c.firestoreId}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Message</label>
                <textarea 
                  className="w-full p-3 border rounded-lg bg-slate-50 h-32 outline-none resize-none"
                  placeholder="Type your message here..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                />
              </div>
              <button 
                onClick={sendPushNotification}
                disabled={sendingNotif || !notifMessage.trim()}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
              >
                {sendingNotif ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                <span>{sendingNotif ? 'Sending...' : 'Send Alert'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            {notifications.sort((a,b) => b.timestamp - a.timestamp).map(n => (
              <div key={n.firestoreId} className={`p-4 rounded-xl shadow-sm border ${n.type === 'PUSH' ? 'bg-blue-50 border-blue-100' : 'bg-white'}`}>
                <div className="flex items-center space-x-2 mb-1">
                   {n.type === 'PUSH' ? <Info size={14} className="text-blue-500" /> : <Calendar size={14} className="text-slate-400" />}
                   <p className="font-bold text-sm">{n.title}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-2">{n.date}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">App Settings</h2>
            
            <div className="bg-white p-4 rounded-xl border">
              <div className="flex items-center space-x-2 mb-4">
                <Lock size={18} className="text-slate-400" />
                <h3 className="font-bold">Admin Credentials</h3>
              </div>
              <div className="space-y-3">
                <input 
                  type="email" 
                  className="w-full p-3 border rounded-lg outline-none text-sm bg-slate-50"
                  value={adminForm.email}
                  onChange={e => setAdminForm({...adminForm, email: e.target.value})}
                  placeholder="Admin Email"
                />
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-lg outline-none text-sm bg-slate-50"
                  value={adminForm.pass}
                  onChange={e => setAdminForm({...adminForm, pass: e.target.value})}
                  placeholder="Admin Password"
                />
                <button 
                  onClick={updateAdminCreds}
                  className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
                >
                  Update Admin Login
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border">
              <h3 className="font-bold mb-4">Login Method</h3>
              <div className="space-y-2">
                {['EMAIL_PASS', 'PASS_ONLY', 'EMAIL_CODE'].map(m => (
                  <button 
                    key={m}
                    onClick={() => updateLoginMethod(m)}
                    className={`w-full p-3 text-left border rounded-lg ${appSettings.loginMethod === m ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}
                  >
                    <p className="font-bold text-sm">{m.replace('_', ' & ')}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="bg-white border-t p-4 flex justify-around">
        <button onClick={() => setActiveTab('clients')} className={activeTab === 'clients' ? 'text-slate-900' : 'text-gray-400'}><Users/></button>
        <button onClick={() => setActiveTab('push')} className={activeTab === 'push' ? 'text-blue-600' : 'text-gray-400'}><Send size={24}/></button>
        <button onClick={() => setActiveTab('notifications')} className={activeTab === 'notifications' ? 'text-slate-900' : 'text-gray-400'}><Bell/></button>
        <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'text-slate-900' : 'text-gray-400'}><Settings/></button>
      </nav>
    </div>
  );
}

function ClientForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState(initialData || {
    name: '', email: '', phone: '', address: '', businessAddress: '',
    password: '', accessCode: Math.floor(1000 + Math.random() * 9000).toString(),
    moneyOwed: 0, interestRate: 0, dateOwed: new Date().toISOString().split('T')[0],
    paymentHistory: []
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={onCancel} className="text-gray-500"><X/></button>
          <h2 className="text-xl font-bold">Client Profile</h2>
        </div>
        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
          {form.id || 'NEW CLIENT'}
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Basic Info</label>
          <input placeholder="Full Name" className="w-full p-3 border rounded-lg outline-none bg-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input placeholder="Email Address" className="w-full p-3 border rounded-lg outline-none bg-white" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input placeholder="Phone Number" className="w-full p-3 border rounded-lg outline-none bg-white" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Addresses</label>
          <input placeholder="Personal Home Address" className="w-full p-3 border rounded-lg outline-none bg-white" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <input placeholder="Business / Office Address" className="w-full p-3 border rounded-lg outline-none bg-white" value={form.businessAddress} onChange={e => setForm({...form, businessAddress: e.target.value})} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Financials</label>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Loan Amount" className="w-full p-3 border rounded-lg outline-none bg-white font-bold" value={form.moneyOwed} onChange={e => setForm({...form, moneyOwed: Number(e.target.value)})} />
            <input type="number" placeholder="Interest %" className="w-full p-3 border rounded-lg outline-none bg-white" value={form.interestRate} onChange={e => setForm({...form, interestRate: Number(e.target.value)})} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Security</label>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Login Password" type="text" className="w-full p-3 border rounded-lg outline-none bg-white" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            <div className="flex items-center px-3 border rounded-lg bg-gray-50 text-gray-500 text-sm">
              Code: {form.accessCode}
            </div>
          </div>
        </div>

        <button onClick={() => onSave(form)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95">
          Save Profile
        </button>
      </div>
    </div>
  );
}

function ClientDashboard({ client, notifications, showToast }) {
  const [view, setView] = useState('home');

  if (!client) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 space-y-4">
      <Loader2 className="animate-spin text-slate-400" size={32} />
      <p className="text-slate-500 font-medium">Updating account data...</p>
    </div>
  );

  const myAlerts = notifications
    .filter(n => n.type === 'PUSH' && (n.target === 'all' || n.target === client.firestoreId))
    .sort((a, b) => b.timestamp - a.timestamp);

  const totalPaid = (client.paymentHistory || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(client.moneyOwed) - totalPaid;

  const schedulePayment = async (method, date) => {
    const notifCol = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
    await addDoc(notifCol, {
      type: 'REQUEST',
      title: 'Payment Scheduled',
      message: `${client.name} requested a ${method} payment for ${date}.`,
      date: new Date().toLocaleString(),
      read: false,
      timestamp: Date.now()
    });
    showToast("Request sent to Admin");
    setView('home');
  };

  if (view === 'contact') {
    return (
      <div className="p-4 space-y-6">
        <button onClick={() => setView('home')} className="flex items-center text-slate-500 font-medium hover:text-slate-900"><ArrowRight className="rotate-180 mr-2" size={18}/> Back</button>
        <div className="bg-white rounded-2xl p-8 border shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><PhoneCall size={32}/></div>
          <h3 className="text-xl font-bold mb-2">Contact Admin</h3>
          <p className="text-sm text-slate-500 mb-6">Call or WhatsApp our support team</p>
          {["18763180099", "18765197700"].map(num => (
            <div key={num} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-3 border hover:border-blue-200 transition-colors">
              <a href={`tel:${num}`} className="font-bold text-lg text-slate-800">{num}</a>
              <button onClick={() => { 
                document.execCommand('copy'); // Fallback logic
                navigator.clipboard.writeText(num); 
                showToast("Number copied"); 
              }} className="p-2 text-slate-400 hover:text-blue-600"><Copy size={18}/></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'account') {
    return (
      <div className="p-4 space-y-6 pb-10">
        <button onClick={() => setView('home')} className="flex items-center text-slate-500 font-medium hover:text-slate-900"><ArrowRight className="rotate-180 mr-2" size={18}/> Back</button>
        <h3 className="text-xl font-bold">Profile Details</h3>
        
        <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><User size={20}/></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Account Owner</p>
              <p className="font-bold text-slate-800">{client.name}</p>
              <p className="text-sm text-slate-500">{client.email}</p>
              <p className="text-sm text-slate-500">{client.phone}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 border-t pt-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Building size={20}/></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Business Address</p>
              <p className="text-sm font-medium text-slate-700">{client.businessAddress || "Not provided"}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 border-t pt-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><MapPin size={20}/></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Personal Address</p>
              <p className="text-sm font-medium text-slate-700">{client.address || "Not provided"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'alerts') {
    return (
      <div className="p-4 space-y-6">
        <button onClick={() => setView('home')} className="flex items-center text-slate-500 font-medium"><ArrowRight className="rotate-180 mr-2" size={18}/> Back</button>
        <h3 className="text-xl font-bold">Admin Notifications</h3>
        <div className="space-y-4">
          {myAlerts.length === 0 ? (
            <div className="text-center py-20">
              <Bell className="mx-auto text-slate-200 mb-2" size={48} />
              <p className="text-slate-400">No alerts from admin.</p>
            </div>
          ) : (
            myAlerts.map(a => (
              <div key={a.firestoreId} className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm animate-in fade-in duration-300">
                <p className="font-bold text-slate-800">{a.title}</p>
                <p className="text-sm text-slate-600 mt-1">{a.message}</p>
                <p className="text-[10px] text-gray-400 mt-2">{a.date}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden transition-all duration-500 hover:shadow-xl">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold">Hello, {client.name.split(' ')[0]}</h2>
            <button onClick={() => setView('account')} className="bg-white/10 p-2 rounded-lg hover:bg-white/20"><User size={18}/></button>
          </div>
          <p className="text-slate-400 text-sm mb-4">ID: {client.id}</p>
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Total Balance Due</p>
            <p className="text-3xl font-bold">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Building size={140} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setView('schedule')} className="bg-blue-600 text-white p-4 rounded-2xl flex flex-col items-center transition-transform active:scale-95"><Calendar className="mb-1" size={20}/> <span className="text-[10px] font-bold">Payment</span></button>
        <button onClick={() => setView('alerts')} className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center relative transition-transform active:scale-95">
          <Bell className="mb-1 text-slate-500" size={20}/> 
          <span className="text-[10px] font-bold text-slate-800">Alerts</span>
          {myAlerts.length > 0 && <div className="absolute top-3 right-5 w-2 h-2 bg-red-500 rounded-full border border-white"></div>}
        </button>
        <button onClick={() => setView('contact')} className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center transition-transform active:scale-95"><PhoneCall className="mb-1 text-slate-500" size={20}/> <span className="text-[10px] font-bold text-slate-800">Support</span></button>
      </div>

      {view === 'schedule' && (
        <div className="bg-white p-6 rounded-2xl border shadow-xl animate-in slide-in-from-top-4 duration-300 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Request Payment Pickup</h3>
            <button onClick={() => setView('home')} className="text-slate-400 p-1"><X size={20}/></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Preferred Method</label>
              <select id="paymentMethod" className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-sm">
                <option>Bank Transfer</option>
                <option>In-Person Cash</option>
                <option>Cheque Pickup</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Scheduled Date</label>
              <input id="paymentDate" type="date" className="w-full p-3 border rounded-lg bg-slate-50 outline-none text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <button 
              onClick={() => {
                const method = document.getElementById('paymentMethod').value;
                const date = document.getElementById('paymentDate').value;
                if (date) schedulePayment(method, date);
              }}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-95 transition-all"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800">Payment History</h3>
        </div>
        <div className="bg-white rounded-xl border divide-y overflow-hidden shadow-sm">
          {(client.paymentHistory || []).length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Plus className="text-slate-300" size={24}/></div>
              <p className="text-xs text-slate-400 font-medium">No confirmed payments yet.</p>
            </div>
          ) : (
            client.paymentHistory.slice(-5).reverse().map((p, i) => (
              <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-800">${Number(p.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium">{p.date}</p>
                </div>
                <div className="text-right flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-green-100">Confirmed</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
