import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva';
import { Pencil, Square, Circle as CircleIcon, Type, Eraser, MousePointer2, Save, Send, Sparkles, X, ChevronDown, Download, Image as ImageIcon } from 'lucide-react';

interface Whiteboard2Props {
  onClose?: () => void;
  currentUser?: any;
}

export function Whiteboard2({ onClose, currentUser }: Whiteboard2Props) {
  const [tool, setTool] = useState<'select' | 'pen' | 'eraser' | 'rect' | 'circle' | 'text' | 'sticky'>('pen');
  const [lines, setLines] = useState<any[]>([]);
  const [shapes, setShapes] = useState<any[]>([]);
  const [stickies, setStickies] = useState<any[]>([]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  
  const stageRef = useRef<any>(null);

  // AI Features State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMode, setAiMode] = useState<'diagram' | 'flowchart' | 'solve' | 'assistant'>('assistant');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleMouseDown = (e: any) => {
    if (tool === 'select') return;
    
    const pos = e.target.getStage().getPointerPosition();
    if (tool === 'pen' || tool === 'eraser') {
      setIsDrawing(true);
      setLines([...lines, { tool, points: [pos.x, pos.y], color, brushSize }]);
    } else if (tool === 'rect') {
      const newShape = { id: `rect-${Date.now()}`, type: 'rect', x: pos.x, y: pos.y, width: 100, height: 100, fill: color + '40', stroke: color };
      setShapes([...shapes, newShape]);
      setTool('select');
    } else if (tool === 'circle') {
      const newShape = { id: `circle-${Date.now()}`, type: 'circle', x: pos.x, y: pos.y, radius: 50, fill: color + '40', stroke: color };
      setShapes([...shapes, newShape]);
      setTool('select');
    } else if (tool === 'sticky') {
      const newSticky = { id: `sticky-${Date.now()}`, x: pos.x, y: pos.y, text: 'New Note', color: '#fef08a' };
      setStickies([...stickies, newSticky]);
      setTool('select');
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || (tool !== 'pen' && tool !== 'eraser')) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setIsProcessing(true);
    setAiResponse("Processing AI request via Gemini...");
    
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `As an AI Teaching Assistant, ${aiMode === 'diagram' ? 'describe a diagram for' : aiMode === 'flowchart' ? 'create a flowchart for' : aiMode === 'solve' ? 'solve this equation and explain:' : 'help the teacher with:'} ${aiPrompt}`,
          persona: 'study_buddy',
          level: 'Secondary',
          mode: 'explanatory'
        })
      });
      const data = await res.json();
      setAiResponse(data.text || 'No response generated.');
      
      // Simulate adding to board if it's a diagram or flowchart
      if (aiMode === 'flowchart' || aiMode === 'diagram') {
         setStickies([...stickies, { 
           id: `sticky-${Date.now()}`, 
           x: 100 + Math.random() * 200, 
           y: 100 + Math.random() * 200, 
           text: `AI ${aiMode === 'diagram' ? 'Diagram' : 'Flowchart'}:\n${aiPrompt}`, 
           color: '#bfdbfe' 
         }]);
      }
    } catch (err) {
      setAiResponse("AI Connection failed.");
    } finally {
      setIsProcessing(false);
      setAiPrompt('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Whiteboard 2.0
          </h1>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-white/5">
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
                className={`p-2 rounded-md ${tool === t.id ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title={t.label}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {['#ffffff', '#f87171', '#4ade80', '#60a5fa', '#facc15', '#c084fc'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${aiPanelOpen ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-800 text-indigo-400 border-indigo-500/30 hover:bg-slate-700'}`}
          >
            <Sparkles className="w-4 h-4" /> AI Assistant
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold border border-white/10 transition-all">
            <Download className="w-4 h-4" /> Save
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
        <div className="flex-1 bg-slate-900" style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
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
              {shapes.map((shape, i) => (
                shape.type === 'rect' ? 
                  <Rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={2} draggable /> :
                  <Circle key={i} x={shape.x} y={shape.y} radius={shape.radius} fill={shape.fill} stroke={shape.stroke} strokeWidth={2} draggable />
              ))}
              
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === 'eraser' ? 'destination-out' : 'source-over'
                  }
                />
              ))}

              {stickies.map((sticky, i) => (
                <Group key={i} x={sticky.x} y={sticky.y} draggable>
                  <Rect width={150} height={150} fill={sticky.color} shadowColor="black" shadowBlur={10} shadowOpacity={0.3} cornerRadius={4} />
                  <Text text={sticky.text} padding={10} width={150} height={150} fill="#1e293b" fontSize={16} fontFamily="sans-serif" fontStyle="bold" />
                </Group>
              ))}
            </Layer>
          </Stage>
        </div>

        {/* AI Assistant Panel */}
        {aiPanelOpen && (
          <div className="w-80 bg-slate-900 border-l border-white/10 flex flex-col animate-slideInRight shadow-2xl z-20">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400" /> Teaching Assistant</h3>
              <button onClick={() => setAiPanelOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 border-b border-white/10 bg-slate-900">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'diagram', label: 'Diagrams' },
                  { id: 'flowchart', label: 'Flowcharts' },
                  { id: 'solve', label: 'Math Solver' },
                  { id: 'assistant', label: 'General' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setAiMode(m.id as any)}
                    className={`text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg border ${aiMode === m.id ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-950 text-slate-400 border-white/5 hover:bg-slate-800'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {aiResponse ? (
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                  <p className="text-xs text-indigo-100 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
                  <Sparkles className="w-8 h-8 opacity-20" />
                  <p className="text-xs">Ask Orion to generate content, solve equations, or provide notes directly to your board.</p>
                </div>
              )}
            </div>

            <form onSubmit={handleAiSubmit} className="p-4 border-t border-white/10 bg-slate-950">
              <div className="relative">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder={`Ask AI to ${aiMode}...`}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
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
