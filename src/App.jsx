import { useState } from "react";
import MarksheetUpload from "./components/MarksheetUpload";
import CgpaCalculator from "./components/CgpaCalculator";

export default function App() {
  const [view, setView] = useState("home"); // home | gpa | cgpa

  return (
    <div className="min-h-screen flex flex-col ">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur shadow py-4">
        <h1 className="text-center text-2xl font-bold text-blue-800">
          🎓 Anna University GPA / CGPA Calculator
        </h1>
        <p className="text-center text-sm text-gray-700 mt-1">
          This tool is only for <b>CSE 2021 Regulation</b>
        </p>
      </div>

      {/* Home / Welcome Screen */}
      {view === "home" && (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
          <h2 className="text-3xl font-bold text-blue-900 mb-3">Welcome 👋</h2>
          <p className="text-blue-800 mb-8 max-w-xl">
            Choose what you want to calculate using your marksheet or semester
            GPA details.
          </p>

          <div className="flex gap-6 flex-wrap justify-center">
            <button
              onClick={() => setView("gpa")}
              className="px-8 py-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg"
            >
              📄 GPA Calculator
            </button>
            <button
              onClick={() => setView("cgpa")}
              className="px-8 py-4 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 transition shadow-lg"
            >
              📊 CGPA Calculator
            </button>
          </div>
        </div>
      )}

      {/* GPA View */}
      {view === "gpa" && (
        <>
          <div className="px-6 pt-4">
            <button
              onClick={() => setView("home")}
              className="text-blue-800 font-semibold hover:underline"
            >
              ← Back
            </button>
          </div>
          <MarksheetUpload />
        </>
      )}

      {/* CGPA View */}
      {view === "cgpa" && (
        <>
          <div className="px-6 pt-4">
            <button
              onClick={() => setView("home")}
              className="text-blue-800 font-semibold hover:underline"
            >
              ← Back
            </button>
          </div>
          <CgpaCalculator />
        </>
      )}
    </div>
  );
}
