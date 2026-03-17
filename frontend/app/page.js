"use client";

import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function labelFromError(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message || "Unexpected error";
}

export default function HomePage() {
  const [materials, setMaterials] = useState([]);
  const [material, setMaterial] = useState("hbn");
  const [mappingStatus, setMappingStatus] = useState(null);
  const [mappingFile, setMappingFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [x, setX] = useState(200);
  const [y, setY] = useState(150);
  const [roi, setRoi] = useState('{"x":150,"y":110,"width":180,"height":120}');
  const [substrateRoi, setSubstrateRoi] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/materials`)
      .then((r) => r.json())
      .then((payload) => {
        const m = payload.materials || [];
        setMaterials(m);
        if (m.length && !m.includes(material)) {
          setMaterial(m[0]);
        }
      })
      .catch((e) => setError(labelFromError(e)));
  }, []);

  useEffect(() => {
    if (!material) return;
    fetch(`${API}/materials/${material}/mapping/status`)
      .then((r) => r.json())
      .then((payload) => setMappingStatus(payload))
      .catch((e) => setError(labelFromError(e)));
  }, [material]);

  useEffect(() => {
    if (!imageFile) {
      setPreview("");
      return;
    }
    const next = URL.createObjectURL(imageFile);
    setPreview(next);
    return () => URL.revokeObjectURL(next);
  }, [imageFile]);

  async function uploadMapping() {
    if (!mappingFile || !material) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("mapping_file", mappingFile);
      const response = await fetch(`${API}/materials/${material}/mapping/upload`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const statusResp = await fetch(`${API}/materials/${material}/mapping/status`);
      setMappingStatus(await statusResp.json());
    } catch (e) {
      setError(labelFromError(e));
    } finally {
      setBusy(false);
    }
  }

  async function runAnalysis() {
    if (!imageFile) {
      setError("Select an image first");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      form.append("image", imageFile);
      form.append("material", material);
      form.append("x", String(x));
      form.append("y", String(y));
      if (roi.trim()) form.append("roi_json", roi.trim());
      if (substrateRoi.trim()) form.append("substrate_roi_json", substrateRoi.trim());

      const response = await fetch(`${API}/analyze`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setResult(await response.json());
    } catch (e) {
      setError(labelFromError(e));
    } finally {
      setBusy(false);
    }
  }

  const mappingBanner = useMemo(() => {
    if (!mappingStatus) return null;
    if (mappingStatus.exists) {
      return (
        <p className="status-ok">
          Mapping available ({mappingStatus.source}, v{mappingStatus.version}, {mappingStatus.entries} rows)
        </p>
      );
    }
    return <p className="status-bad">Mapping missing: upload JSON mapping to proceed.</p>;
  }, [mappingStatus]);

  return (
    <main>
      <header>
        <h1>Nanoflake Thickness Lab</h1>
        <p>Material-specific color and contrast calibration for optical images.</p>
      </header>

      <section className="panel grid">
        <div>
          <h3>1) Material + Mapping</h3>
          <label>Material</label>
          <select value={material} onChange={(e) => setMaterial(e.target.value)}>
            {materials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {!materials.length && <option value="hbn">hbn</option>}
          </select>
          {mappingBanner}

          <label>Upload mapping JSON (if missing or to override)</label>
          <input type="file" accept="application/json" onChange={(e) => setMappingFile(e.target.files?.[0] || null)} />
          <div style={{ marginTop: 8 }}>
            <button disabled={!mappingFile || busy} onClick={uploadMapping}>Upload Mapping</button>
          </div>
          <p className="small">Expected schema: material/version/source/entries with color_range and contrast_range.</p>
        </div>

        <div>
          <h3>2) Image + ROI Setup</h3>
          <label>Microscope image</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
            <div>
              <label>Probe X</label>
              <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} />
            </div>
            <div>
              <label>Probe Y</label>
              <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
            </div>
          </div>

          <label>ROI JSON (optional)</label>
          <textarea rows={2} value={roi} onChange={(e) => setRoi(e.target.value)} />

          <label>Substrate ROI JSON (optional)</label>
          <textarea rows={2} value={substrateRoi} onChange={(e) => setSubstrateRoi(e.target.value)} />

          <div style={{ marginTop: 10 }}>
            <button disabled={busy || !(mappingStatus && mappingStatus.exists)} onClick={runAnalysis}>
              {busy ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel grid">
        <div>
          <h3>Preview</h3>
          {preview ? <img className="preview" src={preview} alt="Uploaded microscope sample" /> : <p className="small">No image selected yet.</p>}
        </div>

        <div>
          <h3>3) Result</h3>
          {error && <p className="status-bad">{error}</p>}
          {!result && !error && <p className="small">Run analysis to see thickness results.</p>}
          {result && (
            <div className="result">
              <div><strong>Material:</strong> {result.material}</div>
              <div><strong>Mapping source:</strong> {result.mapping_source}</div>
              <div><strong>Pixel label:</strong> {result.pixel_result.label}</div>
              <div><strong>Pixel thickness:</strong> {result.pixel_result.thickness_nm.toFixed(3)} nm</div>
              <div><strong>Pixel confidence:</strong> {(result.pixel_result.confidence * 100).toFixed(1)}%</div>
              <div><strong>Contrast:</strong> {result.pixel_result.contrast.toFixed(4)}</div>
              {result.roi_mean_thickness_nm !== null && (
                <>
                  <div><strong>ROI mean thickness:</strong> {result.roi_mean_thickness_nm.toFixed(3)} nm</div>
                  <div><strong>ROI mean intensity:</strong> {result.roi_mean_intensity.toFixed(2)}</div>
                  <div>
                    <strong>ROI class counts:</strong> {Object.entries(result.roi_label_breakdown || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
