"use client";

import { useEffect, useRef, useState } from "react";
import { Map as LibreMap, Marker, LngLatBounds, getVersion, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompanyRecord } from "@/domain/integrations/contracts";
import "maplibre-gl/dist/maplibre-gl.css";

type Properties = { reference: string; name: string };
type MapPoint = Properties & { longitude: number; latitude: number };
export default function FreeMap({ companies, selectedId, onSelect, attributions }: {
  companies: readonly CompanyRecord[]; selectedId: string | null; onSelect: (reference: string) => void; attributions: readonly string[];
}) {
  const container = useRef<HTMLDivElement>(null); const mapRef = useRef<LibreMap | null>(null);
  const markers = useRef<Marker[]>([]); const pointsRef = useRef<MapPoint[]>([]); const selected = useRef(selectedId); const select = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [group, setGroup] = useState<Properties[]>([]);
  const signature = JSON.stringify(companies.flatMap((company) => company.coordinates ? [{ reference: company.reference.value,
    name: company.name.state === "known" ? company.name.data.value : "Empresa sem nome informado", longitude: company.coordinates.longitude, latitude: company.coordinates.latitude }] : []));
  useEffect(() => {
    selected.current = selectedId; select.current = onSelect;
    for (const marker of markers.current) markSelection(marker.getElement(), selectedId);
  }, [onSelect, selectedId]);
  useEffect(() => {
    pointsRef.current = JSON.parse(signature) as MapPoint[];
    const map = mapRef.current; const source = map?.getSource("ag-companies") as GeoJSONSource | undefined;
    source?.setData(collection(pointsRef.current));
    if (map && source && pointsRef.current.length) fit(map, pointsRef.current);
  }, [signature]);
  useEffect(() => {
    if (!container.current) return;
    setWorkerUrl(`/vendor/maplibre/worker-${getVersion()}.mjs`);
    let map: LibreMap;
    try { map = new LibreMap({ container: container.current, style: "https://tiles.openfreemap.org/styles/dark", center: [-51, -14], zoom: 3, attributionControl: { compact: false }, cooperativeGestures: true,
      locale: { "Map.Title": "Mapa de empresas", "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + rolagem para ampliar o mapa", "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para ampliar o mapa", "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa" } }); }
    catch { const timer = window.setTimeout(() => setStatus("unavailable"), 0); return () => window.clearTimeout(timer); }
    mapRef.current = map;
    const timer = window.setTimeout(() => setStatus("unavailable"), 20000);
    function draw() {
      if (!map.getSource("ag-companies") || !map.isSourceLoaded("ag-companies")) return;
      const seen = new Set<string>(); const next: Marker[] = [];
      for (const feature of map.querySourceFeatures("ag-companies")) {
        if (feature.geometry.type !== "Point") continue;
        const props = feature.properties; const clustered = props.cluster === true; const clusterId = Number(props.cluster_id);
        const key = clustered ? `cluster:${clusterId}` : String(props.reference);
        if (seen.has(key)) continue; seen.add(key);
        const button = document.createElement("button"); button.type = "button"; button.className = `free-map-marker ${clustered ? "is-cluster" : ""}`;
        button.dataset.reference = clustered ? "" : String(props.reference); button.setAttribute("aria-pressed", String(!clustered && props.reference === selected.current));
        button.setAttribute("aria-label", clustered ? `Abrir grupo com ${props.point_count} empresas` : `Selecionar ${String(props.name)} no mapa`);
        button.textContent = clustered ? String(props.point_count) : "●";
        if (clustered) {
          const source = map.getSource("ag-companies") as GeoJSONSource;
          void source.getClusterLeaves(clusterId, 60, 0).then((leaves) => {
            if (mapRef.current !== map) return;
            button.dataset.members = JSON.stringify(leaves.flatMap((leaf) => typeof leaf.properties?.reference === "string" ? [leaf.properties.reference] : []));
            markSelection(button, selected.current);
          }).catch(() => {});
        }
        button.addEventListener("click", () => {
          if (!clustered) { select.current(String(props.reference)); return; }
          const source = map.getSource("ag-companies") as GeoJSONSource;
          void source.getClusterLeaves(clusterId, 60, 0).then((leaves) => {
            if (mapRef.current !== map) return;
            setGroup(leaves.flatMap((leaf) => typeof leaf.properties?.reference === "string" && typeof leaf.properties?.name === "string" ? [{ reference: leaf.properties.reference, name: leaf.properties.name }] : []));
          }).catch(() => {});
        });
        const coordinates = feature.geometry.coordinates;
        next.push(new Marker({ element: button }).setLngLat([coordinates[0]!, coordinates[1]!]).addTo(map));
      }
      markers.current.forEach((marker) => marker.remove()); markers.current = next;
    }
    map.on("load", () => {
      window.clearTimeout(timer); setStatus("ready");
      map.addSource("ag-companies", { type: "geojson", data: collection(pointsRef.current), cluster: true, clusterRadius: 45, clusterMaxZoom: 16 });
      // A camada mantém a fonte carregada; controles HTML de 44 px oferecem toque/teclado.
      map.addLayer({ id: "ag-points", type: "circle", source: "ag-companies", paint: { "circle-radius": 1, "circle-opacity": 0 } });
      fit(map, pointsRef.current);
    });
    map.on("sourcedata", (event) => { if (event.sourceId === "ag-companies") draw(); }); map.on("moveend", draw);
    map.on("error", () => setStatus("unavailable"));
    const resize = new ResizeObserver(() => map.resize()); resize.observe(container.current);
    return () => { window.clearTimeout(timer); resize.disconnect(); markers.current.forEach((marker) => marker.remove()); markers.current = []; mapRef.current = null; map.remove(); };
  }, []);
  const points = JSON.parse(signature) as MapPoint[];
  const activeGroup = group.filter((point) => points.some((entry) => entry.reference === point.reference));
  return <section className="source-map free-map" aria-label="Mapa OpenStreetMap de empresas">
    <div className="free-map-stage"><div ref={container} className="free-map-canvas" />
      <div className="map-controls"><button type="button" aria-label="Ampliar mapa" onClick={() => mapRef.current?.zoomIn()}><Plus size={20} /></button><button type="button" aria-label="Reduzir mapa" onClick={() => mapRef.current?.zoomOut()}><Minus size={20} /></button><button type="button" aria-label="Mostrar todas as empresas no mapa" onClick={() => { if (mapRef.current) fit(mapRef.current, pointsRef.current); }}><LocateFixed size={20} /></button></div>
    </div>
    {status !== "ready" && <p role="status" className="source-map-scope">{status === "loading" ? "Carregando mapa gratuito…" : "O mapa não carregou completamente. Os resultados e detalhes continuam disponíveis na aba Lista."}</p>}
    {!!activeGroup.length && <div className="source-map-group" role="region" aria-label="Empresas do agrupamento"><strong>{activeGroup.length} empresas neste grupo</strong>{activeGroup.map((point) => <Button key={point.reference} variant="outline" aria-pressed={selectedId === point.reference} onClick={() => onSelect(point.reference)}>{point.name}</Button>)}<Button variant="outline" onClick={() => setGroup([])}>Fechar grupo</Button></div>}
    <p className="source-map-scope">{points.length} de {companies.length} resultados filtrados com coordenadas. Mapa: <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors / ODbL</a>. Sem chave, cartão ou créditos.</p>
    {selectedId && <p role="status" className="source-map-selection">Selecionada: {points.find((point) => point.reference === selectedId)?.name ?? "empresa na lista"}</p>}
    {[...new Set(attributions)].map((credit) => <p className="live-attribution" key={credit}>{credit}</p>)}
  </section>;
}
function collection(points: MapPoint[]): FeatureCollection<Point, Properties> { return { type: "FeatureCollection", features: points.map(({ reference, name, longitude, latitude }) => ({ type: "Feature", properties: { reference, name }, geometry: { type: "Point", coordinates: [longitude, latitude] } })) }; }
function markSelection(element: HTMLElement, selectedId: string | null) {
  const members = element.dataset.members ? JSON.parse(element.dataset.members) as string[] : [];
  element.setAttribute("aria-pressed", String(selectedId !== null && (element.dataset.reference === selectedId || members.includes(selectedId))));
}
function fit(map: LibreMap, points: MapPoint[]) {
  if (!points.length) return;
  if (points.length === 1) { map.jumpTo({ center: [points[0]!.longitude, points[0]!.latitude], zoom: 14 }); return; }
  const bounds = new LngLatBounds(); points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
  map.fitBounds(bounds, { padding: 55, maxZoom: 15, duration: 0 });
}
