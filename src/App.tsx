import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Layers, 
  Scissors, 
  Download, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Shirt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';

// Types
interface FabricSwatch {
  id: string;
  url: string;
  name: string;
  base64: string;
}

interface GeneratedSketch {
  id: string;
  url: string;
  prompt: string;
  garmentType: string;
  fabricAId?: string;
  fabricBId?: string;
  timestamp: number;
}

const GARMENT_TYPES = [
  "Jumpsuit"
];

const STYLES = [
  "Technical Sketch",
  "Fashion Illustration",
  "Minimalist",
  "Streetwear"
];

export default function App() {
  const [fabricA, setFabricA] = useState<FabricSwatch | null>(null);
  const [fabricB, setFabricB] = useState<FabricSwatch | null>(null);
  const [selectedGarment, setSelectedGarment] = useState(GARMENT_TYPES[0]);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sketches, setSketches] = useState<GeneratedSketch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (file: File, slot: 'A' | 'B') => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const newFabric: FabricSwatch = {
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
        name: file.name,
        base64
      };
      if (slot === 'A') setFabricA(newFabric);
      else setFabricB(newFabric);
    };
    reader.readAsDataURL(file);
  };

  const generateSketch = async () => {
    if (!fabricA || !fabricB) {
      setError("Please upload both Plain Fabric (A) and Stripped Fabric (B).");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `Create a professional fashion flat sketch (technical drawing) of the specific Jumpsuit design shown in the provided technical sketch, using a complex fabric assignment.
      
      DESIGN SPECIFICATIONS:
      - The jumpsuit is a wide-leg style with a bib front and high waist.
      - It features thick straps that go over the shoulders.
      - It is worn over a simple black short-sleeved t-shirt.
      - The back view features cross-back straps.
      - IMPORTANT: REMOVE all back butt pockets. The back should be clean except for the specified panels.
      
      FABRIC ASSIGNMENT (Use the two provided fabric swatches):
      Fabric A = Plain Fabric
      Fabric B = Stripped Fabric
      
      FRONT VIEW MAPPING (CRITICAL: ASYMMETRIC COLOR BLOCKING):
      1. Bib — Use Fabric A. MANDATORY: The bib must be significantly higher than a standard bib, sitting high on the chest, closer to the collarbone than a typical overall bib.
      2. Waistband — Use Fabric B
      3. Straps — Use Fabric B
      4. Left Leg (Front) — MUST be split horizontally at the mid-thigh into two distinct fabric panels:
         - Upper Left Section (Thigh/Waist to Thigh): MANDATORY: Use Fabric B (Stripped).
         - Lower Left Section (Leg): MANDATORY: Use Fabric B (Stripped).
      5. Right Leg (Front) — MUST be split horizontally at the mid-thigh into two distinct fabric panels:
         - Upper Right Section (Thigh/Waist to Thigh): MANDATORY: Use Fabric B (Stripped).
         - Lower Right Section (Leg): MANDATORY: Use Fabric A (Plain).
      6. Cargo Pockets (Front) — Place 4 patch pockets in total (2 on each leg). 
         - CRITICAL: These pockets MUST NOT have flaps. They must be simple open-top patch pockets.
         - On each leg, place the first pocket on the upper thigh.
         - Place the second pocket exactly 3 inches below the first pocket on the same thigh/upper leg area.
         - All 4 pockets MUST use Fabric A.
      7. IMPORTANT: REMOVE all other front pockets (no ankle patch pockets, no waist pockets).
      
      BACK VIEW MAPPING (CRITICAL: CLEAN OPEN BACK):
      1. MANDATORY: REMOVE all fabric panels above the waistband. The back should be completely open above the waist.
      2. The Straps MUST be attached directly to the waistband in the back.
      3. Below the waistband, use the following panels:
         - Middle full length panel: Use Fabric A
         - Side panels (Left & Right) Full length: Use Fabric B
      4. IMPORTANT: CLEAN BACK. Remove ALL pockets from the back view.
      
      T-SHIRT:
      - The t-shirt underneath MUST remain solid black.
      
      OUTPUT STYLE:
      - Clean technical flat sketch on a solid white background.
      - Show both Front View and Back View side-by-side as technical drawings.
      - Crisp, professional black outlines.
      - Realistic fabric draping and texture mapping following the garment's form.
      - Ensure the fabric textures (Plain and Stripped) are clearly visible and mapped correctly to the designated panels.
      - IMPORTANT: The upper sections of both legs (from waistband down to mid-thigh) MUST use Fabric B (Stripped).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: fabricA.base64,
                mimeType: "image/png",
              },
            },
            {
              inlineData: {
                data: fabricB.base64,
                mimeType: "image/png",
              },
            },
            { text: prompt },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newSketch: GeneratedSketch = {
          id: Math.random().toString(36).substr(2, 9),
          url: imageUrl,
          prompt,
          garmentType: selectedGarment,
          fabricAId: fabricA.id,
          fabricBId: fabricB.id,
          timestamp: Date.now()
        };
        setSketches(prev => [newSketch, ...prev]);
      } else {
        throw new Error("No image was generated. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate sketch. Please check your API key or try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const removeFabric = (slot: 'A' | 'B') => {
    if (slot === 'A') setFabricA(null);
    else setFabricB(null);
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-sketch.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#141414] p-2 rounded-lg">
            <Scissors className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">FabricSketch AI</h1>
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Technical Fashion Design Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-mono opacity-50 uppercase">System Status</span>
            <span className="text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Gemini 2.5 Flash Online
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-88px)]">
        
        {/* Left Panel: Controls */}
        <aside className="lg:col-span-3 border-r border-[#141414] p-6 flex flex-col gap-8 bg-white/30 overflow-y-auto max-h-[calc(100vh-88px)]">
          
          {/* Fabric Library - Slot A & B */}
          <section className="flex flex-col gap-6">
            <h2 className="text-xs font-mono uppercase opacity-50 tracking-widest flex items-center gap-2">
              <Layers className="w-3 h-3" /> 01. Fabric Assignment
            </h2>

            {/* Slot A */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50 block">Fabric A (Plain)</label>
              {fabricA ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#141414] group">
                  <img src={fabricA.url} alt="Fabric A" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeFabric('A')}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video rounded-xl border-2 border-dashed border-[#141414]/20 hover:border-[#141414] transition-all flex flex-col items-center justify-center p-4 text-center group cursor-pointer overflow-hidden">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'A')}
                  />
                  <Upload className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-opacity mb-2" />
                  <p className="text-[11px] font-medium">Upload Plain Fabric</p>
                </div>
              )}
            </div>

            {/* Slot B */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50 block">Fabric B (Stripped)</label>
              {fabricB ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[#141414] group">
                  <img src={fabricB.url} alt="Fabric B" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeFabric('B')}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video rounded-xl border-2 border-dashed border-[#141414]/20 hover:border-[#141414] transition-all flex flex-col items-center justify-center p-4 text-center group cursor-pointer overflow-hidden">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'B')}
                  />
                  <Upload className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-opacity mb-2" />
                  <p className="text-[11px] font-medium">Upload Stripped Fabric</p>
                </div>
              )}
            </div>
          </section>

          {/* Garment Configuration */}
          <section className="flex flex-col gap-6">
            <div>
              <h2 className="text-xs font-mono uppercase opacity-50 tracking-widest mb-4 flex items-center gap-2">
                <Shirt className="w-3 h-3" /> 02. Garment Spec
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase opacity-50 block mb-2">Garment Type</label>
                  <div className="w-full bg-white/50 border border-[#141414]/20 rounded-lg px-3 py-2 text-sm font-bold uppercase opacity-50">
                    {selectedGarment}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase opacity-50 block mb-2">Design Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLES.map(style => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-[11px] font-medium border transition-all",
                          selectedStyle === style 
                            ? "bg-[#141414] text-white border-[#141414]" 
                            : "bg-white border-[#141414]/10 hover:border-[#141414]"
                        )}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={generateSketch}
              disabled={isGenerating || !fabricA || !fabricB}
              className={cn(
                "w-full py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                isGenerating || !fabricA || !fabricB
                  ? "bg-[#141414]/10 text-[#141414]/30 cursor-not-allowed"
                  : "bg-[#141414] text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#141414]/20"
              )}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Sketch
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            )}
          </section>

          <div className="mt-auto pt-6 border-t border-[#141414]/10">
            <p className="text-[10px] font-mono opacity-30 leading-relaxed uppercase">
              FabricSketch AI v1.0<br />
              Powered by Gemini 2.5 Flash<br />
              © 2024 FashionTech Labs
            </p>
          </div>
        </aside>

        {/* Main Workspace: Preview & History */}
        <section className="lg:col-span-9 p-8 overflow-y-auto max-h-[calc(100vh-88px)] bg-white/10">
          
          <div className="flex flex-col gap-12">
            
            {/* Latest Generation / Placeholder */}
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                  Workspace Preview
                </h2>
                {sketches.length > 0 && (
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSketches([])}
                      className="text-[10px] font-mono uppercase flex items-center gap-2 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear History
                    </button>
                    <button 
                      onClick={() => downloadImage(sketches[0].url, sketches[0].garmentType)}
                      className="text-[10px] font-mono uppercase flex items-center gap-2 hover:underline"
                    >
                      <Download className="w-3 h-3" /> Export High-Res
                    </button>
                  </div>
                )}
              </div>

              <div className="aspect-[16/9] lg:aspect-[21/9] bg-white rounded-2xl border border-[#141414] shadow-2xl relative overflow-hidden group">
                {isGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white/80 backdrop-blur-sm z-10">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-[#141414]/5 rounded-full" />
                      <div className="absolute inset-0 w-24 h-24 border-4 border-[#141414] border-t-transparent rounded-full animate-spin" />
                      <Scissors className="absolute inset-0 m-auto w-8 h-8 text-[#141414] animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold uppercase tracking-tight">Stitching your design...</p>
                      <p className="text-xs font-mono opacity-50 uppercase mt-1">Applying complex fabric mapping to patterns</p>
                    </div>
                  </div>
                ) : sketches.length > 0 ? (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    <motion.img 
                      key={sketches[0].id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={sketches[0].url} 
                      alt="Latest Generation" 
                      className="max-w-full max-h-full object-contain drop-shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                      <div className="bg-white/90 backdrop-blur-sm border border-[#141414] p-4 rounded-xl shadow-lg">
                        <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Active Spec</p>
                        <p className="text-sm font-bold uppercase">{sketches[0].style} {sketches[0].garmentType}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[9px] font-mono bg-[#141414] text-white px-1.5 py-0.5 rounded uppercase">Multi-Fabric Mapping</span>
                          <span className="text-[9px] font-mono bg-[#141414]/10 px-1.5 py-0.5 rounded uppercase">Technical Sketch</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
                    <div className="w-32 h-32 border-2 border-dashed border-[#141414] rounded-full flex items-center justify-center mb-6">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">No Active Project</h3>
                    <p className="max-w-md mt-2 text-sm">Upload both Plain (A) and Stripped (B) fabrics to generate your custom jumpsuit sketch.</p>
                  </div>
                )}
              </div>
            </div>

            {/* History Gallery */}
            {sketches.length > 1 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-tight">Design History</h2>
                  <span className="text-[10px] font-mono opacity-50 uppercase">{sketches.length - 1} Previous iterations</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sketches.slice(1).map((sketch) => (
                    <motion.div 
                      key={sketch.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative aspect-square bg-white rounded-xl border border-[#141414]/10 overflow-hidden hover:border-[#141414] transition-all cursor-pointer"
                    >
                      <img 
                        src={sketch.url} 
                        alt={sketch.garmentType} 
                        className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                        <p className="text-[10px] font-mono uppercase opacity-70">{new Date(sketch.timestamp).toLocaleDateString()}</p>
                        <p className="text-xs font-bold uppercase truncate">{sketch.garmentType}</p>
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); downloadImage(sketch.url, sketch.garmentType); }}
                            className="p-1.5 bg-white text-[#141414] rounded-md hover:bg-[#E4E3E0]"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSketches(prev => [sketch, ...prev.filter(s => s.id !== sketch.id)]); }}
                            className="p-1.5 bg-white text-[#141414] rounded-md hover:bg-[#E4E3E0]"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </section>
      </main>
    </div>
  );
}
