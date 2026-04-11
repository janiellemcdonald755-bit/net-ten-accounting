import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { Bell, LogOut, CheckCircle, Loader2, ShieldCheck, User } from 'lucide-react';

// --- YOUR APP CODE START ---
const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Net Ten Accounting is Live!</h1>
      <p>Logged in as: {user?.uid}</p>
    </div>
  );
};
// --- YOUR APP CODE END ---

// THIS IS THE "SPARK" THAT TURNS IT ON:
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export default App;
