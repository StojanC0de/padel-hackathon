import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Importăm hook-ul de navigare

const ClubList = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef(null);
  const navigate = useNavigate(); // Inițializăm funcția de navigare

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const progress = (scrollLeft / (scrollWidth - clientWidth)) * 100;
      setScrollProgress(progress);
    }
  };

  const handleReserveClick = (clubId) => {
    const token = localStorage.getItem('token');
    
    // Verificăm dacă clubId există ca să nu trimitem userul la /club/undefined
    if (!clubId) {
        console.error("ID-ul clubului lipsește!");
        return;
    }

    if (!token) {
      alert("Trebuie să fii logat pentru a face o rezervare!");
      navigate("/auth"); // Navigare internă React
    } else {
      // NAVIGARE CORECTĂ: Folosim navigate în loc de window.location
      navigate(`/club/${clubId}`);
    }
  };

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/clubs/')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) { // Verificăm dacă e listă
          setClubs(data); 
        } else {
          setClubs([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Eroare:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ccff00]"></div>
        <span className="ml-4 font-black italic text-gray-400">SE CAUTĂ TERENURI...</span>
    </div>
  );

  return (
    <div className="relative group px-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-black mb-6 italic tracking-tighter uppercase text-gray-900">
        Cluburi din București
      </h2>
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto gap-6 pb-10 pt-2 no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {clubs.map((club) => (
          <div 
            key={club.id} 
            className="flex-none w-[320px] sm:w-[380px] snap-center bg-white rounded-[2.5rem] overflow-hidden shadow-lg border border-gray-100 flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            {/* IMAGINE */}
            <div className="h-48 overflow-hidden relative bg-gray-200">
                <img 
                  src={club.image_url || "https://via.placeholder.com/400x200?text=Padel+Club"} 
                  className="w-full h-full object-cover transition-transform hover:scale-110 duration-700" 
                  alt={club.name} 
                />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                  {club.city || "București"}
                </div>
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-2xl font-black uppercase italic text-gray-900 truncate tracking-tighter mb-1">
                    {club.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4 font-medium flex items-center">
                    <span className="text-[#ccff00] mr-1">📍</span> {club.address}
                </p>
                
                {/* DESCRIERE */}
                <p className="text-gray-500 text-xs italic line-clamp-2 mb-6 h-8 leading-relaxed">
                  {club.description || "O locație premium cu terenuri de ultimă generație pentru toți pasionații de padel."}
                </p>

                <div className="flex justify-between items-center border-t border-gray-50 pt-5 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Preț mediu</span>
                      <span className="font-black text-xl text-black">{club.average_price || "120"} RON</span>
                    </div>

                    <button 
                      onClick={() => handleReserveClick(club.id)}
                      className="bg-[#ccff00] hover:bg-black hover:text-[#ccff00] text-black font-black px-8 py-3.5 rounded-2xl transition-all duration-300 text-sm shadow-xl hover:shadow-[#ccff00]/20 active:scale-95"
                    >
                      REZERVĂ
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* BARA DE PROGRES DINAMICĂ */}
      <div className="flex justify-between items-center mt-2 px-2">
        <div className="h-[4px] flex-grow bg-gray-100 rounded-full mr-6 overflow-hidden relative">
            <div 
              className="h-full bg-[#ccff00] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(204,255,0,0.5)]"
              style={{ width: `${scrollProgress}%` }}
            ></div>
        </div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">
           {scrollProgress > 98 ? "Final listă ✅" : "Glisează pentru mai multe →"}
        </span>
      </div>
    </div>
  );
};

export default ClubList;