// App.tsx
import React, { useState } from 'react';
import PdfViewer from './pages/PdfViewer';

const App: React.FC = () => {
  const [activePdf, setActivePdf] = useState('/GeneralArrangement.pdf');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { name: 'LINESPLAN_MAIN.DWG', path: '/LinesPlan.pdf' },
    { name: 'GENERAL_ARRANGEMENT.DWG', path: '/GeneralArrangement.pdf' },
    { name: 'HYDROSTATIC_DATA.DWG', path: '/linesplan/hydrostatic.pdf' },
  ];

  const currentTabName = tabs.find(t => t.path === activePdf)?.name || 'SELECT FILE';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1a1a1a]">
      <header className="h-10 bg-[#2b2b2b] border-b border-black flex items-center px-2 z-[100] relative">
        <div className="bg-[#d32f2f] w-7 h-7 flex items-center justify-center mr-3 rounded-sm shadow-md flex-shrink-0">
          <span className="text-white font-black text-sm select-none">A</span>
        </div>

        {/* DESKTOP TABS */}
        <div className="hidden md:flex h-full items-end gap-[2px]">
          {tabs.map((tab) => {
            const isActive = activePdf === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => setActivePdf(tab.path)}
                className={`h-7 px-4 flex items-center gap-2 transition-all rounded-t-md text-[10px] font-bold font-mono ${isActive ? 'bg-[#ffffff] text-[#1a1a1a] translate-y-[1px]' : 'bg-[#3d3d3d] text-[#888888] hover:bg-[#4a4a4a] mt-1'
                  }`}
              >

                {tab.name}
              </button>
            );
          })}
        </div>

        {/* MOBILE DROPDOWN */}
        <div className="flex md:hidden flex-1 relative h-full items-center">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full bg-[#3d3d3d] h-7 px-3 flex items-center justify-between rounded text-[10px] font-mono text-white border border-black/50"
          >
            <span className="truncate mr-2 uppercase tracking-tighter">
              <span className="text-blue-400 mr-2">●</span> {currentTabName}
            </span>
            <span>{isMenuOpen ? '▲' : '▼'}</span>
          </button>

          {isMenuOpen && (
            <div className="absolute top-9 left-0 w-full bg-[#2b2b2b] border border-black shadow-2xl rounded-b-md overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => {
                    setActivePdf(tab.path);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full h-10 px-4 flex items-center text-left text-[10px] font-mono border-b border-black/20 last:border-0 ${activePdf === tab.path ? 'bg-white text-black font-bold' : 'text-[#888888] active:bg-[#4a4a4a]'
                    }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative">
        <PdfViewer key={activePdf} pdfPath={activePdf} />
      </main>

      <footer className="h-6 bg-[#2b2b2b] border-t border-black flex items-center px-3 justify-between flex-shrink-0">
        <div className="bg-[#1a1a1a] px-3 h-full flex items-center border-x border-black">
          <span className="text-[9px] text-blue-500 font-bold font-mono">MODEL</span>
        </div>
        <span className="text-[9px] text-gray-500 font-mono italic truncate ml-2">
          {activePdf.split('/').pop()}
        </span>
      </footer>
    </div>
  );
};

export default App;