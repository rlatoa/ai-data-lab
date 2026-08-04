let uploadedData = null;
let processedData = null;
const missingTokens = new Set(["", "nan", "null", "na", "n/a", "undefined"]);
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const isMissing = (value) => missingTokens.has(String(value).trim().toLowerCase());

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(field); field = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = []; field = ""; continue;
    }
    field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (quoted) throw new Error("따옴표가 닫히지 않은 CSV 파일입니다.");
  if (rows.length < 2) throw new Error("속성명과 데이터 행이 있는 CSV 파일이 필요합니다.");
  const headers = rows[0].map((cell, index) => cell.trim() || `속성${index + 1}`);
  if (new Set(headers).size !== headers.length) throw new Error("같은 속성명이 두 번 이상 있습니다.");
  return { headers, rows: rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()]))) };
}

function numericColumns(data) {
  return data.headers.filter((header) => {
    const values = data.rows.map((row) => row[header]).filter((value) => !isMissing(value));
    return values.length > 0 && values.filter((value) => Number.isFinite(Number(value))).length / values.length >= 0.9;
  });
}

function renderUploadPreview(data, file) {
  $("#uploadWelcome").hidden = true;
  $("#uploadWorkspace").hidden = false;
  $("#uploadedFileName").textContent = file.name;
  const missing = data.headers.reduce((sum, header) => sum + data.rows.filter((row) => isMissing(row[header])).length, 0);
  const numbers = numericColumns(data);
  $("#fileSummary").innerHTML = [["행", data.rows.length], ["열", data.headers.length], ["숫자 속성", numbers.length], ["전체 결측치", missing]].map(([label, value]) => `<div class="summary-item"><span>${label}</span><b>${value.toLocaleString()}</b></div>`).join("");
  $("#uploadTableHead").innerHTML = `<tr>${data.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  $("#uploadTableBody").innerHTML = data.rows.slice(0, 10).map((row) => `<tr>${data.headers.map((header) => `<td>${isMissing(row[header]) ? '<em class="missing-value">결측</em>' : escapeHtml(row[header])}</td>`).join("")}</tr>`).join("");
  const options = numbers.map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`).join("");
  ["columnSelect", "correlationX", "correlationY"].forEach((id) => { $(`#${id}`).innerHTML = options; });
  if (numbers.length > 1) $("#correlationY").selectedIndex = 1;
  $("#analyzeFile").disabled = numbers.length === 0;
  $("#analyzeCorrelation").disabled = numbers.length < 2;
  $("#uploadFeedback").textContent = numbers.length ? "파일을 읽었습니다. 분석할 숫자 속성을 선택하세요." : "숫자형으로 판단할 수 있는 속성이 없습니다.";
}

function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  const position = (sorted.length - 1) * q, base = Math.floor(position), rest = position - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function analyzeColumn(header, strategy) {
  const raw = uploadedData.rows.map((row) => row[header]);
  const valid = raw.filter((value) => !isMissing(value) && Number.isFinite(Number(value))).map(Number);
  if (!valid.length) throw new Error("분석할 숫자가 없습니다.");
  const sorted = [...valid].sort((a, b) => a - b);
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const median = quantile(sorted, 0.5), q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75), iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr, upper = q3 + 1.5 * iqr;
  const outliers = valid.filter((value) => value < lower || value > upper);
  processedData = {
    headers: [...uploadedData.headers],
    rows: uploadedData.rows.filter((row) => strategy !== "drop" || !isMissing(row[header])).map((row) => {
      const copy = { ...row };
      if (isMissing(copy[header])) {
        if (strategy === "mean") copy[header] = String(mean);
        if (strategy === "median") copy[header] = String(median);
      }
      return copy;
    })
  };
  return { valid: valid.length, missing: raw.filter(isMissing).length, mean, median, q1, q3, lower, upper, outliers: outliers.length };
}

$("#csvFile").addEventListener("change", async (event) => {
  const file = event.target.files[0], feedback = $("#uploadFeedback");
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { feedback.textContent = "2MB 이하의 CSV 파일을 선택해 주세요."; feedback.className = "feedback upload-feedback error"; return; }
  try {
    uploadedData = parseCSV((await file.text()).replace(/^\uFEFF/, ""));
    processedData = { headers: [...uploadedData.headers], rows: uploadedData.rows.map((row) => ({ ...row })) };
    renderUploadPreview(uploadedData, file);
    feedback.className = "feedback upload-feedback";
  } catch (error) { feedback.textContent = error.message; feedback.className = "feedback upload-feedback error"; }
});

$("#analyzeFile").addEventListener("click", () => {
  try {
    const header = $("#columnSelect").value, result = analyzeColumn(header, $("#missingStrategy").value);
    const values = [["유효 데이터", `${result.valid}개`], ["결측치", `${result.missing}개`], ["평균", result.mean.toFixed(2)], ["중앙값", result.median.toFixed(2)], ["Q1 / Q3", `${result.q1.toFixed(2)} / ${result.q3.toFixed(2)}`], ["정상 범위", `${result.lower.toFixed(2)} ~ ${result.upper.toFixed(2)}`], ["이상치", `${result.outliers}개`], ["처리 후 행", `${processedData.rows.length}개`]];
    $("#analysisResults").innerHTML = values.map(([label, value]) => `<div class="stat-card"><span>${label}</span><b>${value}</b></div>`).join("");
    showToast(`${header} 속성 분석을 완료했습니다.`);
  } catch (error) { $("#uploadFeedback").textContent = error.message; }
});

function correlation(xs, ys) {
  const pairs = xs.map((x, index) => [Number(x), Number(ys[index])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) throw new Error("유효한 데이터가 3쌍 이상 필요합니다.");
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length, meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length;
  const numerator = pairs.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
  const denominator = Math.sqrt(pairs.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0) * pairs.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0));
  if (!denominator) throw new Error("값의 변화가 없어 상관계수를 계산할 수 없습니다.");
  return { r: numerator / denominator, count: pairs.length };
}

$("#analyzeCorrelation").addEventListener("click", () => {
  const x = $("#correlationX").value, y = $("#correlationY").value, target = $("#correlationResult");
  if (x === y) { target.textContent = "서로 다른 두 속성을 선택하세요."; return; }
  try {
    const result = correlation(uploadedData.rows.map((row) => row[x]), uploadedData.rows.map((row) => row[y]));
    const magnitude = Math.abs(result.r), degree = magnitude < 0.2 ? "거의 없음" : magnitude < 0.4 ? "낮음" : magnitude < 0.6 ? "보통" : magnitude < 0.8 ? "높음" : "매우 높음";
    target.innerHTML = `<b>${escapeHtml(x)} ↔ ${escapeHtml(y)}: r = ${result.r.toFixed(3)}</b><div class="correlation-meter"><i style="width:${magnitude * 100}%"></i></div><small>${result.count}쌍 기준 · ${degree} ${result.r >= 0 ? "양의" : "음의"} 상관관계입니다. 상관관계만으로 인과관계를 단정할 수 없습니다.</small>`;
  } catch (error) { target.textContent = error.message; }
});

function csvEscape(value) { const text = String(value ?? ""); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
$("#downloadCsv").addEventListener("click", () => {
  if (!processedData) { showToast("먼저 파일을 선택하세요."); return; }
  const csv = [processedData.headers.map(csvEscape).join(","), ...processedData.rows.map((row) => processedData.headers.map((header) => csvEscape(row[header])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "processed-data.csv"; link.click(); URL.revokeObjectURL(url);
  showToast("처리된 CSV를 내려받았습니다.");
});
