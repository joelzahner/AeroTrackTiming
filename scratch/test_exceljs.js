import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

const templatePath = "Rangliste_Vorlage.xlsx";
const outPath = "scratch/output.xlsx";

async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  console.log("Sheets:", workbook.worksheets.map(w => w.name));

  const rennen1 = workbook.getWorksheet("Rennen 1");
  const a1 = rennen1.getCell("A1");
  console.log("A1 value:", a1.value);
  console.log("A1 font:", a1.font);
  console.log("A1 border:", a1.border);
  console.log("A1 fill:", a1.fill);

  const a2 = rennen1.getCell("A2");
  console.log("A2 value:", a2.value);
  console.log("A2 border:", a2.border);

  const a3 = rennen1.getCell("A3");
  console.log("A3 font:", a3.font);

  // Test creating new sheet and copying styles
  const newSheet = workbook.addWorksheet("Test-Kopie");
  
  // Set column widths
  newSheet.columns = rennen1.columns.map(col => ({
    width: col.width,
  }));

  const newCellA1 = newSheet.getCell("A1");
  newCellA1.value = "Dynamische Kategorie";
  newCellA1.font = a1.font;
  newCellA1.alignment = a1.alignment;

  const newCellA2 = newSheet.getCell("A2");
  newCellA2.value = "Rang";
  newCellA2.font = a2.font;
  newCellA2.border = a2.border;
  newCellA2.alignment = a2.alignment;

  await workbook.xlsx.writeFile(outPath);
  console.log("Done writing output.xlsx");
}

run().catch(console.error);
