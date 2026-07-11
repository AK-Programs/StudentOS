import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, RegularPolygon, Arrow, Group, Text } from 'react-konva';
import { 
  Download, Eraser, MousePointer2, Pen, PenTool, Square, Circle as CircleIcon, 
  Triangle, Minus, ChevronDown, Trash2, Sliders, Settings2, Plus, Copy,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, ArrowUp, ArrowDown, Type
} from 'lucide-react';

interface ShapeObj {
  id: string;
  type: 'rect' | 'square' | 'circle' | 'triangle' | 'arrow' | 'line' | 'polygon' | 'geometry' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  fill?: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
}

interface LineObj {
  id: string;
  points: number[];
  color: string;
  brushSize: number;
  tool: 'pen' | 'pencil' | 'marker' | 'highlighter';
}

interface Slide {
  id: string;
  shapes: ShapeObj[];
  lines: LineObj[];
  stickies: any[];
}

export const Whiteboard2 = ({ onClose, currentUser }: any) => {
  const [slides, setSlides] = useState<Slide[]>([{ id: 'slide_1', shapes: [], lines: [], stickies: [] }]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  
  const [tool, setTool] = useState<'pen' | 'pencil' | 'marker' | 'highlighter' | 'eraser' | 'select' | 'shape'>('pen');
  const [shapeType, setShapeType] = useState<'rect' | 'square' | 'circle' | 'triangle' | 'arrow' | 'line' | 'polygon' | 'geometry' | 'text'>('rect');
  
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  
  // Advanced Select & Object controls
  const [selectedObj, setSelectedObj] = useState<{ id: string; type: 'shape' | 'line' } | null>(null);

  // Zoom and Pan Controls
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight - 120 });

  // Tablet & Device Responsive Canvas Handling using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ 
          width: width || window.innerWidth, 
          height: height || (window.innerHeight - 120) 
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCloseToLine = (linePoints: number[], px: number, py: number) => {
    for (let i = 0; i < linePoints.length; i += 2) {
      const lx = linePoints[i];
      const ly = linePoints[i+1];
      const dist = Math.sqrt(Math.pow(lx - px, 2) + Math.pow(ly - py, 2));
      if (dist < 20) return true;
    }
    return false;
  };

  const isCloseToShape = (shape: ShapeObj, px: number, py: number) => {
    if (shape.type === 'rect' || shape.type === 'square') {
      const minX = Math.min(shape.x, shape.x + (shape.width || 0));
      const maxX = Math.max(shape.x, shape.x + (shape.width || 0));
      const minY = Math.min(shape.y, shape.y + (shape.height || 0));
      const maxY = Math.max(shape.y, shape.y + (shape.height || 0));
      return px >= minX - 10 && px <= maxX + 10 && py >= minY - 10 && py <= maxY + 10;
    }
    if (shape.type === 'circle' || shape.type === 'triangle' || shape.type === 'polygon' || shape.type === 'geometry') {
      const dist = Math.sqrt(Math.pow(shape.x - px, 2) + Math.pow(shape.y - py, 2));
      return dist <= (shape.radius || 20) + 15;
    }
    if (shape.type === 'line' || shape.type === 'arrow') {
      if (!shape.points) return false;
      for (let i = 0; i < shape.points.length; i += 2) {
        const lx = shape.x + shape.points[i];
        const ly = shape.y + shape.points[i+1];
        const dist = Math.sqrt(Math.pow(lx - px, 2) + Math.pow(ly - py, 2));
        if (dist < 25) return true;
      }
    }
    return false;
  };

  const eraseAt = (px: number, py: number) => {
    setSlides(prev => {
      const updated = [...prev];
      const current = updated[activeSlideIdx];
      current.lines = current.lines.filter(line => !isCloseToLine(line.points, px, py));
      current.shapes = current.shapes.filter(shape => !isCloseToShape(shape, px, py));
      return updated;
    });
  };

  // Convert client pointer coordinate relative to current zoom stage position & scale factor
  const getRelativePointerPosition = (stage: any) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    if (tool === 'eraser') {
      isDrawing.current = true;
      eraseAt(pos.x, pos.y);
      return;
    }
    
    if (tool === 'select') {
      // Clear selected object if clicking raw stage background
      if (e.target === stage) {
        setSelectedObj(null);
      }
      return;
    }
    
    isDrawing.current = true;
    
    if (tool === 'pen' || tool === 'pencil' || tool === 'marker' || tool === 'highlighter') {
      let colorStr = brushColor;
      let sizeVal = brushSize;
      
      if (tool === 'pencil') {
        colorStr = brushColor + 'a0'; 
        sizeVal = Math.max(1, Math.round(brushSize * 0.5));
      } else if (tool === 'marker') {
        colorStr = brushColor;
        sizeVal = brushSize * 2.2;
      } else if (tool === 'highlighter') {
        colorStr = brushColor + '40'; 
        sizeVal = brushSize * 4.0;
      }
      
      const newLine: LineObj = {
        id: Date.now().toString(),
        tool,
        color: colorStr,
        brushSize: sizeVal,
        points: [pos.x, pos.y, pos.x, pos.y],
      };
      
      setSlides(prev => {
        const updated = [...prev];
        updated[activeSlideIdx].lines.push(newLine);
        return updated;
      });
    } else if (tool === 'shape') {
      if (shapeType === 'text') {
        const textVal = prompt('Enter academic text value:');
        if (textVal) {
          const newShape: ShapeObj = {
            id: Date.now().toString(),
            type: shapeType,
            x: pos.x,
            y: pos.y,
            stroke: brushColor,
            strokeWidth: brushSize,
            fill: brushColor,
            width: 0,
            height: 0,
            radius: 0,
            points: [0, 0, 0, 0],
            text: textVal,
            fontSize: Math.max(16, brushSize * 4)
          };
          setSlides(prev => {
            const updated = [...prev];
            updated[activeSlideIdx].shapes.push(newShape);
            return updated;
          });
        }
        isDrawing.current = false;
        return;
      }
      
      const newShape: ShapeObj = {
        id: Date.now().toString(),
        type: shapeType,
        x: pos.x,
        y: pos.y,
        stroke: brushColor,
        strokeWidth: brushSize,
        fill: 'transparent',
        width: 0,
        height: 0,
        radius: 0,
        points: [0, 0, 0, 0]
      };
      
      setSlides(prev => {
        const updated = [...prev];
        updated[activeSlideIdx].shapes.push(newShape);
        return updated;
      });
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = getRelativePointerPosition(stage);
    if (!point) return;
    
    if (tool === 'eraser') {
      eraseAt(point.x, point.y);
      return;
    }

    if (tool === 'select') return;

    setSlides(prev => {
      const updated = [...prev];
      const currentSlide = updated[activeSlideIdx];

      if (tool === 'pen' || tool === 'pencil' || tool === 'marker' || tool === 'highlighter') {
        const lastLine = currentSlide.lines[currentSlide.lines.length - 1];
        if (lastLine) {
          lastLine.points = lastLine.points.concat([point.x, point.y]);
        }
      } else if (tool === 'shape') {
        const lastShape = currentSlide.shapes[currentSlide.shapes.length - 1];
        if (lastShape) {
          if (lastShape.type === 'rect') {
            lastShape.width = point.x - lastShape.x;
            lastShape.height = point.y - lastShape.y;
          } else if (lastShape.type === 'square') {
            const size = Math.max(Math.abs(point.x - lastShape.x), Math.abs(point.y - lastShape.y));
            lastShape.width = (point.x < lastShape.x ? -1 : 1) * size;
            lastShape.height = (point.y < lastShape.y ? -1 : 1) * size;
          } else if (lastShape.type === 'circle') {
            lastShape.radius = Math.sqrt(Math.pow(point.x - lastShape.x, 2) + Math.pow(point.y - lastShape.y, 2));
          } else if (lastShape.type === 'line' || lastShape.type === 'arrow') {
            lastShape.points = [0, 0, point.x - lastShape.x, point.y - lastShape.y];
          } else if (lastShape.type === 'triangle' || lastShape.type === 'polygon' || lastShape.type === 'geometry') {
            lastShape.radius = Math.sqrt(Math.pow(point.x - lastShape.x, 2) + Math.pow(point.y - lastShape.y, 2));
          }
        }
      }
      return updated;
    });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };
  
  const handleObjectClick = (e: any, id: string, type: 'line' | 'shape') => {
    if (tool === 'eraser') {
      setSlides(prev => {
        const updated = [...prev];
        if (type === 'line') {
          updated[activeSlideIdx].lines = updated[activeSlideIdx].lines.filter(l => l.id !== id);
        } else {
          updated[activeSlideIdx].shapes = updated[activeSlideIdx].shapes.filter(s => s.id !== id);
        }
        return updated;
      });
      if (selectedObj?.id === id) {
        setSelectedObj(null);
      }
    } else if (tool === 'select') {
      e.cancelBubble = true;
      setSelectedObj({ id, type });
    }
  };

  const handleClearCanvas = () => {
    if (confirm("Are you sure you want to clear this slide's canvas?")) {
      setSlides(prev => {
        const updated = [...prev];
        updated[activeSlideIdx].lines = [];
        updated[activeSlideIdx].shapes = [];
        return updated;
      });
      setSelectedObj(null);
    }
  };

  // Slide Manager Actions
  const handleAddSlide = () => {
    setSlides(prev => [...prev, { id: `slide_${Date.now()}`, shapes: [], lines: [], stickies: [] }]);
    setActiveSlideIdx(slides.length);
    setSelectedObj(null);
  };

  const handleDuplicateSlide = () => {
    const current = slides[activeSlideIdx];
    const duplicated: Slide = {
      id: `slide_${Date.now()}`,
      shapes: current.shapes.map(s => ({ ...s, id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` })),
      lines: current.lines.map(l => ({ ...l, id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` })),
      stickies: []
    };
    setSlides(prev => {
      const updated = [...prev];
      updated.splice(activeSlideIdx + 1, 0, duplicated);
      return updated;
    });
    setActiveSlideIdx(activeSlideIdx + 1);
    setSelectedObj(null);
  };

  const handleDeleteSlide = () => {
    if (slides.length <= 1) {
      alert("You cannot delete the only remaining slide.");
      return;
    }
    if (confirm("Are you sure you want to delete this whiteboard slide?")) {
      const newIdx = Math.max(0, activeSlideIdx - 1);
      setSlides(prev => prev.filter((_, idx) => idx !== activeSlideIdx));
      setActiveSlideIdx(newIdx);
      setSelectedObj(null);
    }
  };

  // Zoom viewport controls
  const handleZoomIn = () => setStageScale(prev => Math.min(4, prev + 0.15));
  const handleZoomOut = () => setStageScale(prev => Math.max(0.4, prev - 0.15));
  const handleResetZoom = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  // Selection Object Modifiers
  const handleModifyObjectColor = (color: string) => {
    if (!selectedObj) return;
    setSlides(prev => {
      const updated = [...prev];
      const slide = updated[activeSlideIdx];
      if (selectedObj.type === 'shape') {
        const shape = slide.shapes.find(s => s.id === selectedObj.id);
        if (shape) {
          shape.stroke = color;
          if (shape.type === 'text') shape.fill = color;
        }
      } else {
        const line = slide.lines.find(l => l.id === selectedObj.id);
        if (line) line.color = color;
      }
      return updated;
    });
  };

  const handleModifyObjectFill = (color: string) => {
    if (!selectedObj || selectedObj.type !== 'shape') return;
    setSlides(prev => {
      const updated = [...prev];
      const slide = updated[activeSlideIdx];
      const shape = slide.shapes.find(s => s.id === selectedObj.id);
      if (shape) shape.fill = color;
      return updated;
    });
  };

  const handleModifyObjectThickness = (size: number) => {
    if (!selectedObj) return;
    setSlides(prev => {
      const updated = [...prev];
      const slide = updated[activeSlideIdx];
      if (selectedObj.type === 'shape') {
        const shape = slide.shapes.find(s => s.id === selectedObj.id);
        if (shape) shape.strokeWidth = size;
      } else {
        const line = slide.lines.find(l => l.id === selectedObj.id);
        if (line) line.brushSize = size;
      }
      return updated;
    });
  };

  const handleModifyObjectLayer = (order: 'front' | 'back') => {
    if (!selectedObj) return;
    setSlides(prev => {
      const updated = [...prev];
      const slide = updated[activeSlideIdx];
      if (selectedObj.type === 'shape') {
        const shapeIdx = slide.shapes.findIndex(s => s.id === selectedObj.id);
        if (shapeIdx > -1) {
          const shape = slide.shapes[shapeIdx];
          slide.shapes.splice(shapeIdx, 1);
          if (order === 'front') {
            slide.shapes.push(shape);
          } else {
            slide.shapes.unshift(shape);
          }
        }
      } else {
        const lineIdx = slide.lines.findIndex(l => l.id === selectedObj.id);
        if (lineIdx > -1) {
          const line = slide.lines[lineIdx];
          slide.lines.splice(lineIdx, 1);
          if (order === 'front') {
            slide.lines.push(line);
          } else {
            slide.lines.unshift(line);
          }
        }
      }
      return updated;
    });
  };

  const handleDeleteSelectedObject = () => {
    if (!selectedObj) return;
    setSlides(prev => {
      const updated = [...prev];
      const slide = updated[activeSlideIdx];
      if (selectedObj.type === 'shape') {
        slide.shapes = slide.shapes.filter(s => s.id !== selectedObj.id);
      } else {
        slide.lines = slide.lines.filter(l => l.id !== selectedObj.id);
      }
      return updated;
    });
    setSelectedObj(null);
  };

  const currentSlide = slides[activeSlideIdx] || { id: 'default', shapes: [], lines: [] };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans select-none overflow-hidden">
      
      {/* 1. MAIN HEADER / BRAND BAR */}
      <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/5 shadow-md flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Exit Board
          </button>
          <div className="text-white font-black text-sm tracking-widest uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-glow shadow-emerald-500/55" />
            Class SmartBoard 3.0
          </div>
        </div>
        
        {/* Dynamic Tool Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-white/10 p-1.5 rounded-2xl shadow-inner max-w-full overflow-x-auto">
          <button 
            onClick={() => { setTool('select'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Select & Move Shapes/Lines"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => { setTool('pen'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Academic Ink Pen"
          >
            <Pen className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => { setTool('pencil'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'pencil' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Fine Graphite Pencil"
          >
            <span className="text-xs font-extrabold font-mono">✏️</span>
          </button>
          
          <button 
            onClick={() => { setTool('marker'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'marker' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Bold Dry-Erase Marker"
          >
            <span className="text-xs font-extrabold font-mono">🖍️</span>
          </button>
          
          <button 
            onClick={() => { setTool('highlighter'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'highlighter' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Translucent Text Highlighter"
          >
            <PenTool className="w-4 h-4" />
          </button>
          
          {/* Shapes Dropdown Selector Menu */}
          <div className="relative">
            <button 
              onClick={() => { setShapesMenuOpen(!shapesMenuOpen); setTool('shape'); }} 
              className={`p-2 px-3 rounded-xl transition-all flex items-center gap-1 border border-transparent ${tool === 'shape' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              title="Interactive Shapes Menu"
            >
              <Square className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">{shapeType}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {shapesMenuOpen && (
              <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 w-44 z-50 animate-fadeIn">
                 <div className="px-2.5 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">Vector Geometries</div>
                 <button onClick={() => { setTool('shape'); setShapeType('line'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'line' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Minus className="w-3.5 h-3.5" /> Simple Line</button>
                 <button onClick={() => { setTool('shape'); setShapeType('arrow'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'arrow' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>↗ Directed Arrow</button>
                 <button onClick={() => { setTool('shape'); setShapeType('rect'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'rect' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Square className="w-3.5 h-3.5" /> Rectangle</button>
                 <button onClick={() => { setTool('shape'); setShapeType('square'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'square' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Square className="w-3.5 h-3.5 text-indigo-400" /> Square Node</button>
                 <button onClick={() => { setTool('shape'); setShapeType('circle'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'circle' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><CircleIcon className="w-3.5 h-3.5" /> Circular Node</button>
                 <button onClick={() => { setTool('shape'); setShapeType('triangle'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'triangle' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Triangle className="w-3.5 h-3.5" /> Equilateral Triangle</button>
                 <button onClick={() => { setTool('shape'); setShapeType('polygon'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'polygon' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><span className="text-xs font-extrabold font-mono">⬡</span> Hexagonal Hex</button>
                 <button onClick={() => { setTool('shape'); setShapeType('geometry'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'geometry' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><span className="text-xs font-extrabold font-mono">📐</span> Graph Axis Grid</button>
                 <button onClick={() => { setTool('shape'); setShapeType('text'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'text' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Type className="w-3.5 h-3.5" /> Academic Text label</button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => { setTool('eraser'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Erase Lines & Shapes"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Global Action Handlers */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearCanvas}
            className="p-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 hover:border-red-500/35 rounded-xl transition-all border border-white/5"
            title="Reset Board Elements"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. SECONDARY CONTROLS HUD (ZOOM + SLIDES + ACTIVE OBJECT CONFIG) */}
      <div className="bg-slate-900/90 border-b border-white/5 py-2 px-4 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 backdrop-blur-md">
        
        {/* Dynamic Multi-Slide Manager */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-2xl border border-white/5 shadow-md">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mr-1">Slides</span>
          <button 
            disabled={activeSlideIdx <= 0}
            onClick={() => { setActiveSlideIdx(prev => prev - 1); setSelectedObj(null); }}
            className="p-1 text-slate-400 hover:text-white disabled:text-slate-700 transition-colors"
            title="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-200 font-mono px-1">
            {activeSlideIdx + 1} / {slides.length}
          </span>
          <button 
            disabled={activeSlideIdx >= slides.length - 1}
            onClick={() => { setActiveSlideIdx(prev => prev + 1); setSelectedObj(null); }}
            className="p-1 text-slate-400 hover:text-white disabled:text-slate-700 transition-colors"
            title="Next Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-px bg-white/10 mx-1" />
          
          <button 
            onClick={handleAddSlide}
            className="p-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 border border-indigo-500/20"
            title="Add New Blank Slide"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
          <button 
            onClick={handleDuplicateSlide}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 border border-white/5"
            title="Duplicate Current Elements to New Slide"
          >
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button 
            disabled={slides.length <= 1}
            onClick={handleDeleteSlide}
            className="p-1 text-red-400 hover:text-red-300 disabled:text-slate-700 transition-colors"
            title="Delete Current Slide"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Zoom & Navigation Controls */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-2xl border border-white/5 shadow-md font-mono">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-1">Viewport</span>
          <button onClick={handleZoomOut} className="p-1 text-slate-400 hover:text-white transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs text-slate-300 font-bold w-12 text-center">{Math.round(stageScale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1 text-slate-400 hover:text-white transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={handleResetZoom} className="p-1 ml-1 text-indigo-400 hover:text-indigo-300 transition-colors" title="Fit to Canvas (100%)"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>

        {/* Selected Object Advanced Properties Config Panel */}
        {selectedObj ? (
          <div className="flex items-center gap-3.5 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 rounded-2xl animate-fadeIn">
            <span className="text-[10px] text-indigo-300 uppercase tracking-widest font-black font-mono">Selected: {selectedObj.type}</span>
            
            {/* Color modifier */}
            <div className="flex items-center gap-1">
              {[ '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#eab308' ].map(col => (
                <button 
                  key={col}
                  onClick={() => handleModifyObjectColor(col)}
                  className="w-4.5 h-4.5 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: col }}
                  title="Change Stroke Color"
                />
              ))}
            </div>

            {/* Fill modifier (Shapes only) */}
            {selectedObj.type === 'shape' && (
              <div className="flex items-center gap-1 border-l border-white/10 pl-3">
                <span className="text-[8px] text-slate-400 mr-1 uppercase font-mono">Fill</span>
                <button 
                  onClick={() => handleModifyObjectFill('transparent')}
                  className="w-4.5 h-4.5 rounded-full border border-white/20 text-slate-400 text-[8px] font-bold hover:scale-110 transition-transform bg-slate-900"
                  title="Transparent Fill"
                >
                  ∅
                </button>
                {[ '#ef444430', '#3b82f630', '#10b98130', '#eab30830', '#ffffff20' ].map(fillCol => (
                  <button 
                    key={fillCol}
                    onClick={() => handleModifyObjectFill(fillCol)}
                    className="w-4.5 h-4.5 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: fillCol }}
                    title="Soft Translucent Fill"
                  />
                ))}
              </div>
            )}

            {/* Thickness Modifier */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <input 
                type="range"
                min="1"
                max="24"
                onChange={(e) => handleModifyObjectThickness(parseInt(e.target.value))}
                className="w-16 accent-indigo-500 cursor-pointer"
                title="Change Border Thickness"
              />
            </div>

            {/* Order/Layering modifiers */}
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
              <button 
                onClick={() => handleModifyObjectLayer('front')} 
                className="p-1 bg-slate-850 hover:bg-slate-700 text-slate-200 rounded-lg border border-white/5" 
                title="Bring Layer to Front"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => handleModifyObjectLayer('back')} 
                className="p-1 bg-slate-850 hover:bg-slate-700 text-slate-200 rounded-lg border border-white/5" 
                title="Send Layer to Back"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action buttons */}
            <button 
              onClick={handleDeleteSelectedObject} 
              className="p-1 px-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase rounded-lg border border-red-500/30 shadow-md transition-all flex items-center gap-1"
              title="Delete Element"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        ) : (
          /* General Stroke Thickness Controls */
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-white/5 p-1 rounded-full">
              {[ '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#eab308' ].map(c => (
                <button 
                  key={c} 
                  onClick={() => setBrushColor(c)} 
                  className={`w-5 h-5 rounded-full border-2 transition-all ${brushColor === c ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'}`} 
                  style={{ backgroundColor: c }} 
                />
              ))}
            </div>
            
            <div className="flex items-center gap-2 bg-slate-950 border border-white/5 px-2.5 py-1 rounded-xl">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <input 
                type="range" 
                min="1" 
                max="24" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                className="w-20 accent-indigo-500 cursor-pointer" 
                title="Brush Thickness"
              />
              <span className="text-[10px] font-mono text-slate-400 w-4 text-center">{brushSize}px</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 3. DYNAMIC CANVAS DRAWING CONTAINER STAGE */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none" 
        style={{ 
          cursor: tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
          backgroundColor 
        }}
      >
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          ref={stageRef}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={tool === 'select' && !selectedObj}
          onDragEnd={(e) => {
            if (tool === 'select' && e.target === e.target.getStage()) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
        >
          <Layer>
            {/* Vector Shapes rendering */}
            {currentSlide.shapes.map((shape) => (
              <Group 
                key={shape.id} 
                x={shape.x} 
                y={shape.y} 
                draggable={tool === 'select'}
                onDragEnd={(e) => {
                  shape.x = e.target.x();
                  shape.y = e.target.y();
                }}
                onMouseEnter={(e) => { 
                  if (tool === 'eraser') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'cell';
                  }
                }}
                onClick={(e) => handleObjectClick(e, shape.id, 'shape')}
                onTap={(e) => handleObjectClick(e, shape.id, 'shape')}
              >
                {/* Visual Highlight indicator if selected */}
                {selectedObj?.id === shape.id && (
                  <Rect 
                    x={shape.type === 'circle' ? -(shape.radius || 20) - 4 : -4}
                    y={shape.type === 'circle' ? -(shape.radius || 20) - 4 : -4}
                    width={shape.type === 'circle' ? ((shape.radius || 20) * 2) + 8 : (shape.width || 40) + 8}
                    height={shape.type === 'circle' ? ((shape.radius || 20) * 2) + 8 : (shape.height || 40) + 8}
                    stroke="#4f46e5"
                    strokeWidth={1}
                    dash={[4, 2]}
                  />
                )}

                {shape.type === 'rect' && (
                  <Rect 
                    width={shape.width || 0} 
                    height={shape.height || 0} 
                    fill={shape.fill} 
                    stroke={shape.stroke} 
                    strokeWidth={shape.strokeWidth} 
                  />
                )}
                {shape.type === 'square' && (
                  <Rect 
                    width={shape.width || 0} 
                    height={shape.height || 0} 
                    fill={shape.fill} 
                    stroke={shape.stroke} 
                    strokeWidth={shape.strokeWidth} 
                  />
                )}
                {shape.type === 'circle' && (
                  <Circle 
                    radius={shape.radius || 0} 
                    fill={shape.fill} 
                    stroke={shape.stroke} 
                    strokeWidth={shape.strokeWidth} 
                  />
                )}
                {shape.type === 'triangle' && (
                  <RegularPolygon 
                    sides={3} 
                    radius={shape.radius || 0} 
                    fill={shape.fill} 
                    stroke={shape.stroke} 
                    strokeWidth={shape.strokeWidth} 
                  />
                )}
                {shape.type === 'polygon' && (
                  <RegularPolygon 
                    sides={6} 
                    radius={shape.radius || 0} 
                    fill={shape.fill} 
                    stroke={shape.stroke} 
                    strokeWidth={shape.strokeWidth} 
                  />
                )}
                {shape.type === 'geometry' && (
                  <Group>
                    <RegularPolygon 
                      sides={4} 
                      radius={shape.radius || 0} 
                      fill={shape.fill} 
                      stroke={shape.stroke} 
                      strokeWidth={shape.strokeWidth} 
                    />
                    <Line 
                      points={[0, -(shape.radius || 0), 0, (shape.radius || 0)]} 
                      stroke={shape.stroke} 
                      strokeWidth={1} 
                      dash={[4, 4]} 
                    />
                    <Line 
                      points={[-(shape.radius || 0), 0, (shape.radius || 0), 0]} 
                      stroke={shape.stroke} 
                      strokeWidth={1} 
                      dash={[4, 4]} 
                    />
                  </Group>
                )}
                {shape.type === 'line' && (
                  <Line 
                    points={shape.points || [0,0,0,0]} 
                    stroke={shape.stroke} 
                    strokeWidth={shape.strokeWidth} 
                  />
                )}
                {shape.type === 'arrow' && (
                  <Arrow 
                    points={shape.points || [0,0,0,0]} 
                    stroke={shape.stroke} 
                    fill={shape.stroke} 
                    strokeWidth={shape.strokeWidth}
                    pointerLength={shape.strokeWidth * 3}
                    pointerWidth={shape.strokeWidth * 3}
                  />
                )}
                {shape.type === 'text' && (
                  <Text
                    text={shape.text || ''}
                    fontSize={shape.fontSize || 24}
                    fill={shape.fill || '#fff'}
                    fontFamily="mono"
                  />
                )}
              </Group>
            ))}
            
            {/* Fine Inks Rendering */}
            {currentSlide.lines.map((line) => (
              <Line
                key={line.id}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.brushSize}
                tension={0.4}
                lineCap="round"
                lineJoin="round"
                draggable={tool === 'select'}
                onDragEnd={(e) => {
                  line.points = line.points.map((p, idx) => {
                    const deltaX = e.target.x();
                    const deltaY = e.target.y();
                    return idx % 2 === 0 ? p + deltaX : p + deltaY;
                  });
                  e.target.position({ x: 0, y: 0 });
                }}
                onMouseEnter={(e) => { 
                  if (tool === 'eraser') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'cell';
                  }
                }}
                onClick={(e) => handleObjectClick(e, line.id, 'line')}
                onTap={(e) => handleObjectClick(e, line.id, 'line')}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
