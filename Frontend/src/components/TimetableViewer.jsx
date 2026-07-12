import React, { useRef, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

const TimetableViewer = ({ open, onOpenChange, imageUrl, title = 'Timetable' }) => {
  const [zoom, setZoom] = useState(1);
  const imageRef = useRef(null);
  const setOpen = (nextOpen) => { if (!nextOpen) setZoom(1); onOpenChange(nextOpen); };
  const openFullscreen = async () => { if (imageRef.current?.requestFullscreen) await imageRef.current.requestFullscreen(); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-4 md:p-6">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} aria-label="Zoom out"><Minus className="h-4 w-4" /></Button>
          <span className="min-w-14 text-center text-sm font-medium text-slate-600">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label="Zoom in"><Plus className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setZoom(1)}><RotateCcw className="h-4 w-4 mr-1.5" /> Reset</Button>
          <Button type="button" variant="outline" size="sm" className="sm:ml-auto" onClick={openFullscreen}><Maximize2 className="h-4 w-4 mr-1.5" /> Fullscreen</Button>
        </div>
        <div className="h-[68vh] overflow-auto rounded-md bg-slate-100 p-3 text-center">
          <img ref={imageRef} src={imageUrl} alt={title} className="mx-auto max-w-none origin-top transition-transform duration-150" style={{ width: (zoom * 100) + '%' }} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimetableViewer;
