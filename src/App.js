import { useState, useEffect } from 'react';
import './App.css';
import {
  auth,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  logoutUser
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Calendar from './Calendar';
import NotificationCenter from './NotificationCenter';
import AdminPanel from './AdminPanel';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ===== ADMIN CHECK =====
  const checkIfAdmin = (userEmail) => {
    return userEmail === 'admin@admin.admin';
  };

  // ===== AUTH STATE =====
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        setIsAdmin(checkIfAdmin(currentUser.email));
        const storedUserId = localStorage.getItem('userId');
        setUserId(storedUserId);
      } else {
        setIsAdmin(false);
        setUserId(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ===== DYNAMIC TAB TITLE =====
  useEffect(() => {
    if (!user) {
      document.title = isLogin ? 'Prihlásenie' : 'Registrácia';
    } else if (isAdmin) {
      document.title = 'Admin panel';
    } else {
      document.title = 'Osobný kalendár';
    }
  }, [user, isAdmin, isLogin]);

  // ===== SEND USER ID TO SERVER =====
  useEffect(() => {
    if (user && userId) {
      sendUserIdToServer(userId);
    }
  }, [user, userId]);

  const sendUserIdToServer = async (userId) => {
    try {
      await fetch('http://localhost:8080/api/v1/api/users/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      console.error('Chyba pri odoslaní ID na server:', error);
    }
  };

  // ===== LOGIN / REGISTER =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const result = isLogin
        ? await loginWithEmailAndPassword(email, password)
        : await registerWithEmailAndPassword(email, password, username);

      if (result.error) {
        setError(result.error);
      } else if (result.user) {
        setIsAdmin(checkIfAdmin(result.user.email));
        const localUserId = localStorage.getItem('userId');
        setUserId(localUserId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setUserId(null);
    setIsAdmin(false);
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Načítavanie...</p>
        </header>
      </div>
    );
  }

  // ===== LOGGED USER =====
  if (user) {
    return (
      <div className="App">
        {!isAdmin && userId && <NotificationCenter userId={userId} />}

        <div className="app-container">
          <nav className="app-nav">
            <div className="user-info">
              <h3>{isAdmin ? 'Admin panel' : 'Osobný kalendár'}</h3>
              <p>{user.displayName || user.email}</p>
              <p>ID: {userId}</p>
              {isAdmin && (
                <p style={{ color: '#FF5252', fontWeight: 'bold' }}>
                  👑 Administrátor
                </p>
              )}
            </div>

            <button onClick={handleLogout} className="logout-btn">
              Odhlásiť sa
            </button>
          </nav>

          <main className="app-content">
            {isAdmin ? (
              <AdminPanel userId={userId} />
            ) : (
              <Calendar userId={userId} />
            )}
          </main>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  // ===== LOGIN / REGISTER SCREEN =====
  return (
    <div className="App">
      <header className="App-header">
        <h1>{isLogin ? 'Prihlásenie' : 'Registrácia'}</h1>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Heslo:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Používateľské meno:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="submit-btn">
            {isLogin ? 'Prihlásiť' : 'Registrovať'}
          </button>
        </form>

        <p className="toggle-form">
          {isLogin ? 'Nemáte účet?' : 'Už máte účet?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="toggle-btn"
          >
            {isLogin ? 'Registrovať' : 'Prihlásiť'}
          </button>
        </p>
      </header>
    </div>
  );
}

export default App;
