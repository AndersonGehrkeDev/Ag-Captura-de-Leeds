"use client";

import { useState } from "react";
import { LocateFixed, MapPin, Minus, Plus } from "lucide-react";
import type { ProspectCompany } from "@/features/prospeccao/domain/company";
import { statusLabels } from "@/features/prospeccao/components/status-badge";

export default function DemoMap({ companies, selectedId, onSelect }: { companies: readonly ProspectCompany[]; selectedId: string | null; onSelect: (company: ProspectCompany) => void }) {
  const [zoom, setZoom] = useState(1);
  return <div className="demo-map" role="region" aria-label="Mapa ilustrativo de empresas fictícias">
    <div className="map-art" style={{ transform: `scale(${zoom})` }}>
      <svg viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice" className="map-streets" aria-hidden="true">
        <defs>
          <pattern id="blocks" width="54" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)"><rect width="54" height="42" fill="#111a1a" /><path d="M0 0H54V42H0Z M18 0V42 M36 0V42 M0 21H54" fill="none" stroke="#334035" strokeWidth="0.8" /><path d="M2 3H15V17H2Z M22 25H32V38H22Z M39 4H50V18H39Z" fill="#1a2421" /></pattern>
          <radialGradient id="mapGlow"><stop stopColor="#153823" stopOpacity=".6" /><stop offset="1" stopColor="#0c1418" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="600" height="480" fill="url(#blocks)" />
        <ellipse cx="280" cy="150" rx="190" ry="150" fill="url(#mapGlow)" />
        <path d="M-40 128C130 124 93 268 244 310S389 380 650 418" fill="none" stroke="#163c3d" strokeWidth="15" />
        <path d="M-40 128C130 124 93 268 244 310S389 380 650 418" fill="none" stroke="#406052" strokeWidth="1" />
        <g fill="#183225" stroke="#32502e" strokeWidth="1"><path d="M220 10l90 15 7 72-66 25-51-45Z" /><path d="M326 310l47-12 43 70-48 39-51-41Z" /><path d="M45 340l64-17 37 50-31 34-57-4Z" /></g>
        <g fill="none" stroke="#7a642e" strokeWidth="1.3" opacity=".8">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 61 - 80} -20L${i * 35 + 30} 160 ${i * 53 - 40} 300 ${i * 44 + 80} 510`} />)}{Array.from({ length: 11 }, (_, i) => <path key={i} d={`M-40 ${i * 48}L180 ${i * 37 + 40} 340 ${i * 50 - 10} 640 ${i * 43 + 10}`} />)}</g>
        <g fill="none" stroke="#ce9638" strokeWidth="2"><path d="M-20 430L120 273 230 192 340 83 440-20" /><path d="M-20 91L121 166 235 191 354 221 476 273 620 254" /><path d="M10 500L231 397 320 280 356 220 483 106 630 94" /><path d="M-10 280L130 297 266 276 454 368 620 456" /></g>
        <g fill="#afbab0" fontFamily="Arial,sans-serif" fontSize="13" letterSpacing="1.4"><text x="66" y="191">VILA EXEMPLO</text><text x="396" y="176">BAIRRO MODELO</text><text x="52" y="388">PINHEIROS</text><text x="341" y="435">VILA ILUSTRATIVA</text></g>
        <text x="305" y="270" textAnchor="middle" fill="#f5f7fa" stroke="#0b1216" strokeWidth="5" paintOrder="stroke" fontFamily="Arial,sans-serif" fontSize="28" fontWeight="bold">São Paulo</text>
      </svg>
      {companies.map((company) => <button key={company.id} type="button" className={`map-pin status-${company.status} ${selectedId === company.id ? 'selected' : ''}`} style={{ left: `${company.position.x}%`, top: `${company.position.y}%` }} aria-label={`Ver detalhes de ${company.name} no mapa`} aria-pressed={selectedId === company.id} onClick={() => onSelect(company)}><MapPin fill="currentColor" size={32} aria-hidden="true" /><span className="map-pin-dot" /></button>)}
    </div>
    <span className="map-demo-label">Mapa ilustrativo · posições fictícias</span>
    <div className="map-controls"><button type="button" aria-label="Ampliar mapa ilustrativo" disabled={zoom >= 1.4} onClick={() => setZoom(Math.min(1.4, zoom + .2))}><Plus size={20} /></button><button type="button" aria-label="Reduzir mapa ilustrativo" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - .2))}><Minus size={20} /></button><button type="button" aria-label="Restaurar visualização ilustrativa" onClick={() => setZoom(1)}><LocateFixed size={20} /></button></div>
    <div className="map-legend">{(['missing', 'improve', 'good'] as const).map((status) => <span key={status}><i className={`legend-dot status-${status}`} />{statusLabels[status]} ({companies.filter((company) => company.status === status).length})</span>)}</div>
  </div>;
}
