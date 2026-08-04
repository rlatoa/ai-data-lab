const starterCodes = {
  prepareCode: document.querySelector("#prepareCode").value,
  myDataCode: document.querySelector("#myDataCode").value
};
const runnerFiles = { prepare: null, myData: null };
let pythonWorker = null;
let runSequence = 0;
const pendingRuns = new Map();

function updateRuntimeStatus(message) {
  document.querySelectorAll(".runtime-status").forEach((element) => { element.textContent = message; });
}

function createPythonWorker() {
  if (pythonWorker) return pythonWorker;
  pythonWorker = new Worker("./py-worker.mjs", { type: "module" });
  pythonWorker.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "status") { updateRuntimeStatus(message.message); return; }
    const pending = pendingRuns.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRuns.delete(message.id);
    pending.button.disabled = false;
    pending.button.textContent = "▶ 코드 실행";
    pending.output.classList.remove("running", "error");
    if (message.error) {
      pending.output.classList.add("error");
      pending.output.textContent = `실행 오류\n${message.error}`;
    } else {
      pending.output.textContent = message.output || "실행은 완료되었지만 출력 결과가 없습니다. print()를 사용해 보세요.";
    }
  });
  pythonWorker.addEventListener("error", () => {
    updateRuntimeStatus("실행 환경을 불러오지 못했습니다. 인터넷 연결을 확인하세요.");
    for (const pending of pendingRuns.values()) {
      clearTimeout(pending.timer); pending.button.disabled = false; pending.button.textContent = "▶ 코드 실행";
      pending.output.className = "python-output error"; pending.output.textContent = "Python 실행 환경을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도하세요.";
    }
    pendingRuns.clear(); pythonWorker = null;
  });
  return pythonWorker;
}

function registerFileInput(inputId, runner) {
  document.querySelector(inputId).addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { event.target.value = ""; runnerFiles[runner] = null; showToast("2MB 이하의 CSV 파일을 선택하세요."); return; }
    runnerFiles[runner] = file;
    showToast(`${file.name} 파일을 준비했습니다.`);
  });
}
registerFileInput("#prepareCsv", "prepare");
registerFileInput("#myDataCsv", "myData");

async function runStudentCode(runner, button) {
  const file = runnerFiles[runner];
  const editor = document.querySelector(runner === "prepare" ? "#prepareCode" : "#myDataCode");
  const output = document.querySelector(runner === "prepare" ? "#prepareOutput" : "#myDataOutput");
  if (!file) { showToast("먼저 CSV 파일을 선택하세요."); return; }
  if (!editor.value.trim()) { showToast("실행할 Python 코드를 작성하세요."); return; }
  const id = ++runSequence;
  button.disabled = true; button.textContent = "실행 중…";
  output.classList.remove("error"); output.classList.add("running");
  output.textContent = "Python과 pandas를 준비하고 있습니다. 첫 실행은 시간이 조금 걸릴 수 있어요.";
  const timer = setTimeout(() => {
    const pending = pendingRuns.get(id); if (!pending) return;
    pendingRuns.delete(id); pythonWorker?.terminate(); pythonWorker = null;
    button.disabled = false; button.textContent = "▶ 코드 실행";
    output.className = "python-output error"; output.textContent = "실행 시간이 60초를 넘었습니다. 인터넷 연결, 반복문, 데이터 크기를 확인한 뒤 다시 실행하세요.";
  }, 60000);
  pendingRuns.set(id, { button, output, timer });
  const bytes = await file.arrayBuffer();
  createPythonWorker().postMessage({ id, code: editor.value, bytes }, [bytes]);
}

document.querySelectorAll(".run-python").forEach((button) => button.addEventListener("click", () => runStudentCode(button.dataset.runner, button)));
document.querySelectorAll(".python-editor").forEach((editor) => editor.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); const runner = editor.id === "prepareCode" ? "prepare" : "myData"; runStudentCode(runner, document.querySelector(`[data-runner="${runner}"]`)); }
  if (event.key === "Tab") { event.preventDefault(); const start = editor.selectionStart; editor.setRangeText("    ", start, editor.selectionEnd, "end"); }
}));
document.querySelectorAll(".reset-code").forEach((button) => button.addEventListener("click", () => { document.querySelector(`#${button.dataset.editor}`).value = starterCodes[button.dataset.editor]; showToast("시작 코드를 복원했습니다."); }));
document.querySelectorAll(".clear-output").forEach((button) => button.addEventListener("click", () => { document.querySelector(`#${button.dataset.output}`).textContent = "출력을 지웠습니다."; }));
