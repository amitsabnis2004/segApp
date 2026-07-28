"use client";

import { useEffect, useRef, useState } from "react";

import { classifyByMapping, grayscaleIntensity } from "../lib/mappingClassifier";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function AnalyzePage() {
  const canvasRef = useRef(null);
  const [material, setMaterial] = useState("hbn");
  const [materials, setMaterials] = useState([]);
  const [mapping, setMapping] = useState(null);
  const [mappingStatus, setMappingStatus] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [hover, setHover] = useState({ x: 0, y: 0, rgb: [0, 0, 0], label: "--", colorGroup: "--", thickness: 0, confidence: 0, contrast: 0 });

  useEffect(() => {
    const stagedImage = sessionStorage.getItem("stage.uploadedImage") || "";
    if (stagedImage) {
      setImageDataUrl(stagedImage);
    }

    fetch(`${API}/materials`)
      .then((r) => r.json())
      .then((payload) => {
        const list = payload.materials || ["hbn"];
        setMaterials(list);
        setMaterial((prev) => (list.includes(prev) ? prev : list[0]));
      });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/materials/${material}/mapping/status`).then((r) => r.json()),
      fetch(`${API}/materials/${material}/mapping`).then((r) => r.json()),
    ]).then(([status, map]) => {
      setMappingStatus(status);
      setMapping(map);
    });
  }, [material]);

  useEffect(() => {
    if (!imageDataUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  function onMove(event) {
    const canvas = canvasRef.current;
    if (!canvas || !mapping) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) * (canvas.width / rect.width))));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) * (canvas.height / rect.height))));

    const ctx = canvas.getContext("2d");
    const px = ctx.getImageData(x, y, 1, 1).data;
    const rgb = [px[0], px[1], px[2]];

    const substrate = 214;
    const contrast = (grayscaleIntensity(rgb) - substrate) / substrate;
    const local = classifyByMapping(rgb, contrast, mapping);

    setHover({
      x,
      y,
      rgb,
      label: local.label,
      colorGroup: local.color_group,
      thickness: local.thickness_nm,
      confidence: local.confidence,
      contrast,
    });
  }

  return (
    <main className="page-wrap">
      <section className="panel analyze-header">
        <div>
          <h1>Live Image Analysis</h1>
          <p>Hover over the image to see real-time thickness prediction.</p>
        </div>
        <div>
          <label>Material</label>
          <select value={material} onChange={(e) => setMaterial(e.target.value)}>
            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {!mappingStatus?.exists ? <p className="status-bad">Mapping missing. Add it in /mappings.</p> : null}
        </div>
      </section>

      <section className="panel analyze-grid">
        <div className="canvas-wrap">
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          <canvas className="analysis-canvas" ref={canvasRef} onMouseMove={onMove} />
        </div>

        <aside className="hover-card">
          <h3>Live Hover Readout</h3>
          <p><strong>Pixel:</strong> ({hover.x}, {hover.y})</p>
          <p><strong>RGB:</strong> {hover.rgb.join(", ")}</p>
          <p><strong>Label:</strong> {hover.label}</p>
          <p><strong>Color Group:</strong> {hover.colorGroup}</p>
          <p><strong>Thickness:</strong> {hover.thickness.toFixed(3)} nm</p>
          <p><strong>Confidence:</strong> {(hover.confidence * 100).toFixed(1)}%</p>
          <p><strong>Contrast:</strong> {hover.contrast.toFixed(4)}</p>
        </aside>
      </section>
    </main>
  );
}
