import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva';
import { X, Pencil, Eraser, Square, Circle as CircleIcon, Type, MousePointer2, Sparkles, Send, Download, Plus, Copy, Trash2, ChevronLeft, ChevronRight, Presentation, Settings, Grid, FileImage } from 'lucide-react';
import jsPDF from 'jspdf';

interface Shape { type: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number; fill?: string; stroke?: string; }
interface LineData { tool: string; points: number[]; color: string; brushSize: number; }
interface Sticky { id: string; x: number; y: number; text: string; color: string; }
interface Slide { id: string; name: string; shapes: Shape[]; lines: LineData[]; stickies: Sticky[]; }

export function Whiteboard2({ onClose, initialPrompt, currentUser }: { onClose?: () => void; initialPrompt?: string; currentUser?: any }) {
  const [slides, setSlides] = useState<Slide[]>([{ id: '1', name: 'Slide 1', shapes: [], lines: [], stickies: [] }]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [tool, setTool] = useState<'select' | 'pen' | 'eraser' | 'rect' | 'circle' | 'sticky'>('pen');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<any>(null);

  // Background and Settings
  const [backgroundType, setBackgroundType] = useState<'plain' | 'grid' | 'ruled' | 'graph'>('plain');
  const [backgroundColor, setBackgroundColor] = useState('#0f172a'); // slate-900
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // AI Panel
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(initialPrompt || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setAiPanelOpen(true);
      setAiPrompt(initialPrompt);
    }
    
    // Setup global slide controls for Orion
    (window as any).whiteboardCreateSlide = addSlide;
    (window as any).whiteboardNextSlide = nextSlide;
    (window as any).whiteboardPrevSlide = prevSlide;

    const saved = localStorage.getItem('s_os_whiteboard');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.slides) setSlides(parsed.slides);
      } catch (e) { console.error(e); }
    }
  }, [initialPrompt]);

  // Auto Save
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('s_os_whiteboard', JSON.stringify({ slides }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [slides]);

  const currentSlide = slides[currentSlideIndex];
  const updateCurrentSlide = (updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = { ...currentSlide, ...updates };
    setSlides(newSlides);
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'pen' || tool === 'eraser') {
      updateCurrentSlide({ lines: [...currentSlide.lines, { tool, points: [pos.x, pos.y], color: tool === 'eraser' ? backgroundColor : color, brushSize }] });
    } else if (tool === 'rect') {
      updateCurrentSlide({ shapes: [...currentSlide.shapes, { type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0, stroke: color }] });
    } else if (tool === 'circle') {
      updateCurrentSlide({ shapes: [...currentSlide.shapes, { type: 'circle', x: pos.x, y: pos.y, radius: 0, stroke: color }] });
    } else if (tool === 'sticky') {
      const text = prompt("Enter sticky note text:");
      if (text) {
        updateCurrentSlide({ stickies: [...currentSlide.stickies, { id: Math.random().toString(), x: pos.x, y: pos.y, text, color: '#fef08a' }] });
      }
      setIsDrawing(false);
      setTool('select');
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === 'select' || tool === 'sticky') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    if (tool === 'pen' || tool === 'eraser') {
      const lines = [...currentSlide.lines];
      let lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      updateCurrentSlide({ lines });
    } else if (tool === 'rect') {
      const shapes = [...currentSlide.shapes];
      let lastShape = shapes[shapes.length - 1];
      lastShape.width = point.x - lastShape.x;
      lastShape.height = point.y - lastShape.y;
      updateCurrentSlide({ shapes });
    } else if (tool === 'circle') {
      const shapes = [...currentSlide.shapes];
      let lastShape = shapes[shapes.length - 1];
      const dx = point.x - lastShape.x;
      const dy = point.y - lastShape.y;
      lastShape.radius = Math.sqrt(dx * dx + dy * dy);
      updateCurrentSlide({ shapes });
    }
  };

  const handleMouseUp = () => setIsDrawing(false);

  // Slide Management
  const addSlide = () => {
    const newSlide: Slide = { id: Math.random().toString(), name: `Slide ${slides.length + 1}`, shapes: [], lines: [], stickies: [] };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };
  const duplicateSlide = () => {
    const newSlide: Slide = { ...currentSlide, id: Math.random().toString(), name: `${currentSlide.name} Copy` };
    setSlides([...slides.slice(0, currentSlideIndex + 1), newSlide, ...slides.slice(currentSlideIndex + 1)]);
    setCurrentSlideIndex(currentSlideIndex + 1);
  };
  const deleteSlide = () => {
    if (slides.length === 1) return;
    const newSlides = slides.filter((_, i) => i !== currentSlideIndex);
    setSlides(newSlides);
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
  };
  const nextSlide = () => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1));
  const prevSlide = () => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));

  // Export
  const exportPDF = () => {
    const pdf = new jsPDF('landscape', 'px', [window.innerWidth, window.innerHeight]);
    pdf.setFillColor(backgroundColor);
    pdf.rect(0, 0, window.innerWidth, window.innerHeight, 'F');
    const uri = stageRef.current.toDataURL();
    pdf.addImage(uri, 'PNG', 0, 0, window.innerWidth, window.innerHeight);
    pdf.save('whiteboard.pdf');
  };

  const exportPNG = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col font-sans transition-colors`} style={{ backgroundColor }}>
      
      {/* Top Bar */}
      <div className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-bold text-sm md:text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Whiteboard 2.0
          </h1>

          {/* Tools */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-white/10">
            {[
              { id: 'select', icon: MousePointer2, label: 'Select' },
              { id: 'pen', icon: Pencil, label: 'Pen' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
              { id: 'rect', icon: Square, label: 'Rectangle' },
              { id: 'circle', icon: CircleIcon, label: 'Circle' },
              { id: 'sticky', icon: Type, label: 'Sticky Note' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as any)}
                className={`p-2 rounded-md transition-all ${tool === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title={t.label}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="hidden lg:flex items-center gap-2 ml-4">
            {['#ffffff', '#f87171', '#4ade80', '#60a5fa', '#facc15', '#c084fc'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Slide Controls */}
        <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1 border border-white/10">
          <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="p-2 text-slate-400 hover:text-white disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs text-white font-bold w-16 text-center">Slide {currentSlideIndex + 1}/{slides.length}</span>
          <button onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1} className="p-2 text-slate-400 hover:text-white disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-white/20 mx-1"></div>
          <button onClick={addSlide} className="p-2 text-slate-400 hover:text-emerald-400" title="New Slide"><Plus className="w-4 h-4" /></button>
          <button onClick={duplicateSlide} className="p-2 text-slate-400 hover:text-indigo-400" title="Duplicate"><Copy className="w-4 h-4" /></button>
          <button onClick={deleteSlide} disabled={slides.length === 1} className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-all"><Settings className="w-4 h-4" /></button>
          <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-all"><Presentation className="w-4 h-4" /></button>
          <button onClick={() => setAiPanelOpen(!aiPanelOpen)} className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${aiPanelOpen ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-800 text-indigo-400 border-indigo-500/30 hover:bg-slate-700'}`}>
            <Sparkles className="w-4 h-4" /> AI Orion
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex">
        {/* Canvas Area */}
        <div className="flex-1 relative" style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
          
          {/* Background Patterns */}
          {backgroundType === 'grid' && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>}
          {backgroundType === 'ruled' && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(transparent 95%, white 5%)', backgroundSize: '100% 32px' }}></div>}
          {backgroundType === 'graph' && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>}

          <Stage
            width={window.innerWidth}
            height={window.innerHeight - 64}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            ref={stageRef}
          >
            <Layer>
              {currentSlide.shapes.map((shape, i) => (
                shape.type === 'rect' ? 
                  <Rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={2} draggable={tool === 'select'} /> :
                  <Circle key={i} x={shape.x} y={shape.y} radius={shape.radius} fill={shape.fill} stroke={shape.stroke} strokeWidth={2} draggable={tool === 'select'} />
              ))}
              
              {currentSlide.lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                />
              ))}
              {currentSlide.stickies.map((sticky, i) => (
                <Group key={i} x={sticky.x} y={sticky.y} draggable={tool === 'select'}>
                  <Rect width={150} height={150} fill={sticky.color} shadowColor="black" shadowBlur={10} shadowOpacity={0.3} cornerRadius={4} />
                  <Text text={sticky.text} padding={10} width={150} height={150} fill="#1e293b" fontSize={16} fontFamily="sans-serif" fontStyle="bold" />
                </Group>
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute right-4 top-4 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-30 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-bold text-sm">Board Settings</h4>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Background</label>
                <select value={backgroundType} onChange={e => setBackgroundType(e.target.value as any)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="plain">Plain</option>
                  <option value="grid">Dot Grid</option>
                  <option value="ruled">Ruled Notebook</option>
                  <option value="graph">Graph Paper</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Board Color</label>
                <div className="flex gap-2">
                  {[ '#0f172a', '#1e293b', '#000000', '#173f2d'].map(c => (
                    <button key={c} onClick={() => setBackgroundColor(c)} className={`w-8 h-8 rounded-full border-2 ${backgroundColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Export</label>
                <div className="flex gap-2">
                  <button onClick={exportPDF} className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"><Download className="w-3 h-3" /> PDF</button>
                  <button onClick={exportPNG} className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"><FileImage className="w-3 h-3" /> PNG</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Panel */}
        {aiPanelOpen && (
          <div className="w-80 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-2xl z-20">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400" /> Orion Teacher UI</h3>
              <button onClick={() => setAiPanelOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {aiResponse ? (
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl animate-fadeIn">
                  <p className="text-xs text-indigo-100 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
                  <Sparkles className="w-8 h-8 opacity-20" />
                  <p className="text-xs">Ask Orion to generate content, solve equations, or provide notes directly to your board.</p>
                </div>
              )}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if(!aiPrompt.trim()) return;
              setIsProcessing(true);
              try {
                const response = await fetch('/api/ai/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: aiPrompt })
                });
                const data = await response.json();
                setAiResponse(data.text);
              } catch (err) {
                setAiResponse("AI Connection failed.");
              } finally {
                setIsProcessing(false);
                setAiPrompt('');
              }
            }} className="p-4 border-t border-white/10 bg-slate-900">
              <div className="relative">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Ask Orion..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  disabled={isProcessing}
                />
                <button type="submit" disabled={isProcessing || !aiPrompt.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors">
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
