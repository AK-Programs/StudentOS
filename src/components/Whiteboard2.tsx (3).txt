import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Ellipse, Arrow, RegularPolygon, Text, Group } from 'react-konva';
import { Download, Eraser, MousePointer2, Move, Pen, PenTool, Square, Circle as CircleIcon, Triangle, Image as ImageIcon, Minus, Trash2, Undo2, Redo2, Palette, Pointer, Type, DownloadCloud, Expand, Type as TypeIcon } from 'lucide-react';

interface ShapeObj {
  id: string;
  type: 'rect' | 'circle' | 'triangle' | 'arrow' | 'line' | 'polygon';
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
  tool: 'pen' | 'highlighter';
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
  
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'select' | 'shape'>('pen');
  const [shapeType, setShapeType] = useState<'rect' | 'circle' | 'triangle' | 'arrow' | 'line'>('rect');
  
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [backgroundColor, setBackgroundColor] = useState('#0f172a');
  
  const stageRef = useRef<any>(null);
  const isDrawing = useRef(false);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: any) => {
    if (tool === 'select' || tool === 'eraser') return;
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'pen' || tool === 'highlighter') {
      const newLine: LineObj = {
        id: Date.now().toString(),
        tool,
        color: tool === 'highlighter' ? brushColor + '80' : brushColor,
        brushSize: tool === 'highlighter' ? brushSize * 3 : brushSize,
        points: [pos.x, pos.y, pos.x, pos.y],
      };
      const updatedSlides = [...slides];
      updatedSlides[activeSlideIdx].lines.push(newLine);
      setSlides(updatedSlides);
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
      const updatedSlides = [...slides];
      updatedSlides[activeSlideIdx].shapes.push(newShape);
      setSlides(updatedSlides);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || tool === 'select' || tool === 'eraser') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    const updatedSlides = [...slides];
    const currentSlide = updatedSlides[activeSlideIdx];

    if (tool === 'pen' || tool === 'highlighter') {
      let lastLine = currentSlide.lines[currentSlide.lines.length - 1];
      if (lastLine) {
        lastLine.points = lastLine.points.concat([point.x, point.y]);
      }
    } else if (tool === 'shape') {
      let lastShape = currentSlide.shapes[currentSlide.shapes.length - 1];
      if (lastShape) {
        if (lastShape.type === 'rect') {
          lastShape.width = point.x - lastShape.x;
          lastShape.height = point.y - lastShape.y;
        } else if (lastShape.type === 'circle') {
          lastShape.radius = Math.sqrt(Math.pow(point.x - lastShape.x, 2) + Math.pow(point.y - lastShape.y, 2));
        } else if (lastShape.type === 'line' || lastShape.type === 'arrow') {
          lastShape.points = [0, 0, point.x - lastShape.x, point.y - lastShape.y];
        } else if (lastShape.type === 'triangle') {
          lastShape.radius = Math.sqrt(Math.pow(point.x - lastShape.x, 2) + Math.pow(point.y - lastShape.y, 2));
        }
      }
    }
    setSlides(updatedSlides);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };
  
  const handleObjectClick = (e: any, id: string, type: 'line' | 'shape') => {
    if (tool === 'eraser') {
      const updatedSlides = [...slides];
      if (type === 'line') {
        updatedSlides[activeSlideIdx].lines = updatedSlides[activeSlideIdx].lines.filter(l => l.id !== id);
      } else {
        updatedSlides[activeSlideIdx].shapes = updatedSlides[activeSlideIdx].shapes.filter(s => s.id !== id);
      }
      setSlides(updatedSlides);
    }
  };

  const currentSlide = slides[activeSlideIdx];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans">
      <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors">Exit Session</button>
          <div className="text-white font-bold text-sm">Classroom SmartBoard 2.0</div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-950 border border-white/5 p-1 rounded-xl">
          <button onClick={() => setTool('select')} className={`p-2 rounded-lg transition-all ${tool === 'select' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><MousePointer2 className="w-4 h-4" /></button>
          <button onClick={() => setTool('pen')} className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Pen className="w-4 h-4" /></button>
          <button onClick={() => setTool('highlighter')} className={`p-2 rounded-lg transition-all ${tool === 'highlighter' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><PenTool className="w-4 h-4" /></button>
          
          <div className="relative group">
            <button onClick={() => setTool('shape')} className={`p-2 rounded-lg transition-all ${tool === 'shape' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Square className="w-4 h-4" />
            </button>
            <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 hidden group-hover:flex flex-col gap-1 w-32 z-50">
               <button onClick={() => { setTool('shape'); setShapeType('rect'); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${shapeType === 'rect' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Square className="w-3 h-3" /> Rectangle</button>
               <button onClick={() => { setTool('shape'); setShapeType('circle'); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${shapeType === 'circle' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><CircleIcon className="w-3 h-3" /> Circle</button>
               <button onClick={() => { setTool('shape'); setShapeType('triangle'); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${shapeType === 'triangle' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Triangle className="w-3 h-3" /> Triangle</button>
               <button onClick={() => { setTool('shape'); setShapeType('arrow'); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${shapeType === 'arrow' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>↗ Arrow</button>
               <button onClick={() => { setTool('shape'); setShapeType('line'); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${shapeType === 'line' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Minus className="w-3 h-3" /> Line</button>
            </div>
          </div>
          
          <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Eraser className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {[ '#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b' ].map(c => (
              <button key={c} onClick={() => setBrushColor(c)} className={`w-6 h-6 rounded-full border-2 ${brushColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="h-6 w-px bg-white/10" />
          <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-24 accent-indigo-500" />
        </div>
      </div>
      
      <div className="flex-1 relative" style={{ cursor: tool === 'select' ? 'default' : tool === 'eraser' ? 'url(/eraser.png), pointer' : 'crosshair', backgroundColor }}>
         <Stage
            width={canvasSize.width}
            height={canvasSize.height - 56}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            ref={stageRef}
          >
            <Layer>
              {currentSlide.shapes.map((shape) => (
                <Group key={shape.id} x={shape.x} y={shape.y} draggable={tool === 'select'}
                  onMouseEnter={(e) => { if (tool === 'eraser') e.target.getStage()?.container().style.setProperty('cursor', 'pointer'); }}
                  onMouseLeave={(e) => { if (tool === 'eraser') e.target.getStage()?.container().style.setProperty('cursor', 'crosshair'); }}
                  onClick={(e) => handleObjectClick(e, shape.id, 'shape')}
                  onTap={(e) => handleObjectClick(e, shape.id, 'shape')}
                >
                  {shape.type === 'rect' && <Rect width={shape.width || 0} height={shape.height || 0} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />}
                  {shape.type === 'circle' && <Circle radius={shape.radius || 0} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />}
                  {shape.type === 'triangle' && <RegularPolygon sides={3} radius={shape.radius || 0} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />}
                  {shape.type === 'line' && <Line points={shape.points || [0,0,0,0]} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />}
                  {shape.type === 'arrow' && <Arrow points={shape.points || [0,0,0,0]} stroke={shape.stroke} fill={shape.stroke} strokeWidth={shape.strokeWidth} pointerLength={10} pointerWidth={10} />}
                </Group>
              ))}
              
              {currentSlide.lines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  draggable={tool === 'select'}
                  onMouseEnter={(e) => { if (tool === 'eraser') e.target.getStage()?.container().style.setProperty('cursor', 'pointer'); }}
                  onMouseLeave={(e) => { if (tool === 'eraser') e.target.getStage()?.container().style.setProperty('cursor', 'crosshair'); }}
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
