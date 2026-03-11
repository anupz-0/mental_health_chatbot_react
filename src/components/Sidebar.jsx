import React, { useState, useEffect } from 'react';
import { Home, Activity, HelpCircle, Clock, LogOut } from 'lucide-react';
import logo from '../assets/logo.png';

const Sidebar = ({
  onHomeClick,
  onMentalStateClick,
  onHistoryClick,
  onFAQsClick,
  onLogout,
  currentPage,
  user,
}) => {
  const pageToLabel = {
    'home'        : 'Home',
    'voice'       : 'Home',
    'mental-state': 'Mental State',
    'history'     : 'History',
    'faqs'        : 'FAQs',
  };

  const [active, setActive] = useState(pageToLabel[currentPage] || 'Home');
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setActive(pageToLabel[currentPage] || 'Home');
  }, [currentPage]);

  const navItems = [
    { icon: Home,       label: 'Home',        onClick: onHomeClick },
    { icon: Activity,   label: 'Mental State', onClick: onMentalStateClick },
    { icon: Clock,      label: 'History',      onClick: onHistoryClick },
    { icon: HelpCircle, label: 'FAQs',         onClick: onFAQsClick },
  ];

  const handleClick = (item) => {
    setActive(item.label);
    if (item.onClick) item.onClick();
  };

  // Get initials from user name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="w-44 min-h-screen bg-gradient-to-b from-[#0a0515] via-[#1a1035] to-[#0a0515] flex flex-col items-center py-6 relative border-r border-purple-500/10">

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <img src={logo} alt="MindCare Logo" className="w-28 h-auto object-contain animate-logoGlow" />
      </div>

      {/* Nav */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="bg-gradient-to-b from-[#2a1f45]/40 to-[#1a1035]/40 backdrop-blur-sm rounded-full p-4 border border-purple-500/20 max-w-[120px] animate-float">
          <div className="flex flex-col gap-6">
            {navItems.map((item, index) => {
              const Icon     = item.icon;
              const isActive = active === item.label;
              return (
                <button
                  key={index}
                  onClick={() => handleClick(item)}
                  className="relative flex flex-col items-center gap-2 group transition-all duration-300"
                >
                  <div className={`absolute w-16 h-16 rounded-full opacity-0 blur-xl transition-all duration-300 -z-10
                    ${isActive ? 'opacity-50 bg-white/30' : 'bg-purple-400/30 group-hover:opacity-50'}`} />

                  <div className="absolute w-16 h-16 top-0 left-0 pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="absolute bg-white rounded-full opacity-0 group-hover:opacity-100 animate-pulse"
                        style={{
                          width : `${Math.random() * 3 + 1}px`,
                          height: `${Math.random() * 3 + 1}px`,
                          top   : `${Math.random() * 100}%`,
                          left  : `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 1}s`
                        }}
                      />
                    ))}
                  </div>

                  <div className={`w-12 h-12 rounded-full flex items-center justify-center
                    transition-transform duration-300 ease-out shadow-md
                    ${isActive
                      ? 'bg-white text-[#1a1035] scale-125 shadow-purple-400/70'
                      : 'bg-purple-600/20 group-hover:bg-white group-hover:text-[#1a1035] animate-twinkle'}`}
                  >
                    <Icon size={20} className="transition-colors duration-300" />
                  </div>

                  <span className={`text-xs font-medium transform transition-transform duration-300
                    ${isActive ? 'text-white scale-110' : 'text-purple-300 group-hover:text-white group-hover:scale-110'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Profile Section at Bottom */}
      {user && (
        <div className="mb-3 relative flex flex-col items-center">
          {/* Dropdown menu (slides up) */}
          {profileOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-[#1a1035]/95 backdrop-blur-md border border-purple-500/25 rounded-xl overflow-hidden shadow-xl shadow-purple-900/40 animate-fadeIn">
              <div className="px-4 py-3 border-b border-purple-500/15">
                <p className="text-xs text-purple-400/60">Signed in as</p>
                <p className="text-sm text-purple-200 font-semibold truncate">{user.name}</p>
                <p className="text-xs text-purple-400/40 truncate">{user.email}</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all duration-200 text-sm"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              )}
            </div>
          )}

          {/* Profile circle + name */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-purple-500/30">
              {getInitials(user.name).charAt(0)}
            </div>
            <span className="text-[11px] text-purple-300/70 font-medium truncate max-w-[100px]">{user.name}</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default Sidebar;