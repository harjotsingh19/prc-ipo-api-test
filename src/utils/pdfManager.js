const { jsPDF } = require("jspdf");
require("jspdf-autotable");

const generatePDF = ({ headers, rows, title }) => {
  const doc = new jsPDF();

  if (title) {
    doc.text(title, 10, 10);
  }

  const tableData = rows.map((row) =>
    headers.map((header) => row[header] ?? "")
  );

  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: title ? 20 : 10,
    styles: {
      halign: "center",
    },
    headStyles: {
      halign: "center",
    },
  });

  return doc.output("arraybuffer");
};

module.exports = {
  generatePDF,
};
