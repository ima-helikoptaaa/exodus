import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText } from 'lucide-react';
import { useCompileResume } from '@/hooks/use-resumes';

interface Props {
  latexSource: string;
  renderKey?: number;
}

export default function LatexPreview({ latexSource, renderKey }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const latexRef = useRef(latexSource);
  latexRef.current = latexSource;

  const compilePdf = useCompileResume();

  // Revoke old blob URL on cleanup or when replaced
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const compile = useCallback(async () => {
    const source = latexRef.current;
    if (!source.trim()) {
      setHtml(null);
      setError(null);
      return;
    }
    setCompiling(true);
    setPdfUrl(null);
    try {
      const latexJs = await import('latex.js');
      const generator = new latexJs.HtmlGenerator({ hyphenate: false });
      const doc = latexJs.parse(source, { generator });
      const domFragment = doc.htmlDocument();
      const serializer = new XMLSerializer();
      setHtml(serializer.serializeToString(domFragment));
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setCompiling(false);
    }
  }, []);

  const handleCompilePdf = useCallback(() => {
    const source = latexRef.current;
    if (!source.trim()) return;
    compilePdf.mutate(source, {
      onSuccess: (url) => {
        setPdfUrl(url);
        setError(null);
      },
    });
  }, [compilePdf]);

  // Auto-compile on renderKey change (explicit recompile trigger)
  useEffect(() => {
    compile();
  }, [renderKey, compile]);

  if (!latexSource.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Start typing LaTeX to see a preview...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-1.5 border-b bg-muted/50 shrink-0">
        <Button size="sm" variant="ghost" onClick={compile} disabled={compiling} className="text-xs h-7">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${compiling ? 'animate-spin' : ''}`} />
          {compiling ? 'Compiling...' : 'Recompile'}
        </Button>
        <Button
          size="sm"
          variant={pdfUrl ? 'default' : 'outline'}
          onClick={handleCompilePdf}
          disabled={compilePdf.isPending}
          className="text-xs h-7"
        >
          <FileText className={`h-3.5 w-3.5 mr-1 ${compilePdf.isPending ? 'animate-pulse' : ''}`} />
          {compilePdf.isPending ? 'Building PDF...' : 'Compile PDF'}
        </Button>
        {pdfUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPdfUrl(null)}
            className="text-xs h-7"
          >
            Back to preview
          </Button>
        )}
        {error && !pdfUrl && <span className="text-xs text-destructive truncate">Error in LaTeX</span>}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="Compiled PDF"
            className="w-full h-full border-0"
          />
        ) : error ? (
          <div className="p-4 text-sm font-mono whitespace-pre-wrap overflow-auto">
            <div className="text-destructive mb-3">
              <strong>LaTeX Rendering Error:</strong>
              <br />
              {error}
            </div>
            <p className="text-xs text-muted-foreground">
              Note: The live preview uses latex.js which has limited package support.
              Commands like \hfill, titlesec, enumitem options may not render.
              Click "Compile PDF" to see the actual output using pdflatex.
            </p>
          </div>
        ) : html ? (
          <iframe
            srcDoc={html}
            title="LaTeX Preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {compiling ? 'Compiling...' : 'Click Recompile to render preview'}
          </div>
        )}
      </div>
    </div>
  );
}
