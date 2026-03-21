import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isManager, setIsManager] = useState(false); // <--- NOU
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const managerStatus = localStorage.getItem('is_manager') === 'true'; // <--- NOU
    
    if (token) {
      setIsLoggedIn(true);
      setIsManager(managerStatus);
    } else {
      setIsLoggedIn(false);
      setIsManager(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('is_manager'); // <--- Curățăm tot la ieșire
    setIsLoggedIn(false);
    setIsManager(false);
    navigate('/');
    window.location.reload();
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        
        <Link to="/" className="text-3xl font-black italic uppercase tracking-tighter text-gray-900">
          Padel<span className="text-[#ccff00]">.</span>Connect
        </Link>
        
        <div className="space-x-8 text-gray-700 font-bold uppercase text-[11px] tracking-widest hidden md:flex items-center">
          <Link to="/" className="hover:text-[#ccff00] transition-colors">Acasă</Link>
          
          {/* AFISĂM REZERVĂRILE MELE (Pentru jucători) */}
          {isLoggedIn && (
            <Link to="/my-bookings" className="hover:text-[#ccff00] transition-colors">
              Rezervările Mele
            </Link>
          )}

          {/* AFISĂM BUTONUL DE ADD CLUB (Doar pentru manageri) */}
          {isLoggedIn && isManager && (
            <Link 
              to="/add-club" 
              className="bg-black text-[#ccff00] px-4 py-2 rounded-xl hover:scale-105 transition-all shadow-lg"
            >
              + Adaugă Club
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <button 
              onClick={handleLogout}
              className="bg-gray-100 text-gray-900 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
            >
              Ieșire
            </button>
          ) : (
            <Link 
              to="/auth" 
              className="bg-black text-[#ccff00] px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl"
            >
              Intră în Cont
            </Link>
          )}
        </div>
        
      </div>
    </nav>
  )
}

export default Navbar