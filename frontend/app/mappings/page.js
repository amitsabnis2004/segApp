"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function MappingsPage() {
  const [materials, setMaterials] = useState([]);
  const [material, setMaterial] = useState("hbn");
  const [mappingStatus, setMappingStatus] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [mappingFile, setMappingFile] = useState(null);
  const [datasetFile, setDatasetFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/materials`)
      .then((r) => r.json())
      .then((payload) => {
        const list = payload.materials || ["hbn"];
        setMaterials(list);
        setMaterial((prev) => (list.includes(prev) ? prev : list[0]));
      });
  }, []);

  useEffect(() => {
    refreshStatuses(material);
  }, [material]);

  async function refreshStatuses(nextMaterial) {
    const [mappingResp, modelResp] = await Promise.all([
      fetch(`${API}/materials/${nextMaterial}/mapping/status`).then((r) => r.json()),
      fetch(`${API}/materials/${nextMaterial}/model/status`).then((r) => r.json()),
    ]);
    setMappingStatus(mappingResp);
    setModelStatus(modelResp);
  }

  async function uploadMapping() {
    if (!mappingFile) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("mapping_file", mappingFile);
      const response = await fetch(`${API}/materials/${material}/mapping/upload`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(await response.text());
      setMessage("Mapping uploaded.");
      await refreshStatuses(material);
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function trainModel() {
    if (!datasetFile) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("dataset_file", datasetFile);
      const response = await fetch(`${API}/materials/${material}/model/train`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      setMessage(`Model trained. MAE: ${payload.mae.toFixed(4)} using ${payload.rows} rows.`);
      await refreshStatuses(material);
    } catch (e) {
      setError(e.message || "Training failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const csvTemplate = [
      "r,g,b,contrast,thickness_nm",
      "190,205,238,-0.045,0.33",
      "155,180,220,-0.100,0.66",
      "120,145,200,-0.160,1.00",
      "95,130,180,-0.250,2.20",
      "180,165,125,-0.320,5.00",
    ].join("\n");

    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${material || "material"}_train_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <h1>Mappings and Model Training</h1>
        <p className="small">Manage calibration mapping and train a data-driven thickness model from CSV.</p>
      </section>

      <section className="panel mapping-grid">
        <div>
          <label>Material</label>
          <select value={material} onChange={(e) => setMaterial(e.target.value)}>
            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <div className="status-box">
            <h3>Mapping Status</h3>
            {mappingStatus?.exists ? (
              <p className="status-ok">Available: {mappingStatus.entries} entries, source {mappingStatus.source}</p>
            ) : (
              <p className="status-bad">Not found for this material.</p>
            )}
          </div>

          <label>Upload mapping JSON</label>
          <input type="file" accept="application/json" onChange={(e) => setMappingFile(e.target.files?.[0] || null)} />
          <button disabled={!mappingFile || busy} onClick={uploadMapping}>Upload Mapping</button>
        </div>

        <div>
          <div className="status-box">
            <h3>Model Status</h3>
            {modelStatus?.exists ? (
              <p className="status-ok">
                Trained ({modelStatus.model_type}, degree {modelStatus.degree}, alpha {modelStatus.alpha})
                | rows {modelStatus.rows}
                | MAE {Number(modelStatus.mae).toFixed(4)}
                | RMSE {Number(modelStatus.rmse).toFixed(4)}
                | R2 {Number(modelStatus.r2).toFixed(4)}
              </p>
            ) : (
              <p className="status-bad">No trained model yet.</p>
            )}
          </div>

          <label>Train model with CSV</label>
          <input type="file" accept=".csv,text/csv" onChange={(e) => setDatasetFile(e.target.files?.[0] || null)} />
          <button className="secondary" onClick={downloadTemplate}>Download CSV Template</button>
          <button disabled={!datasetFile || busy} onClick={trainModel}>Train Model</button>
          <p className="small">CSV required columns: r,g,b,contrast,thickness_nm (optional: image_id,label,color_group)</p>
        </div>
      </section>

      {(message || error) && (
        <section className="panel">
          {message ? <p className="status-ok">{message}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </section>
      )}
    </main>
  );
}
