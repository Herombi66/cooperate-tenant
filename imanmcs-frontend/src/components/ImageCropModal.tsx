import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCcw, Check, Move } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (file: File, previewUrl: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const VIEWPORT_SIZE = 340;

  // Reset state when a new image is provided
  useEffect(() => {
    if (imageSrc && isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [imageSrc, isOpen]);

  // Redraw canvas whenever zoom, pan, rotation, or image changes
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = VIEWPORT_SIZE;
    canvas.height = VIEWPORT_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Move to center of viewport
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate base scale so image fills the circular area
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const baseScale = VIEWPORT_SIZE / minDim;
    const currentScale = baseScale * zoom;

    ctx.scale(currentScale, currentScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    ctx.restore();
  }, [zoom, pan, rotation, imageLoaded]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer event handlers for drag / pan
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(Math.max(1, +(prev + delta).toFixed(2)), 3.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleApply = () => {
    const img = imageRef.current;
    if (!img) return;

    // High resolution output canvas (512x512)
    const exportSize = 512;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const scaleFactor = exportSize / VIEWPORT_SIZE;

    ctx.save();
    // Translate and rotate with scale factor
    ctx.translate(exportSize / 2 + pan.x * scaleFactor, exportSize / 2 + pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);

    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const baseScale = (VIEWPORT_SIZE / minDim) * scaleFactor;
    const currentScale = baseScale * zoom;

    ctx.scale(currentScale, currentScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Export as high-quality JPEG File
    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
        onCropComplete(file, previewUrl);
        onClose();
      },
      'image/jpeg',
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <Move className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">Adjust Profile Picture</h3>
              <p className="text-xs text-muted-foreground">Pan & zoom to position your photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Crop Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-muted/20">
          <div
            className="relative overflow-hidden rounded-2xl select-none cursor-grab active:cursor-grabbing shadow-inner bg-neutral-900"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Circular mask overlay showing exact avatar crop */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className="w-full h-full rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all"
                style={{ width: VIEWPORT_SIZE - 20, height: VIEWPORT_SIZE - 20 }}
              />
            </div>

            {/* Hint overlay */}
            <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-black/60 text-white/90 backdrop-blur-sm">
                Drag to reposition • Scroll or slide to zoom
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full max-w-xs mt-5 space-y-4">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.2).toFixed(2)))}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="1"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-primary-600 h-2 bg-muted rounded-lg cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.5, +(prev + 0.2).toFixed(2)))}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Extra Tools: Rotate & Reset */}
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted hover:text-foreground transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate 90°
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted hover:text-foreground transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Reset Center
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-border bg-card">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            Apply & Fit
          </button>
        </div>
      </div>
    </div>
  );
};
