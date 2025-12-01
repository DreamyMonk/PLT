import { Layers3 } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center h-16 px-6 border-b bg-card">
      <div className="flex items-center gap-3">
        <Layers3 className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">PLT Overlay</h1>
      </div>
    </header>
  );
}
