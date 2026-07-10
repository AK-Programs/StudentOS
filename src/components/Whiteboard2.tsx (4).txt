import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, RegularPolygon, Arrow, Group } from 'react-konva';
import { Download, Eraser, MousePointer2, Pen, PenTool, Square, Circle as CircleIcon, Triangle, Minus, ChevronDown, Trash2, Sliders, Settings2 } from 'lucide-react';

interface ShapeObj {
  id: string;
  type: 'rect' | 'square' | 'circle' | 'triangle' | 'arrow' | 'line' | 'polygon' | 'geometry';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  fill?: string;
  stroke: string;
  strokeWidth: number;
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
  const [shapeType, setShapeType] = useState<'rect' | 'square' | 'circle' | 'triangle' | 'arrow' | 'line' | 'polygon' | 'geometry'>('rect');
  
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  
  const stageRef = useRef<any>(null);
  const isDrawing = useRef(false);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight - 60 });

  useEffect(() => {
    const handleResize = () => {
      if (stageRef.current) {
        setCanvasSize({ width: window.innerWidth, height: window.innerHeight - 60 });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const handleMouseDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    if (tool === 'eraser') {
      isDrawing.current = true;
      eraseAt(pos.x, pos.y);
      return;
    }
    
    if (tool === 'select') return;
    
    isDrawing.current = true;
    
    if (tool === 'pen' || tool === 'pencil' || tool === 'marker' || tool === 'highlighter') {
      let colorStr = brushColor;
      let sizeVal = brushSize;
      
      if (tool === 'pencil') {
        colorStr = brushColor + 'a0'; // semi-transparent thin
        sizeVal = Math.max(1, Math.round(brushSize * 0.5));
      } else if (tool === 'marker') {
        colorStr = brushColor;
        sizeVal = brushSize * 2.2;
      } else if (tool === 'highlighter') {
        colorStr = brushColor + '40'; // highlight transparent
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
    const point = stage.getPointerPosition();
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
    }
  };

  const currentSlide = slides[activeSlideIdx];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans select-none overflow-hidden">
      {/* SmartBar Header controls */}
      <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-white/5 shadow-md">
            Exit Board
          </button>
          <div className="text-white font-black text-sm tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            Class SmartBoard 2.0
          </div>
        </div>
        
        {/* Dynamic Tool Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-white/10 p-1.5 rounded-2xl shadow-inner">
          <button 
            onClick={() => { setTool('select'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Select & Move Tool"
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
            title="Thinner Graphite Pencil"
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
              <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">{shapeType}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {shapesMenuOpen && (
              <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 w-44 z-50 animate-fadeIn">
                 <div className="px-2.5 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">Shapes Menu</div>
                 <button onClick={() => { setTool('shape'); setShapeType('line'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'line' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Minus className="w-3.5 h-3.5" /> Line</button>
                 <button onClick={() => { setTool('shape'); setShapeType('arrow'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'arrow' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>↗ Arrow</button>
                 <button onClick={() => { setTool('shape'); setShapeType('rect'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'rect' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Square className="w-3.5 h-3.5" /> Rectangle</button>
                 <button onClick={() => { setTool('shape'); setShapeType('square'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'square' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Square className="w-3.5 h-3.5 text-indigo-400" /> Square</button>
                 <button onClick={() => { setTool('shape'); setShapeType('circle'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'circle' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><CircleIcon className="w-3.5 h-3.5" /> Circle</button>
                 <button onClick={() => { setTool('shape'); setShapeType('triangle'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'triangle' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Triangle className="w-3.5 h-3.5" /> Triangle</button>
                 <button onClick={() => { setTool('shape'); setShapeType('polygon'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'polygon' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><span className="text-xs font-extrabold font-mono">⬡</span> Polygon</button>
                 <button onClick={() => { setTool('shape'); setShapeType('geometry'); setShapesMenuOpen(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shapeType === 'geometry' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><span className="text-xs font-extrabold font-mono">📐</span> Geometry Tools</button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => { setTool('eraser'); setShapesMenuOpen(false); }} 
            className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            title="Real-Time Eraser (Drag or Click to Erase)"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Ink & Thickness controls */}
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
          <div className="h-5 w-px bg-white/10 hidden sm:block" />
          
          <div className="flex items-center gap-2 bg-slate-950 border border-white/5 px-2.5 py-1 rounded-xl">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <input 
              type="range" 
              min="1" 
              max="24" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))} 
              className="w-20 accent-indigo-500 cursor-pointer" 
              title="Stroke Thickness"
            />
            <span className="text-[10px] font-mono text-slate-400 w-4 text-center">{brushSize}px</span>
          </div>

          <button 
            onClick={handleClearCanvas}
            className="p-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 rounded-xl transition-all border border-white/5"
            title="Clear Entire Stage"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Canvas Drawing Stage View */}
      <div 
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
        >
          <Layer>
            {/* Draw existing shapes */}
            {currentSlide.shapes.map((shape) => (
              <Group 
                key={shape.id} 
                x={shape.x} 
                y={shape.y} 
                draggable={tool === 'select'}
                onMouseEnter={(e) => { 
                  if (tool === 'eraser') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'cell';
                  }
                }}
                onClick={(e) => handleObjectClick(e, shape.id, 'shape')}
                onTap={(e) => handleObjectClick(e, shape.id, 'shape')}
              >
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
                      sides={8} 
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
                    pointerLength={10} 
                    pointerWidth={10} 
                  />
                )}
              </Group>
            ))}
            
            {/* Draw active or static lines */}
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
