import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, Download, Maximize2, RefreshCw, 
  AlertCircle, Settings2, ArrowRightLeft, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

interface ImageMetadata {
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({
    targetWidth: 0, targetHeight: 0, targetFormat: 'image/png' as ImageFormat,
    quality: 0.9, isProcessing: false, isLocked: true,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please upload a valid image.');
      return;
    }
    setError(null);
    setFile(selectedFile);
    setProcessedUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        const meta = {
          name: selectedFile.name, size: selectedFile.size, type: selectedFile.type,
          width: img.width, height: img.height, aspectRatio: img.width / img.height,
        };
        setMetadata(meta);
        setConfig(prev => ({ ...prev, targetWidth: img.width, targetHeight: img.height, targetFormat: selectedFile.type as ImageFormat }));
      };
      img.src = url;
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const processImage = async () => {
    if (!previewUrl || !metadata) return;
    setConfig(prev => ({ ...prev, isProcessing: true }));
    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise((r) => (img.onload = r));
      const canvas = canvasRef.current!;
      canvas.width = config.targetWidth;
      canvas.height = config.targetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, config.targetWidth, config.targetHeight);
      canvas.toBlob((blob) => {
        if (blob) setProcessedUrl(URL.createObjectURL(blob));
        setConfig(prev => ({ ...prev, isProcessing: false }));
      }, config.targetFormat, config.quality);
    } catch (e) {
      setError('Processing failed.');
      setConfig(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = processedUrl!;
    link.download = `converted-${metadata?.name.split('.')[0]}.${config.targetFormat.split('/')[1]}`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <div className="bg-black p-2 rounded-lg"><ArrowRightLeft className="text-white w-5 h-5" /></div>
          <h1 className="text-2xl font-bold tracking-tight">PixelShift</h1>
        </div>
        {file && <button onClick={() => setFile(null)} className="text-sm text-gray-500 hover:text-black">Reset</button>}
      </header>

      <main className="max-w-6xl mx-auto">
        {!file ? (
          <div 
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-3xl p-20 text-center bg-white hover:border-black transition-all cursor-pointer relative"
          >
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Drop your image here</h2>
            <p className="text-gray-500">Supports PNG, JPG, WEBP</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <img src={processedUrl || previewUrl || ''} className="w-full rounded-2xl max-h-[500px] object-contain bg-gray-50" alt="Preview" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] uppercase text-gray-400 font-bold">Dimensions</p>
                  <p className="font-semibold">{metadata ? `${metadata.width}x${metadata.height}` : '--'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] uppercase text-gray-400 font-bold">Size</p>
                  <p className="font-semibold">{metadata ? (metadata.size / 1024 / 1024).toFixed(2) + ' MB' : '--'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit">
              <div className="flex items-center gap-3 mb-8"><Settings2 className="w-6 h-6" /><h3 className="text-xl font-bold">Options</h3></div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm font-medium">Resize (px)</label></div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={config.targetWidth} onChange={(e) => setConfig({...config, targetWidth: +e.target.value})} className="p-3 bg-gray-50 border rounded-xl w-full" placeholder="Width" />
                    <input type="number" value={config.targetHeight} onChange={(e) => setConfig({...config, targetHeight: +e.target.value})} className="p-3 bg-gray-50 border rounded-xl w-full" placeholder="Height" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['image/jpeg', 'image/png', 'image/webp'].map(f => (
                      <button key={f} onClick={() => setConfig({...config, targetFormat: f as ImageFormat})} className={`py-2 rounded-xl text-xs font-bold uppercase ${config.targetFormat === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>{f.split('/')[1]}</button>
                    ))}
                  </div>
                </div>
                <button onClick={processImage} className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                  {config.isProcessing ? <RefreshCw className="animate-spin" /> : 'Convert & Resize'}
                </button>
                {processedUrl && (
                  <button onClick={downloadImage} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" /> Download Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


