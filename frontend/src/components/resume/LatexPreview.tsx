import { useMemo, useState, useEffect, useRef } from 'react';

interface Props {
  latexSource: string;
}

export default function LatexPreview({ latexSource }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!latexSource.trim()) {
      setHtml(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        // Dynamic import for latex.js (ESM compatible)
        const latexJs = await import('latex.js');
        const generator = new latexJs.HtmlGenerator({ hyphenate: false });
        const doc = latexJs.parse(latexSource, { generator });
        const domFragment = doc.htmlDocument();
        const serializer = new XMLSerializer();
        setHtml(serializer.serializeToString(domFragment));
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setHtml(null);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [latexSource]);

  if (!latexSource.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Start typing LaTeX to see a preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm font-mono text-destructive whitespace-pre-wrap overflow-auto h-full">
        <strong>LaTeX Rendering Error:</strong>
        <br />
        {error}
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Rendering...
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <iframe
        srcDoc={html}
        title="LaTeX Preview"
        className="w-full h-full border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
