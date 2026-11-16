const ratings = ["1","2","3","4","5"];
const positiveWords = ["good","excellent","great","clear","helpful","interesting","useful","amazing","best","easy","understand","effective","knowledgeable","friendly","engaging"];
const negativeWords = ["bad","poor","boring","confusing","difficult","slow","unclear","waste","problem","improve","hard","weak","disappointing","unhelpful","terrible"];

let feedback = JSON.parse(localStorage.getItem("feedbackIQData") || "[]");

document.addEventListener("DOMContentLoaded", () => {
  ["teaching","clarity","content","assessment","interaction"].forEach(id => {
    document.getElementById(id).innerHTML = ratings.map(r => `<option value="${r}">${r}</option>`).join("");
  });
  document.getElementById("feedbackForm").addEventListener("submit", addFeedback);
  refreshAll();
});

function showSection(id, button) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (button) {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
  } else {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    const target = [...document.querySelectorAll(".tab")].find(b => b.textContent.toLowerCase().includes(id));
    if (target) target.classList.add("active");
  }
  refreshAll();
}

function addFeedback(e) {
  e.preventDefault();
  const item = {
    course: val("course"), faculty: val("faculty"),
    teaching: +val("teaching"), clarity: +val("clarity"),
    content: +val("content"), assessment: +val("assessment"),
    interaction: +val("interaction"), comment: val("comment")
  };
  feedback.push(item);
  save();
  e.target.reset();
  alert("Feedback saved successfully.");
  showSection("dashboard");
}

function val(id) { return document.getElementById(id).value.trim(); }
function save() { localStorage.setItem("feedbackIQData", JSON.stringify(feedback)); refreshAll(); }

function sentiment(comment) {
  const text = comment.toLowerCase();
  let p = 0, n = 0;
  positiveWords.forEach(w => { if (text.includes(w)) p++; });
  negativeWords.forEach(w => { if (text.includes(w)) n++; });
  if (p > n) return "Positive";
  if (n > p) return "Negative";
  return "Neutral";
}

function avg(list, key) {
  if (!list.length) return 0;
  return list.reduce((s,x) => s + Number(x[key]), 0) / list.length;
}

function unique(key) {
  return [...new Set(feedback.map(x => x[key]))].sort();
}

function courseData(course) {
  return feedback.filter(x => x.course === course);
}

function facultyData(faculty) {
  return feedback.filter(x => x.faculty === faculty);
}

function refreshAll() {
  document.getElementById("totalFeedback").textContent = feedback.length;
  const allRatings = feedback.flatMap(x => [x.teaching,x.clarity,x.content,x.assessment,x.interaction]);
  document.getElementById("overallRating").textContent =
    allRatings.length ? (allRatings.reduce((a,b)=>a+b,0)/allRatings.length).toFixed(2) : "0.00";
  document.getElementById("positiveCount").textContent =
    feedback.filter(x => sentiment(x.comment) === "Positive").length;
  document.getElementById("flaggedCount").textContent = flagged().length;

  populateSelect("courseSelect", unique("course"), "Select course");
  populateSelect("facultySelect", unique("faculty"), "Select faculty");

  renderCourseAnalysis();
  renderFacultyReport();
  renderSentiment();
  renderFlagged();
}

