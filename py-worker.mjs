import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.29.2/full/pyodide.mjs";

let runtimePromise = null;
async function getRuntime() {
  if (!runtimePromise) {
    self.postMessage({ type: "status", message: "Python 실행 환경을 내려받는 중입니다…" });
    runtimePromise = loadPyodide().then(async (pyodide) => {
      self.postMessage({ type: "status", message: "pandas를 준비하는 중입니다…" });
      await pyodide.loadPackage("pandas");
      self.postMessage({ type: "status", message: "Python과 pandas를 사용할 수 있습니다." });
      return pyodide;
    });
  }
  return runtimePromise;
}

self.addEventListener("message", async (event) => {
  const { id, code, bytes } = event.data;
  try {
    const pyodide = await getRuntime();
    // Python이 실제로 사용하는 작업 폴더를 확인한 뒤 그 위치에 쓴다.
    // 절대 경로와 상대 경로를 모두 지원하기 위해 루트에도 같은 파일을 둔다.
    const csvBytes = new Uint8Array(bytes);
    const pythonCwd = String(pyodide.runPython("import os; os.getcwd()"));
    const relativeTarget = `${pythonCwd.replace(/\/$/, "")}/data.csv`;
    pyodide.FS.writeFile(relativeTarget, csvBytes);
    if (relativeTarget !== "/data.csv") pyodide.FS.writeFile("/data.csv", csvBytes);

    // 실행 직전에 Python에서도 파일이 보이는지 검사해 경로 문제를 즉시 발견한다.
    pyodide.globals.set("__uploaded_csv_path", relativeTarget);
    pyodide.runPython(`
import os
if not os.path.isfile(__uploaded_csv_path):
    raise FileNotFoundError(f"업로드 파일 준비 실패: {__uploaded_csv_path}")
`);
    const stdout = [], stderr = [];
    pyodide.setStdout({ batched: (text) => stdout.push(text) });
    pyodide.setStderr({ batched: (text) => stderr.push(text) });
    const result = await pyodide.runPythonAsync(code);
    if (result !== undefined && result !== null && String(result) !== "None") stdout.push(String(result));
    if (stderr.length) stdout.push(stderr.join("\n"));
    self.postMessage({ id, output: stdout.join("\n") });
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
});
