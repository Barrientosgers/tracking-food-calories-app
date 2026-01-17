const STORAGE_KEY = 'calorieTrackerEntries';
let entries = [];

// Optional: set API_BASE to your backend URL (e.g. 'http://localhost:3000')
// and set API_ENABLED = true to use the server instead of localStorage.
const API_BASE = null; // e.g. 'http://localhost:3000'
const API_ENABLED = false;

let chart = null;

const $ = id => document.getElementById(id);
const tbody = document.querySelector('#entriesTable tbody');
const template = document.getElementById('rowTemplate');

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch(e) {
    entries = [];
  }
  render();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function addEntry(e) {
  const name = $('foodName').value.trim();
  const cal = parseInt($('calories').value, 10);
  const date = $('date').value || (new Date()).toISOString().slice(0,10);
  if(!name || isNaN(cal) || cal < 0) return alert('Enter valid name and calories');
  entries.push({ id: Date.now().toString(), name, cal, date });
  $('foodName').value = '';
  $('calories').value = '';
  $('date').value = '';
  save();
  render();
}

function render() {
  tbody.innerHTML = '';
  // Sort by date desc then newest first
  const sorted = entries.slice().sort((a,b) => {
    if(a.date === b.date) return b.id - a.id;
    return b.date < a.date ? 1 : -1;
  });
  for(const item of sorted) {
    const tr = template.content.firstElementChild.cloneNode(true);
    tr.querySelector('.date').textContent = item.date;
    tr.querySelector('.food').textContent = item.name;
    tr.querySelector('.cal').textContent = item.cal;
    tr.querySelector('.edit').addEventListener('click', ()=> editEntry(item.id));
    tr.querySelector('.delete').addEventListener('click', ()=> deleteEntry(item.id));
    tbody.appendChild(tr);
  }
  updateSummary();
  updateChart();
}

function updateSummary() {
  const total = entries.reduce((s,e)=> s + Number(e.cal), 0);
  $('totalCalories').textContent = total;
  $('entryCount').textContent = entries.length;
}

function getDailyTotals() {
  const map = {};
  for(const e of entries){
    map[e.date] = (map[e.date] || 0) + Number(e.cal);
  }
  const labels = Object.keys(map).sort();
  const data = labels.map(d => map[d]);
  return { labels, data };
}

function initChart(){
  const canvas = document.getElementById('caloriesChart');
  if(!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{ label: 'Calories', backgroundColor: '#2b6cb0', data: [] }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
  updateChart();
}

function updateChart(){
  if(!chart) return;
  const { labels, data } = getDailyTotals();
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

function deleteEntry(id) {
  if(!confirm('Delete this entry?')) return;
  entries = entries.filter(e => e.id !== id);
  save();
  render();
}

function editEntry(id) {
  const item = entries.find(e => e.id === id);
  if(!item) return;
  const newName = prompt('Food name', item.name);
  if(newName === null) return;
  const newCal = prompt('Calories', item.cal);
  if(newCal === null) return;
  const parsed = parseInt(newCal,10);
  if(!newName.trim() || isNaN(parsed) || parsed < 0) return alert('Invalid values');
  item.name = newName.trim();
  item.cal = parsed;
  save();
  render();
}

function exportCSV() {
  if(entries.length === 0) return alert('No entries to export');
  const header = ['date','name','calories'];
  const rows = entries.map(e => [e.date, e.name.replace(/"/g,'""'), e.cal]);
  const csv = [header.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calories-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCSV(file) {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // naive CSV parse: expects "date","name","calories" or unquoted
    const imported = [];
    for(let i=1;i<lines.length;i++){
      const line = lines[i];
      const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(p => p.replace(/^"|"$/g,'').trim());
      if(parts.length < 3) continue;
      const [date,name,cal] = parts;
      const parsed = parseInt(cal,10);
      if(!date || !name || isNaN(parsed)) continue;
      imported.push({ id: Date.now().toString() + Math.random().toString(36).slice(2,6), date, name, cal: parsed });
    }
    if(imported.length === 0) return alert('No valid rows found');
    entries = entries.concat(imported);
    save();
    render();
  };
  reader.readAsText(file);
}

function clearAll() {
  if(!confirm('Clear all entries?')) return;
  entries = [];
  save();
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  $('addBtn').addEventListener('click', addEntry);
  $('exportBtn').addEventListener('click', exportCSV);
  $('importFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if(f) importCSV(f);
    e.target.value = '';
  });
  $('clearBtn').addEventListener('click', clearAll);
  // initialize chart after DOM and data load
  initChart();
});