function populateSelect(id, values, placeholder) {
  const el = document.getElementById(id);
  const old = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option>${escapeHtml(v)}</option>`).join("");
  if (values.includes(old)) el.value = old;
}

function renderCourseAnalysis() {
  const course = document.getElementById("courseSelect").value;
  const box = document.getElementById("courseAnalysis");
  if (!course) { box.innerHTML = `<p class="muted">Select a course to view its averages.</p>`; return; }
  const data = courseData(course);
  box.innerHTML = reportMetrics(data) + `<p><strong>Feedback records:</strong> ${data.length}</p>`;
}

function renderFacultyReport() {
  const faculty = document.getElementById("facultySelect").value;
  const box = document.getElementById("facultyReport");
  if (!faculty) { box.innerHTML = `<p class="muted">Select a faculty member to view the report.</p>`; return; }
  const data = facultyData(faculty);
  const metrics = [
    ["Teaching Quality","teaching"], ["Clarity","clarity"], ["Course Content","content"],
    ["Assessment","assessment"], ["Faculty Interaction","interaction"]
  ];
  const values = metrics.map(([name,key]) => ({name, value:avg(data,key)}));
  const strongest = values.reduce((a,b)=>a.value>b.value?a:b);
  const weakest = values.reduce((a,b)=>a.value<b.value?a:b);
  const pos = data.filter(x=>sentiment(x.comment)==="Positive").length;
  const neg = data.filter(x=>sentiment(x.comment)==="Negative").length;
  const neu = data.filter(x=>sentiment(x.comment)==="Neutral").length;

  box.innerHTML = reportMetrics(data) + `
    <div class="grid two">
      <div class="card">
        <h4>Strength</h4>
        <p class="good">${strongest.name} — ${strongest.value.toFixed(2)}</p>
      </div>
      <div class="card">
        <h4>Area to Improve</h4>
        <p class="bad">${weakest.name} — ${weakest.value.toFixed(2)}</p>
      </div>
    </div>
    <h4>Sentiment Summary</h4>
    <span class="pill positive">Positive: ${pos}</span>
    <span class="pill negative">Negative: ${neg}</span>
    <span class="pill neutral">Neutral: ${neu}</span>
  `;
}

function reportMetrics(data) {
  const metrics = [
    ["Teaching Quality","teaching"], ["Clarity","clarity"], ["Course Content","content"],
    ["Assessment","assessment"], ["Faculty Interaction","interaction"]
  ];
  return `<div class="report-grid">${metrics.map(([name,key]) => {
    const v = avg(data,key);
    return `<div class="metric"><small>${name}</small><strong>${v.toFixed(2)}</strong></div>`;
  }).join("")}</div>`;
}

function renderSentiment() {
  const box = document.getElementById("sentimentList");
  if (!feedback.length) { box.innerHTML = `<p class="muted">No feedback added yet.</p>`; return; }
  box.innerHTML = feedback.map((x,i) => {
    const s = sentiment(x.comment);
    return `<div class="sentiment-item">
      <strong>${escapeHtml(x.course)}</strong> — ${escapeHtml(x.faculty)}
      <span class="pill ${s.toLowerCase()}">${s}</span>
      <p>${escapeHtml(x.comment)}</p>
    </div>`;
  }).join("");
}

function flagged() {
  return unique("course").filter(course => {
    const d = courseData(course);
    return ["teaching","clarity","content","assessment","interaction"].some(k => avg(d,k) < 3);
  });
}

function renderFlagged() {
  const box = document.getElementById("flaggedList");
  const courses = flagged();
  if (!courses.length) {
    box.innerHTML = `<p class="good">No flagged courses. All parameter averages are 3 or above.</p>`;
    return;
  }
  box.innerHTML = courses.map(course => {
    const d = courseData(course);
    const labels = [["Teaching Quality","teaching"],["Clarity","clarity"],["Course Content","content"],["Assessment","assessment"],["Faculty Interaction","interaction"]];
    const reasons = labels.filter(([n,k]) => avg(d,k) < 3)
      .map(([n,k]) => `${n}: ${avg(d,k).toFixed(2)}`);
    return `<div class="flag"><strong>${escapeHtml(course)}</strong>
      <p>Below-threshold parameters:</p><ul>${reasons.map(r=>`<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`;
  }).join("");
}

function loadDemoData() {
  const demo = [
    {course:"Digital Signal Processing",faculty:"Dr. Kumar",teaching:4,clarity:5,content:4,assessment:2,interaction:4,comment:"The teacher explains concepts clearly and is very helpful."},
    {course:"Digital Signal Processing",faculty:"Dr. Kumar",teaching:4,clarity:4,content:4,assessment:3,interaction:5,comment:"Great and interesting classes, but assessment could improve."},
    {course:"Digital Image Processing",faculty:"Dr. Priya",teaching:5,clarity:5,content:5,assessment:4,interaction:5,comment:"Excellent teaching and amazing interaction."},
    {course:"Digital Image Processing",faculty:"Dr. Priya",teaching:4,clarity:4,content:5,assessment:4,interaction:4,comment:"Very useful and easy to understand."},
    {course:"Microcontrollers",faculty:"Dr. Arun",teaching:2,clarity:2,content:3,assessment:2,interaction:3,comment:"The lectures are confusing and difficult to follow."}
  ];
  feedback = demo;
  save();
  alert("Demo feedback loaded.");
  showSection("dashboard");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
