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
    // 학생 코드의 pd.read_csv('data.csv')가 같은 파일을 찾도록
    // 가상 파일시스템의 현재 작업 폴더를 파일 위치와 일치시킨다.
    pyodide.FS.writeFile("/data.csv", new Uint8Array(bytes));
    pyodide.FS.chdir("/");
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
