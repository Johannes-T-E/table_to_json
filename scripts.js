// For Electron zoom support
const { webFrame } = require('electron');

// Global colors for CSV columns (customize as desired)
const columnColors = [
  "#66cc99", "#ffcc66", "#99ccff", "#ff9966", "#cc99ff", "#66cccc", "#ffcc99"
];

// Convert JSON data (array of objects) to CSV string.
function convertToCSV(jsonData) {
  if (!jsonData || jsonData.length === 0) return '';
  const headers = Object.keys(jsonData[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));
  jsonData.forEach(row => {
    const values = headers.map(header => {
      let cell = row[header] || '';
      cell = cell.toString();
      // Escape quotes and wrap cell if necessary.
      if (cell.indexOf(',') > -1 || cell.indexOf('"') > -1) {
         cell = `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    csvRows.push(values.join(','));
  });
  return csvRows.join('\n');
}

// Generate HTML for CSV output with custom column coloring.
function generateCSVHTML(csvText) {
  // Split lines using both Windows and Unix line breaks.
  const lines = csvText.split(/\r?\n/);
  let html = "";
  lines.forEach(line => {
    // Split on commas that are not inside quotes.
    const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    let lineHTML = "";
    cells.forEach((cell, index) => {
      cell = cell.trim();
      if(cell.startsWith('"') && cell.endsWith('"')) {
         cell = cell.substring(1, cell.length - 1);
      }
      let color = columnColors[index % columnColors.length];
      lineHTML += `<span style="color: ${color};">${cell}</span>`;
      if(index < cells.length - 1) {
        lineHTML += `<span style="color: #dcdcdc;">,</span> `;
      }
    });
    html += lineHTML + "<br>";
  });
  return html;
}

// Read the editable table and convert its data into an array of objects.
function getTableData() {
  const table = document.getElementById("editableTable");
  if (!table) {
    return null;
  }
  const headers = [];
  table.querySelectorAll("thead th").forEach(cell => {
    headers.push(cell.innerText.trim());
  });
  const jsonData = [];
  table.querySelectorAll("tbody tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    let rowObject = {};
    headers.forEach((header, index) => {
      rowObject[header] = cells[index] ? cells[index].innerText.trim() : null;
    });
    jsonData.push(rowObject);
  });
  return jsonData;
}

// Update both JSON and CSV outputs based on current table data.
function updateOutputs() {
  const jsonData = getTableData();
  if (!jsonData) return;
  
  // Update JSON output.
  let jsonString = JSON.stringify(jsonData, null, 4);
  const jsonOutput = document.getElementById("jsonOutput");
  jsonOutput.textContent = jsonString;
  hljs.highlightElement(jsonOutput);
  
  // Update CSV output.
  let csvString = convertToCSV(jsonData);
  const csvOutput = document.getElementById("csvOutput");
  csvOutput.innerHTML = generateCSVHTML(csvString);
  // Note: We intentionally do not call hljs.highlightElement on CSV.
}

// Listen for paste events and convert the pasted data into an editable table.
document.getElementById('inputArea').addEventListener('paste', function(e) {
  e.preventDefault();
  let clipboardData = e.clipboardData || window.clipboardData;
  let pastedData = clipboardData.getData('text');

  const rows = pastedData.split(/\r?\n/).filter(row => row.trim() !== '');
  if (rows.length === 0) return;

  // Use the first row as headers.
  const headers = rows[0].split('\t');

  let tableHTML = '<table id="editableTable"><thead><tr>';
  headers.forEach(header => {
    tableHTML += `<th contenteditable="true">${header}</th>`;
  });
  tableHTML += '</tr></thead><tbody>';
  for (let i = 1; i < rows.length; i++) {
    const rowValues = rows[i].split('\t');
    tableHTML += '<tr>';
    headers.forEach((_, index) => {
      let cellValue = rowValues[index] !== undefined ? rowValues[index] : '';
      tableHTML += `<td contenteditable="true">${cellValue}</td>`;
    });
    tableHTML += '</tr>';
  }
  tableHTML += '</tbody></table>';

  document.getElementById('inputArea').innerHTML = tableHTML;
  
  // Auto-update outputs when the table changes.
  const table = document.getElementById("editableTable");
  table.addEventListener("input", updateOutputs);
  updateOutputs();
});

// Tab switching functionality.
document.querySelectorAll(".tablink").forEach(button => {
  button.addEventListener("click", function() {
    const targetTab = this.getAttribute("data-tab");
    document.querySelectorAll(".tabcontent").forEach(tab => {
      tab.style.display = "none";
    });
    document.querySelectorAll(".tablink").forEach(btn => {
      btn.classList.remove("active");
    });
    document.getElementById(targetTab).style.display = "block";
    this.classList.add("active");
  });
});

// Copy and Download functions for JSON.
document.getElementById("copyJsonButton").addEventListener("click", function() {
  const jsonText = document.getElementById("jsonOutput").textContent;
  navigator.clipboard.writeText(jsonText).then(() => {
    alert("JSON copied to clipboard!");
  }).catch(err => {
    alert("Failed to copy JSON: " + err);
  });
});

document.getElementById("downloadJsonButton").addEventListener("click", function() {
  const jsonText = document.getElementById("jsonOutput").textContent;
  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Copy and Download functions for CSV.
document.getElementById("copyCsvButton").addEventListener("click", function() {
  const jsonData = getTableData();
  const csvText = convertToCSV(jsonData);
  navigator.clipboard.writeText(csvText).then(() => {
    alert("CSV copied to clipboard!");
  }).catch(err => {
    alert("Failed to copy CSV: " + err);
  });
});

document.getElementById("downloadCsvButton").addEventListener("click", function() {
  const jsonData = getTableData();
  const csvText = convertToCSV(jsonData);
  const blob = new Blob([csvText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Enable zoom in/out with Ctrl+"+" / Ctrl+"-" keys.
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
    let currentZoom = webFrame.getZoomFactor();
    webFrame.setZoomFactor(currentZoom + 0.1);
  } else if (e.ctrlKey && e.key === '-') {
    let currentZoom = webFrame.getZoomFactor();
    webFrame.setZoomFactor(currentZoom - 0.1);
  }
});
