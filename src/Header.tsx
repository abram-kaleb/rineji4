// Header.tsx
import React, { useState } from 'react';

interface HeaderProps {
    currentFile: string;
    drawingFiles: { name: string; path: string }[];
    onFileSelect: (path: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentFile, drawingFiles, onFileSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="h-10 bg-[#1a1f26] border-b border-white/5 flex items-center px-2 gap-4 z-50 select-none font-mono">
            <div
                className="flex items-center gap-1 px-3 py-1 hover:bg-white/5 rounded cursor-pointer transition-colors relative"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">File</span>
                <svg
                    className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
                        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1f26] border border-white/10 shadow-2xl rounded py-1 overflow-hidden">
                            {drawingFiles.map((file) => (
                                <div
                                    key={file.path}
                                    className={`px-4 py-2 text-xs hover:bg-sky-600 hover:text-white flex justify-between items-center transition-colors ${currentFile === file.path ? 'text-sky-400 bg-white/5' : 'text-zinc-400'
                                        }`}
                                    onClick={() => {
                                        onFileSelect(file.path);
                                        setIsOpen(false);
                                    }}
                                >
                                    {file.name}
                                    {currentFile === file.path && <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <span className="text-[10px] text-zinc-500 truncate italic">
                {currentFile.split('/').pop()}
            </span>
        </header>
    );
};

export default Header;