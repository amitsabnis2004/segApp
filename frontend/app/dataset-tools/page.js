"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function DatasetToolsPage() {
  const [materials, setMaterials] = useState([]);
  const [material, setMaterial] = useState("hbn");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [editedRows, setEditedRows] = useState([]);
  const [edited, setEdited] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLabel, setBulkLabel] = useState("");
  const [bulkColorGroup, setBulkColorGroup] = useState("");
  const [filterLabel, setFilterLabel] = useState("all");
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  useEffect(() => {
    fetch(`${API}/materials`)
      .then((r) => r.json())
      .then((payload) => {
        const list = payload.materials || ["hbn"];
        setMaterials(list);
        setMaterial((prev) => (list.includes(prev) ? prev : list[0]));
      });
  }, []);

  async function generateDataset() {
    if (!files.length) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      for (const f of files) {
        form.append("images", f);
      }

      const resp = await fetch(`${API}/materials/${material}/dataset/from-images`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }

      const payload = await resp.json();
      setResult(payload);
      setEditedRows(payload.rows || []);
      setEdited(false);
      setSelectedIds([]);
      setBulkLabel("");
      setBulkColorGroup("");
      setFilterLabel("all");
      setConfidenceMin(0);
      setPage(1);
      setPageSize(30);
      setMessage(`Generated ${payload.count} training rows.`);
    } catch (e) {
      setError(e.message || "Dataset conversion failed");
    } finally {
      setBusy(false);
    }
  }

  function toCsv(rows) {
    if (!rows?.length) return "";
    const header = ["image_id", "file_name", "label", "color_group", "r", "g", "b", "contrast", "thickness_nm"];
    const body = rows.map((row) => [
      row.image_id,
      String(row.file_name || "").replaceAll(",", "_"),
      row.label,
      row.color_group,
      row.r,
      row.g,
      row.b,
      row.contrast,
      row.thickness_nm,
    ].join(","));
    return `${header.join(",")}\n${body.join("\n")}\n`;
  }

  const trainingCsv = editedRows.length ? toCsv(editedRows) : (result?.csv || "");

  function downloadCsv() {
    if (!trainingCsv) return;
    const blob = new Blob([trainingCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${material}_dataset_from_images.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function trainFromGenerated() {
    if (!trainingCsv) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      form.append("dataset_file", new Blob([trainingCsv], { type: "text/csv" }), `${material}_dataset_from_images.csv`);
      const response = await fetch(`${API}/materials/${material}/model/train`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = await response.json();
      setMessage(`Model trained from generated dataset. MAE ${Number(payload.mae).toFixed(4)}.`);
    } catch (e) {
      setError(e.message || "Training failed");
    } finally {
      setBusy(false);
    }
  }

  function updateRow(index, key, value) {
    setEditedRows((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      if (key === "thickness_nm") {
        const parsed = Number(value);
        return { ...row, thickness_nm: Number.isFinite(parsed) ? parsed : row.thickness_nm };
      }
      return { ...row, [key]: value };
    }));
    setEdited(true);
  }

  function toggleSelect(imageId) {
    setSelectedIds((prev) => (prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]));
  }

  function selectVisibleRows() {
    const visible = pagedRows.map((r) => r.image_id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visible])));
  }

  function toggleSelectAllFiltered(checked) {
    if (checked) {
      const ids = filteredRows.map((r) => r.image_id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
      return;
    }
    const filteredSet = new Set(filteredRows.map((r) => r.image_id));
    setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function applyBulkChanges() {
    if (!selectedIds.length) return;
    if (!bulkLabel.trim() && !bulkColorGroup.trim()) return;

    setEditedRows((prev) => prev.map((row) => {
      if (!selectedIds.includes(row.image_id)) return row;
      return {
        ...row,
        label: bulkLabel.trim() ? bulkLabel.trim() : row.label,
        color_group: bulkColorGroup.trim() ? bulkColorGroup.trim() : (row.color_group || "Unknown"),
      };
    }));
    setEdited(true);
    setMessage(`Applied bulk changes to ${selectedIds.length} selected rows.`);
  }

  function applyThicknessPreset() {
    if (!selectedIds.length) return;

    setEditedRows((prev) => prev.map((row) => {
      if (!selectedIds.includes(row.image_id)) return row;
      const preset = THICKNESS_PRESETS[row.label?.trim().toLowerCase()];
      if (preset === undefined) return row;
      return { ...row, thickness_nm: preset };
    }));
    setEdited(true);
    setMessage(`Applied thickness presets to selected rows where label preset exists.`);
  }

  const uniqueLabels = Array.from(new Set(editedRows.map((r) => r.label).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const filteredRows = editedRows.filter((row) => {
    const matchLabel = filterLabel === "all" ? true : row.label === filterLabel;
    const conf = Number(row.confidence ?? 0);
    const matchConfidence = Number.isFinite(conf) ? conf >= confidenceMin : false;
    return matchLabel && matchConfidence;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedRows = filteredRows.slice(start, end);
  const isAllFilteredSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.includes(r.image_id));

  useEffect(() => {
    setPage(1);
  }, [filterLabel, confidenceMin, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <main className="page-wrap">
      <section className="panel">
        <h1>Dataset Uploader Utility</h1>
        <p className="small">Upload a folder of microscope images or a zip. The app auto-extracts color features and generates model-ready CSV.</p>
      </section>

      <section className="panel mapping-grid">
        <div>
          <label>Material</label>
          <select value={material} onChange={(e) => setMaterial(e.target.value)}>
            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <label>Upload Folder/Images</label>
          <input
            type="file"
            accept="image/*,.zip"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <p className="small">You can select many images at once, or provide a zip archive.</p>

          <button disabled={!files.length || busy} onClick={generateDataset}>Generate CSV Rows</button>
        </div>

        <div>
          <h3>Output</h3>
          <p><strong>Selected files:</strong> {files.length}</p>
          <p><strong>Rows generated:</strong> {result?.count || 0}</p>
          <p><strong>Rows after filter:</strong> {filteredRows.length}</p>
          <p><strong>Rows selected:</strong> {selectedIds.length}</p>
          <p><strong>Page:</strong> {safePage} / {totalPages}</p>
          <p><strong>Edited:</strong> {edited ? "Yes" : "No"}</p>
          <button className="secondary" disabled={!trainingCsv || busy} onClick={downloadCsv}>Download Generated CSV</button>
          <button disabled={!trainingCsv || busy} onClick={trainFromGenerated}>Train Model From Generated CSV</button>
        </div>
      </section>

      {(message || error) && (
        <section className="panel">
          {message ? <p className="status-ok">{message}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </section>
      )}

      {editedRows?.length ? (
        <section className="panel">
          <h3>Preview + Manual Relabel (first 30)</h3>
          <p className="small">You can correct label, color group, and thickness before download/training.</p>

          <div style={toolbarWrap}>
            <div style={toolbarRow}>
              <label style={toolbarLabel}>Filter label</label>
              <select value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)}>
                <option value="all">All labels</option>
                {uniqueLabels.map((label) => <option key={label} value={label}>{label}</option>)}
              </select>

              <label style={toolbarLabel}>Min confidence</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={confidenceMin}
                onChange={(e) => setConfidenceMin(Number(e.target.value || 0))}
              />
            </div>

            <div style={toolbarRow}>
              <button className="secondary" onClick={selectVisibleRows} disabled={!filteredRows.length}>Select Visible</button>
              <button className="secondary" onClick={clearSelection} disabled={!selectedIds.length}>Clear Selection</button>

              <input
                style={bulkInput}
                placeholder="Bulk label"
                value={bulkLabel}
                onChange={(e) => setBulkLabel(e.target.value)}
              />
              <input
                style={bulkInput}
                placeholder="Bulk color group"
                value={bulkColorGroup}
                onChange={(e) => setBulkColorGroup(e.target.value)}
              />

              <button onClick={applyBulkChanges} disabled={!selectedIds.length}>Apply Bulk Label/Color</button>
              <button className="secondary" onClick={applyThicknessPreset} disabled={!selectedIds.length}>Autofill Thickness by Label</button>
            </div>

            <div style={toolbarRow}>
              <label style={toolbarLabel}>Rows per page</label>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button className="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Prev</button>
              <button className="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next</button>
              <span style={toolbarLabel}>Showing {filteredRows.length ? start + 1 : 0}-{Math.min(end, filteredRows.length)} of {filteredRows.length}</span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                      title="Select all filtered rows"
                    />
                  </th>
                  <th style={th}>file_name</th>
                  <th style={th}>label</th>
                  <th style={th}>color_group</th>
                  <th style={th}>confidence</th>
                  <th style={th}>r</th>
                  <th style={th}>g</th>
                  <th style={th}>b</th>
                  <th style={th}>contrast</th>
                  <th style={th}>thickness_nm</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => {
                  const rowIndex = editedRows.findIndex((item) => item.image_id === row.image_id);
                  return (
                  <tr key={row.image_id}>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.image_id)}
                        onChange={() => toggleSelect(row.image_id)}
                      />
                    </td>
                    <td style={td}>{row.file_name}</td>
                    <td style={td}>
                      <input
                        style={cellInput}
                        value={row.label}
                        onChange={(e) => updateRow(rowIndex, "label", e.target.value)}
                      />
                    </td>
                    <td style={td}>
                      <input
                        style={cellInput}
                        value={row.color_group || "Unknown"}
                        onChange={(e) => updateRow(rowIndex, "color_group", e.target.value)}
                      />
                    </td>
                    <td style={td}>{Number(row.confidence ?? 0).toFixed(3)}</td>
                    <td style={td}>{row.r}</td>
                    <td style={td}>{row.g}</td>
                    <td style={td}>{row.b}</td>
                    <td style={td}>{row.contrast}</td>
                    <td style={td}>
                      <input
                        style={cellInput}
                        type="number"
                        step="0.001"
                        min="0"
                        value={row.thickness_nm}
                        onChange={(e) => updateRow(rowIndex, "thickness_nm", e.target.value)}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

const th = { textAlign: "left", borderBottom: "1px solid #c9dbe6", padding: "6px 8px" };
const td = { borderBottom: "1px solid #e5eef3", padding: "6px 8px", fontSize: "0.92rem" };
const cellInput = {
  width: "100%",
  border: "1px solid #c9dbe6",
  borderRadius: "6px",
  padding: "4px 6px",
  fontSize: "0.9rem",
};
const bulkInput = {
  border: "1px solid #c9dbe6",
  borderRadius: "6px",
  padding: "8px 10px",
  minWidth: "140px",
};
const toolbarWrap = { marginBottom: "12px", display: "grid", gap: "10px" };
const toolbarRow = { display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" };
const toolbarLabel = { fontSize: "0.9rem", color: "#27506a" };

const THICKNESS_PRESETS = {
  monolayer: 0.33,
  bilayer: 0.66,
  trilayer: 1.0,
  "few layers": 2.2,
  bulk: 5.0,
};
