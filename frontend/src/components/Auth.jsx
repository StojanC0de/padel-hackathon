import React, { useState } from 'react';
// import padelBgImage from '../assets/padel.jpg'; // Asigură-te că link-ul e corect

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isManagerSignup, setIsManagerSignup] = useState(false); // <--- NOU: Stare pentru manager
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Stabilim endpoint-ul în funcție de tipul de cont la înregistrare
    let endpoint = isLogin ? 'login/' : 'register/';
    if (!isLogin && isManagerSignup) {
      endpoint = 'register-manager/'; // Endpoint-ul nou creat în Django
    }
    
    const url = `http://127.0.0.1:8000/api/${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: email, 
          password: password 
        })
      });

      const data = await response.json();

      if (response.ok) {
        const tokenValue = data.token || data.key;
        
        if (tokenValue) {
          localStorage.setItem('token', tokenValue);
          // SALVĂM statusul de manager primit de la server
          localStorage.setItem('is_manager', data.is_manager ? 'true' : 'false');
          
          window.location.href = "/"; 
        } else if (!isLogin) {
          setIsLogin(true);
          alert("Cont creat! Acum te poți loga.");
        }
      } else {
        setError(data.error || data.detail || "Date incorecte.");
      }
    } catch (err) {
      setError("Serverul nu răspunde.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 py-12"
      style={{ backgroundColor: '#1a1a1a' }} // Sau folosește imaginea ta de fundal
    >
      <div className="bg-white max-w-md w-full rounded-[3rem] shadow-2xl p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-[#ccff00]"></div>
        
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">
            {isLogin ? 'Login' : 'Cont Nou'}
          </h2>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
            {isLogin ? 'Intră în arena Padel.Connect' : 'Alătură-te comunității noastre'}
          </p>
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black uppercase mt-6 border border-red-100">
              ⚠️ {error}
            </div>
          )}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Username</label>
            <input 
              type="text" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-none bg-gray-50 focus:ring-2 focus:ring-[#ccff00] font-bold transition-all"
              placeholder="nume_utilizator"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Parolă</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-none bg-gray-50 focus:ring-2 focus:ring-[#ccff00] font-bold transition-all"
              placeholder="••••••••"
            />
          </div>

          {/* CHECKBOX PENTRU MANAGER (Doar la înregistrare) */}
          {!isLogin && (
            <div className="flex items-center gap-3 p-4 bg-[#ccff00]/10 rounded-2xl border border-[#ccff00]/20 mt-2 cursor-pointer" 
                 onClick={() => setIsManagerSignup(!isManagerSignup)}>
              <input 
                type="checkbox" 
                checked={isManagerSignup}
                onChange={() => {}} // Se ocupă div-ul de click
                className="w-5 h-5 accent-black rounded"
              />
              <span className="text-[10px] font-black uppercase text-gray-700 tracking-tight">
                Vreau să înregistrez un club (Manager)
              </span>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-black text-[#ccff00] font-black italic uppercase text-lg py-5 rounded-2xl mt-6 hover:scale-[1.02] transition-all shadow-xl shadow-black/20"
          >
            {isLogin ? 'Intră în cont' : 'Creează Contul'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <button 
            onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setIsManagerSignup(false);
            }} 
            className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-black transition-colors"
          >
            {isLogin ? 'Nu ai cont? Înregistrează-te' : 'Ai deja cont? Loghează-te'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;