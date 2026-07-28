"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const [file, setFile] = useState(null);

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  async function continueToAnalyze() {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    sessionStorage.setItem("stage.uploadedImage", dataUrl);
    sessionStorage.setItem("stage.uploadedImageName", file.name);
    router.push("/analyze");
  }

  return (
    <main className="page-wrap">
      <section className="hero panel">
        <h1>Nanoflake Thickness Lab</h1>
        <p>Stage-based workflow for mapping management, model training, and live thickness estimation.</p>
      </section>

      <section className="panel stage-grid">
        <article className="stage-card">
          <h2>Stage A: Upload and Analyze</h2>
          <p>Upload microscopy image here, then continue to live hover thickness view.</p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button disabled={!file} onClick={continueToAnalyze}>Open Live Analysis</button>
          {previewUrl ? <Image className="preview-image" src={previewUrl} alt="Uploaded preview" width={800} height={500} unoptimized /> : null}
        </article>

        <article className="stage-card">
          <h2>Stage B: Mappings and Model</h2>
          <p>Add/update material mappings and train a regression model from calibration data CSV.</p>
          <button className="secondary" onClick={() => router.push("/mappings")}>Open Mapping and Model Page</button>
        </article>
      </section>
    </main>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
