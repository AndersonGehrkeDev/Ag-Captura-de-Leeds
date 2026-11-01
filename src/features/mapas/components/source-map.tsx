"use client";

import { useId, useState } from "react";
import { LocateFixed, MapPin, Minus, Plus } from "lucide-react";
import type { CompanyRecord } from "@/domain/integrations/contracts";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const FreeMap = dynamic(() => import("./free-map"), { ssr: false, loading: () => <p role="status" className="source-map-scope">Carregando mapa gratuito…</p> });
type Props = { companies: readonly CompanyRecord[]; selectedId: string | null; onSelect: (reference: string) => void; attributions: readonly string[]; cartography?: boolean };
export default function SourceMap(props: Props) { return props.cartography ? <FreeMap {...props} /> : <CoordinateMap {...props} />; }

type Point = { reference: string; name: string; x: number; y: number };
const nameOf = (company: CompanyRecord) => company.name.state === "known" ? company.name.data.value : "Empresa sem nome informado";

// Só projeta coordenadas aprovadas recebidas do servidor. Sem tiles, ruas ou buscas externas.
function CoordinateMap({ companies, selectedId, onSelect, attributions }: {
  companies: readonly CompanyRecord[]; selectedId: string | null; onSelect: (reference: string) => void; attributions: readonly string[];
}) {
  const [zoom, setZoom] = useState(1); const [expanded, setExpanded] = useState<string | null>(null);
  const patternId = useId().replaceAll(":", "");
  const located = companies.filter((company) => company.coordinates !== null);
  const latitudes = located.map((company) => company.coordinates!.latitude);
  // Menor arco a partir do primeiro ponto, incluindo travessia do antimeridiano.
  const anchor = located[0]?.coordinates?.longitude ?? 0;
  const longitude = (value: number) => anchor + ((value - anchor + 540) % 360) - 180;
  const longitudes = located.map((company) => longitude(company.coordinates!.longitude));
  const minLatitude = Math.min(...latitudes, 90); const maxLatitude = Math.max(...latitudes, -90);
  const minLongitude = Math.min(...longitudes, 540); const maxLongitude = Math.max(...longitudes, -540);
  const latSpan = Math.max(maxLatitude - minLatitude, .002); const lonSpan = Math.max(maxLongitude - minLongitude, .002);
  const selected = located.find((company) => company.reference.value === selectedId)?.coordinates;
  const centerLatitude = zoom > 1 && selected ? selected.latitude : (minLatitude + maxLatitude) / 2;
  const centerLongitude = zoom > 1 && selected ? longitude(selected.longitude) : (minLongitude + maxLongitude) / 2;
  const points: Point[] = located.map((company) => ({ reference: company.reference.value, name: nameOf(company),
    x: 50 + (longitude(company.coordinates!.longitude) - centerLongitude) / lonSpan * 72 * zoom,
    y: 50 - (company.coordinates!.latitude - centerLatitude) / latSpan * 66 * zoom,
  })).filter((point) => point.x >= 7 && point.x <= 93 && point.y >= 16 && point.y <= 86);
  // Agrupamento visual dos resultados carregados; não é uma grade de consultas.
  const groups = new Map<string, Point[]>();
  for (const point of points) { const key = `${Math.floor(point.x / 14)}:${Math.floor(point.y / 16)}`; groups.set(key, [...(groups.get(key) ?? []), point]); }
  const activeGroup = expanded ? groups.get(expanded) : null;
  const credits = [...new Set([...attributions, ...companies.flatMap((company) => company.attributions)])];
  return <section className="source-map" aria-label="Mapa de coordenadas da fonte autorizada">
    <div className="source-map-canvas">
      <svg viewBox="0 0 600 440" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id={patternId} width="60" height="44" patternUnits="userSpaceOnUse"><path d="M60 0H0V44" fill="none" stroke="#d7a52e" strokeOpacity=".16" /></pattern></defs><rect width="600" height="440" fill={`url(#${patternId})`} /></svg>
      <p className="source-map-label">Coordenadas da fonte · sem cartografia Google</p>
      {located.length === 0 && <div className="map-placeholder"><MapPin size={30} aria-hidden="true" /><h2>Coordenadas não informadas</h2><p>Os mesmos resultados continuam disponíveis na Lista.</p></div>}
      {[...groups].map(([key, group]) => {
        const selected = group.some((point) => point.reference === selectedId);
        const single = group[0]!;
        return <button type="button" key={key} className={`source-map-marker ${group.length > 1 ? "is-cluster" : ""} ${selected ? "selected" : ""}`} style={{ left: `${group.reduce((sum, point) => sum + point.x, 0) / group.length}%`, top: `${group.reduce((sum, point) => sum + point.y, 0) / group.length}%` }} aria-pressed={selected} aria-expanded={group.length > 1 ? expanded === key : undefined} aria-label={group.length > 1 ? `Abrir grupo com ${group.length} empresas` : `Selecionar ${single.name} no mapa`} onClick={() => group.length > 1 ? setExpanded(expanded === key ? null : key) : onSelect(single.reference)}>{group.length > 1 ? group.length : <MapPin size={26} aria-hidden="true" />}</button>;
      })}
      <div className="map-controls"><button type="button" aria-label="Ampliar mapa de coordenadas" disabled={zoom >= 8} onClick={() => { setZoom(Math.min(8, zoom * 2)); setExpanded(null); }}><Plus size={20} /></button><button type="button" aria-label="Reduzir mapa de coordenadas" disabled={zoom <= 1} onClick={() => { setZoom(Math.max(1, zoom / 2)); setExpanded(null); }}><Minus size={20} /></button><button type="button" aria-label="Mostrar todas as coordenadas" onClick={() => { setZoom(1); setExpanded(null); }}><LocateFixed size={20} /></button></div>
    </div>
    {activeGroup && <div className="source-map-group" role="region" aria-label="Empresas do agrupamento"><strong>{activeGroup.length} empresas neste grupo</strong>{activeGroup.map((point) => <Button key={point.reference} variant="outline" aria-pressed={point.reference === selectedId} onClick={() => onSelect(point.reference)}>{point.name}</Button>)}</div>}
    <p className="source-map-scope">{located.length} de {companies.length} resultados filtrados com coordenadas{zoom > 1 ? ` · ${points.length} na ampliação atual` : ""}. Projeção esquemática, sem ruas ou divisas. Google Maps não está conectado.</p>
    {selectedId && <p className="source-map-selection" role="status">Selecionada: {companies.find((company) => company.reference.value === selectedId) ? nameOf(companies.find((company) => company.reference.value === selectedId)!) : "nenhuma"}</p>}
    {credits.map((credit) => <p className="live-attribution" key={credit}>{credit}</p>)}
  </section>;
}
