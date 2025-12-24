import { useState } from "react";
import refData from "../data/cse_2021.json";

const semData = refData.semesters;

export default function CgpaCalculator() {
  const [count, setCount] = useState(0); // ✅ default 0
  const [rows, setRows] = useState([]);
  const [cgpa, setCgpa] = useState(null);

  const handleCountChange = (e) => {
    let val = Number(e.target.value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 8) val = 8; // max 8 semesters

    setCount(val);
    setCgpa(null);

    if (val === 0) {
      setRows([]);
      return;
    }

    const newRows = Array.from({ length: val }, (_, i) => {
      const sem = (i + 1).toString();
      return {
        sem,
        gpa: "",
        credits: semData[sem]?.totalCredits || 0,
      };
    });

    setRows(newRows);
  };

  const handleRowChange = (i, value) => {
    const updated = [...rows];
    updated[i].gpa = value;
    setRows(updated);
  };

  const calculateCGPA = () => {
    let totalPoints = 0;
    let totalCredits = 0;

    rows.forEach((r) => {
      const g = parseFloat(r.gpa);
      if (!isNaN(g) && g >= 0 && g <= 10) {
        totalPoints += g * r.credits;
        totalCredits += r.credits;
      }
    });

    if (totalCredits > 0) {
      setCgpa((totalPoints / totalCredits).toFixed(2));
    }
  };

  return (
    <div className="p-6 flex justify-center">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center text-indigo-600 mb-4">
          🎓 CGPA Calculator
        </h2>

        {/* Semester count */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">
            Number of semesters completed (0 - 8)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={count}
            onChange={handleCountChange}
            placeholder="Enter number of semesters"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Inputs appear only when count > 0 */}
        {count > 0 && (
          <>
            <div className="overflow-x-auto mt-4">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Sem</th>
                    <th className="border p-2">GPA</th>
                    <th className="border p-2">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="border p-2 text-center">{r.sem}</td>
                      <td className="border p-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 8.25"
                          value={r.gpa}
                          onChange={(e) => handleRowChange(i, e.target.value)}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="border p-2 text-center font-semibold">
                        {r.credits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={calculateCGPA}
              className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-semibold"
            >
              🧮 Calculate CGPA
            </button>

            {cgpa && (
              <p className="mt-3 text-center text-lg font-bold text-green-700">
                CGPA: {cgpa}
              </p>
            )}
          </>
        )}

        {/* Hint when 0 */}
        {count === 0 && (
          <p className="text-center text-gray-500 mt-4">
            👉 Enter number of semesters to start CGPA calculation
          </p>
        )}
      </div>
    </div>
  );
}
