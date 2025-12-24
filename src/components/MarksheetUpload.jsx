import { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import refData from "../data/cse_2021.json";
import poolsJson from "../data/electivePools.json";

const gradePoints = refData.gradingScale;
const electivePools = poolsJson.electivePools;

const norm = (v = "") => v.toString().trim().toUpperCase();
const cleanCode = (v = "") =>
  norm(v)
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/OIE35I/g, "OIE351");

const fixGrade = (raw = "") => {
  let g = raw.toUpperCase().trim();
  g = g.replace(/[^A-Z0-9+]/g, "");
  if (g === "0") return "O";
  if (g.startsWith("A") && g.includes("+")) return "A+";
  if (g.startsWith("B") && g.includes("+")) return "B+";
  if (g === "A") return "A";
  if (g === "B") return "B";
  if (["O", "C", "U", "F", "RA", "SA", "W"].includes(g)) return g;
  return g;
};

export default function MarksheetUpload() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [department, setDepartment] = useState("");
  const [gpa, setGpa] = useState(null);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef(null);

  const findInPools = (code) => {
    const c = cleanCode(code);
    for (const key of Object.keys(electivePools)) {
      const group = electivePools[key];
      if (Array.isArray(group)) {
        const f = group.find((x) => norm(x.code) === c);
        if (f) return f;
      }
      if (typeof group === "object") {
        for (const sub of Object.values(group)) {
          if (!Array.isArray(sub)) continue;
          const f = sub.find((x) => norm(x.code) === c);
          if (f) return f;
        }
      }
    }
    return null;
  };

  const findCodeAnywhere = (code) => {
    const c = cleanCode(code);
    for (const [semKey, semObj] of Object.entries(refData.semesters)) {
      const found = semObj.courses.find((x) => norm(x.code) === c);
      if (found) return { sem: semKey, credits: found.credits || 0 };
    }
    const poolHit = findInPools(c);
    if (poolHit) return { sem: "", credits: poolHit.credits || 0 };
    return null;
  };

  const resolveCode = (sem, code) => {
    const s = norm(sem);
    const c = cleanCode(code);

    const semCourses = refData?.semesters?.[s]?.courses || [];
    let found = semCourses.find((x) => norm(x.code) === c);
    if (found) return { valid: true, credits: found.credits || 0 };

    for (const semObj of Object.values(refData.semesters)) {
      found = semObj.courses.find((x) => norm(x.code) === c);
      if (found) return { valid: true, credits: found.credits || 0 };
    }

    const poolHit = findInPools(c);
    if (poolHit) return { valid: true, credits: poolHit.credits || 0 };

    return { valid: false, credits: 0 };
  };

  const preprocessImage = async (file) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const scale = 3;

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      g = g > 150 ? 255 : g < 100 ? 0 : g;
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };

  const handleAnalyze = async () => {
    if (!file) return alert("Upload image");
    try {
      setRows([]);
      setName("");
      setRegNo("");
      setDepartment("");
      setGpa(null);
      setLoading(true);

      const processed = await preprocessImage(file);

      const {
        data: { text },
      } = await Tesseract.recognize(processed, "eng", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-()",
      });

      const r = text.match(/register number\s*:\s*(\d+)/i)?.[1] || "";
      const n = text.match(/name\s*:\s*([A-Z ]+)/i)?.[1] || "";
      const d =
        text.match(/branch\s*:\s*([A-Z. ]+)/i)?.[1] || refData.department;

      setRegNo(r.trim());
      setName(n.trim());
      setDepartment(d.trim());

      const extracted = text
        .split("\n")
        .map((line) => {
          const m = line.match(
            /(\d{1,2})\s+([A-Z0-9-]{4,8})\s+([A-Z+()0-9]{1,4})\s+PASS/i
          );
          if (!m) return null;

          const sem = m[1].replace(/^0/, "");
          const code = cleanCode(m[2]);
          const grade = fixGrade(m[3]);
          const res = resolveCode(sem, code);

          return { sem, code, grade, valid: res.valid, credits: res.credits };
        })
        .filter(Boolean);

      setRows(extracted);
      setLoading(false);
    } catch (e) {
      console.error(e);
      alert("Upload a clearer image for processing or enter manually.");
      setLoading(false);
    }
  };

  const handleEdit = (i, field, val) => {
    const updated = [...rows];

    if (field === "code") {
      const newCode = cleanCode(val);
      updated[i].code = newCode;
      const hit = findCodeAnywhere(newCode);
      if (hit) {
        if (!updated[i].sem && hit.sem) updated[i].sem = hit.sem;
        updated[i].valid = true;
        if (!newCode.startsWith("NM")) updated[i].credits = hit.credits;
      } else {
        updated[i].valid = false;
        if (!newCode.startsWith("NM")) updated[i].credits = 0;
      }
    } else if (field === "grade") {
      updated[i].grade = fixGrade(val);
    } else {
      updated[i][field] = norm(val);
    }

    const res = resolveCode(updated[i].sem, updated[i].code);
    updated[i].valid = res.valid;
    if (!updated[i].code.startsWith("NM")) updated[i].credits = res.credits;

    setRows(updated);
  };

  const addRow = () =>
    setRows([
      ...rows,
      { sem: "", code: "", grade: "", valid: false, credits: 0 },
    ]);

  const deleteRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  const calculateGPA = () => {
    if (rows.length === 0) return;

    const semSet = new Set(rows.map((r) => r.sem).filter(Boolean));
    if (semSet.size !== 1) {
      alert("❌ All subjects must belong to the same semester.");
      return;
    }

    let tp = 0,
      tc = 0;
    for (const r of rows) {
      if (!r.valid) return alert("❌ Fix invalid subject codes.");
      const gp = gradePoints[r.grade];
      if (gp !== undefined && r.credits > 0) {
        tp += gp * r.credits;
        tc += r.credits;
      }
    }
    if (tc > 0) setGpa((tp / tc).toFixed(2));
  };

  return (
    <div className="min-h-screen bg-gray-100 px-3 py-4 sm:px-6 flex justify-center">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg w-full max-w-7xl">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-indigo-600 mb-4">
          📄 Anna University GPA Calculator
        </h2>

        {/* Upload section */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border rounded p-2"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full sm:w-56 bg-indigo-600 text-white py-2 rounded-lg font-semibold"
          >
            {loading ? "Analyzing..." : "Load & Analyze"}
          </button>
        </div>

        {(name || regNo || department) && (
          <div className="mb-4 p-3 bg-indigo-50 rounded text-center">
            <h3 className="font-semibold text-lg">{name}</h3>
            <p>Reg No: {regNo}</p>
            <p>{department}</p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border text-sm sm:text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">✔</th>
                    <th className="border p-2">Sem</th>
                    <th className="border p-2">Code</th>
                    <th className="border p-2">Grade</th>
                    <th className="border p-2">Credits</th>
                    <th className="border p-2">🗑</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="border p-2 text-center">
                        {r.valid ? "✅" : "❌"}
                      </td>
                      <td className="border p-2">
                        <input
                          value={r.sem}
                          onChange={(e) => handleEdit(i, "sem", e.target.value)}
                          className="w-14 sm:w-16 border rounded px-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          value={r.code}
                          onChange={(e) =>
                            handleEdit(i, "code", e.target.value)
                          }
                          className="w-32 sm:w-48 border rounded px-2"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          value={r.grade}
                          onChange={(e) =>
                            handleEdit(i, "grade", e.target.value)
                          }
                          className="w-14 sm:w-16 border rounded px-1"
                        />
                      </td>
                      <td className="border p-2 text-center">
                        {r.code.startsWith("NM") ? (
                          <input
                            type="number"
                            min="0"
                            value={r.credits}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[i].credits = Number(e.target.value) || 0;
                              setRows(updated);
                            }}
                            className="w-14 sm:w-16 border rounded px-1 text-center"
                          />
                        ) : (
                          <b>{r.credits}</b>
                        )}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => deleteRow(i)}
                          className="text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={addRow}
                className="w-full bg-gray-600 text-white py-2 rounded-lg font-semibold"
              >
                ➕ Add Subject
              </button>
              <button
                onClick={calculateGPA}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold"
              >
                🧮 Calculate GPA
              </button>
            </div>

            {gpa && (
              <p className="mt-4 text-center text-lg font-bold text-green-700">
                GPA: {gpa}
              </p>
            )}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
