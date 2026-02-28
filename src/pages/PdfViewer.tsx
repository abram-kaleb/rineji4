// pages/PdfViewer.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
    pdfPath: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfPath }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const pdfPageRef = useRef<pdfjsLib.PDFPageProxy | null>(null);

    const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [lastDist, setLastDist] = useState(0);

    const autoFit = useCallback(() => {
        if (!containerRef.current || !pdfPageRef.current) return;
        const unscaled = pdfPageRef.current.getViewport({ scale: 1 });
        const fitWidthScale = containerRef.current.clientWidth / unscaled.width;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const dpr = window.devicePixelRatio || 1;
        const renderScale = isMobile ? Math.min(dpr, 1.5) : Math.min(2 * dpr, 3);

        setView({ scale: fitWidthScale / renderScale, x: 0, y: 0 });
    }, []);

    useEffect(() => {
        const observer = new ResizeObserver(() => autoFit());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [autoFit]);

    useEffect(() => {
        let isCancelled = false;
        const load = async () => {
            try {
                const loadingTask = pdfjsLib.getDocument({
                    url: pdfPath,
                    maxImageSize: 1024 * 1024,
                    disableFontFace: false
                });

                const pdf = await loadingTask.promise;
                if (isCancelled) return;

                const page = await pdf.getPage(1);
                if (isCancelled) return;
                pdfPageRef.current = page;

                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                const dpr = window.devicePixelRatio || 1;

                // RADIKAL: Turunkan skala render di HP agar RAM tidak penuh
                const renderScale = isMobile ? Math.min(dpr, 1.5) : Math.min(2 * dpr, 3);
                const viewport = page.getViewport({ scale: renderScale });

                const canvas = canvasRef.current;
                if (canvas) {
                    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (renderTaskRef.current) renderTaskRef.current.cancel();
                    renderTaskRef.current = page.render({ canvasContext: context!, viewport });
                    await renderTaskRef.current.promise;

                    if (!isCancelled) autoFit();
                }

                pdf.cleanup();
            } catch (e: any) {
                if (e.name !== 'RenderingCancelledException') console.error(e);
            }
        };
        load();
        return () => {
            isCancelled = true;
            if (renderTaskRef.current) renderTaskRef.current.cancel();
        };
    }, [pdfPath, autoFit]);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const factor = Math.pow(1.1, -e.deltaY / 120);
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;
        setView(v => {
            const nextScale = Math.min(Math.max(v.scale * factor, 0.01), 15);
            return { scale: nextScale, x: mX - (mX - v.x) * (nextScale / v.scale), y: mY - (mY - v.y) * (nextScale / v.scale) };
        });
    }, []);

    useEffect(() => {
        const cont = containerRef.current;
        if (!cont) return;
        cont.addEventListener('wheel', handleWheel, { passive: false });
        return () => cont.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const handleTouch = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            if (lastDist > 0) {
                const factor = dist / lastDist;
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const mX = (e.touches[0].pageX + e.touches[1].pageX) / 2 - rect.left;
                    const mY = (e.touches[0].pageY + e.touches[1].pageY) / 2 - rect.top;
                    setView(v => ({ scale: v.scale * factor, x: mX - (mX - v.x) * (v.scale * factor / v.scale), y: mY - (mY - v.y) * (v.scale * factor / v.scale) }));
                }
            }
            setLastDist(dist);
        } else if (e.touches.length === 1 && isDragging) {
            const touch = e.touches[0];
            setView(v => ({ ...v, x: v.x + (touch.clientX - lastPos.x), y: v.y + (touch.clientY - lastPos.y) }));
            setLastPos({ x: touch.clientX, y: touch.clientY });
        }
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-[#ffffff] overflow-hidden relative touch-none select-none"
            onMouseDown={(e) => { if (e.button === 0) { setIsDragging(true); setLastPos({ x: e.clientX, y: e.clientY }); } }}
            onMouseMove={(e) => { if (isDragging) { setView(v => ({ ...v, x: v.x + (e.clientX - lastPos.x), y: v.y + (e.clientY - lastPos.y) })); setLastPos({ x: e.clientX, y: e.clientY }); } }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={(e) => {
                if (e.touches.length === 2) setLastDist(Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY));
                else { setIsDragging(true); setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY }); }
            }}
            onTouchMove={handleTouch}
            onTouchEnd={() => { setIsDragging(false); setLastDist(0); }}
        >
            <div
                className="absolute origin-top-left pointer-events-none"
                style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`, willChange: 'transform', backfaceVisibility: 'hidden' }}
            >
                <canvas ref={canvasRef} className="bg-white block" />
            </div>
        </div>
    );
};

export default PdfViewer;