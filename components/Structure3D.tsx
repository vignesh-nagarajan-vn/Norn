"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

/*
  A 3D view of the variant on its protein, when applicable. It maps the gene to
  a UniProt accession, loads the AlphaFold predicted structure in the browser,
  renders it with 3Dmol.js (loaded lazily from a CDN), and highlights the
  affected residue in the scheme accent. It renders nothing when the gene is not
  in the map or the protein position is unknown, and shows a small message if
  the structure or the viewer cannot be reached (for example offline).

  AlphaFold and the 3Dmol CDN are fetched from the browser, so this works on the
  live deployment even though a sandboxed build server may not reach them.
*/

// Gene symbol -> UniProt (reviewed, human). Covers the demo/eval genes plus
// common clinical genes; extend as needed.
const UNIPROT: Record<string, string> = {
  BRCA1: "P38398", BRCA2: "P51587", CFTR: "P13569", TP53: "P04637",
  MLH1: "P40692", MSH2: "P43246", MSH6: "P52701", PMS2: "P54278",
  APC: "P25054", HBB: "P68871", HFE: "Q30201", PTEN: "P60484",
  LDLR: "P01130", MYH7: "P12883", TNNT2: "P45379", MYBPC3: "Q14896",
  KCNQ1: "P51787", SCN5A: "Q14524", RB1: "P06400", VHL: "P40337",
  RET: "P07949", FBN1: "P35555", ATM: "Q13315", PALB2: "Q86YC2",
  CHEK2: "O96017", NF1: "P21359", STK11: "Q15831", CDH1: "P12830",
};

const CDN = "https://cdn.jsdelivr.net/npm/3dmol@2/build/3Dmol-min.js";

function cssHex(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

let loader: Promise<unknown> | null = null;
function load3Dmol(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.$3Dmol) return Promise.resolve(w.$3Dmol);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN;
    s.async = true;
    s.onload = () => resolve(w.$3Dmol);
    s.onerror = () => reject(new Error("viewer failed to load"));
    document.head.appendChild(s);
  });
  return loader;
}

type State = "loading" | "ready" | "error";

export default function Structure3D({
  gene,
  proteinPosition,
  queryLabel,
}: {
  gene: string | null;
  proteinPosition: number | null;
  queryLabel?: string;
}) {
  const uniprot = gene ? UNIPROT[gene.toUpperCase()] : undefined;
  const applicable = Boolean(uniprot) && proteinPosition != null;

  const mountRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const [state, setState] = useState<State>("loading");
  const [spin, setSpin] = useState(true);

  useEffect(() => {
    if (!applicable) return;
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const $3Dmol = (await load3Dmol()) as any;
        const res = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${uniprot}-F1-model_v4.pdb`);
        if (!res.ok) throw new Error(`structure ${res.status}`);
        const pdb = await res.text();
        if (cancelled || !mountRef.current) return;
        mountRef.current.innerHTML = "";
        const viewer = $3Dmol.createViewer(mountRef.current, {
          backgroundColor: cssHex("--surface", "#fbf8f1"),
          antialias: true,
        });
        viewerRef.current = viewer;
        viewer.addModel(pdb, "pdb");
        viewer.setStyle({}, { cartoon: { color: cssHex("--outline", "#9a8f79"), opacity: 0.85 } });
        const hi = cssHex("--secondary", "#8a5a2b");
        viewer.setStyle({ resi: proteinPosition }, { cartoon: { color: hi }, stick: { color: hi, radius: 0.32 }, sphere: { color: hi, radius: 1.4 } });
        viewer.addResLabels(
          { resi: proteinPosition },
          { fontSize: 12, backgroundColor: hi, backgroundOpacity: 0.9, fontColor: cssHex("--on-secondary", "#ffffff"), inFront: true },
        );
        viewer.zoomTo();
        viewer.zoomTo({ resi: proteinPosition }, 700);
        viewer.spin(spin);
        viewer.render();
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      try {
        viewerRef.current?.spin(false);
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniprot, proteinPosition]);

  useEffect(() => {
    try {
      if (viewerRef.current) {
        viewerRef.current.spin(spin);
        viewerRef.current.render();
      }
    } catch {
      /* ignore */
    }
  }, [spin]);

  if (!applicable) return null;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-on-surface">
          <Icon name="view_in_ar" className="text-secondary" /> 3D structure ({gene})
        </h3>
        {state === "ready" && (
          <button
            type="button"
            onClick={() => setSpin((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"
          >
            <Icon name={spin ? "pause" : "play_arrow"} size={16} /> {spin ? "Pause" : "Spin"}
          </button>
        )}
      </div>
      <div className="relative">
        <div ref={mountRef} className="h-[320px] w-full overflow-hidden rounded-md border border-outline-variant bg-surface-bright" />
        {state !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md text-center text-sm text-on-surface-variant">
            {state === "loading" ? (
              <span className="animate-norn-pulse">Loading AlphaFold structure...</span>
            ) : (
              <span className="max-w-xs px-4 text-[13px]">
                The 3D structure could not be loaded here (AlphaFold or the viewer was unreachable). It renders on the
                live deployment.
              </span>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-outline">
        AlphaFold predicted model AF-{uniprot}, residue {proteinPosition}
        {queryLabel && queryLabel !== "query" ? ` (${queryLabel})` : ""} highlighted. Predicted structure, for
        orientation only, not evidence.
      </p>
    </section>
  );
}
