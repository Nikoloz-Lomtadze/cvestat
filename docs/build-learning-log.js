const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, LevelFormat, BorderStyle, AlignmentType, Footer, PageNumber,
} = require("docx");
const content = require("./learning-log-content.js");

const FONT = "Arial", MONO = "Consolas";
const W = 9638; // A4 text width with 2 cm margins (DXA)
const border = { style: BorderStyle.SINGLE, size: 4, color: "C9D1D9" };
const borders = { top: border, bottom: border, left: border, right: border };

let listId = 0;
const numberingConfigs = [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }];

function cell(text, width, header) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: header ? { fill: "E8F5EA", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, font: FONT, size: 20 })] })],
  });
}

const children = [];
for (const b of content) {
  switch (b.t) {
    case "title": children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(b.text)] })); break;
    case "h1": children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(b.text)] })); break;
    case "h2": children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(b.text)] })); break;
    case "p": children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun(b.text)] })); break;
    case "note":
      children.push(new Paragraph({
        spacing: { before: 60, after: 160 }, indent: { left: 240 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: "3FB950", space: 8 } },
        children: [new TextRun({ text: b.text, italics: true })],
      }));
      break;
    case "bullets":
      for (const it of b.items) children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun(it)] }));
      break;
    case "steps": {
      const ref = `steps${listId++}`;
      numberingConfigs.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] });
      for (const it of b.items) children.push(new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun(it)] }));
      break;
    }
    case "code":
      b.text.forEach((line, i) => children.push(new Paragraph({
        shading: { fill: "F3F5F7", type: ShadingType.CLEAR, color: "auto" },
        spacing: { before: i === 0 ? 80 : 0, after: i === b.text.length - 1 ? 160 : 0 },
        indent: { left: 200, right: 200 },
        children: [new TextRun({ text: line || " ", font: MONO, size: 18 })],
      })));
      break;
    case "table": {
      const n = b.head.length;
      const widths = n === 2 ? [2600, W - 2600] : [2200, 2800, W - 5000];
      children.push(new Table({
        width: { size: W, type: WidthType.DXA }, columnWidths: widths,
        rows: [
          new TableRow({ tableHeader: true, children: b.head.map((h, i) => cell(h, widths[i], true)) }),
          ...b.rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) })),
        ],
      }));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      break;
    }
  }
}

const heading = (size, before, after, color) => ({ run: { font: FONT, size, bold: true, color }, paragraph: { spacing: { before, after }, keepNext: true } });
const doc = new Document({
  creator: "CVEStat",
  title: "CVEStat — Developer Learning Log",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 40, bold: true }, paragraph: { spacing: { before: 0, after: 200 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, ...heading(32, 360, 160, "1F6F32"), paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, ...heading(26, 240, 120, "222222"), paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: numberingConfigs },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["CVEStat learning log · page ", PageNumber.CURRENT], size: 16, color: "888888" })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2] || "CVEStat-Learning-Log.docx", buf);
  console.log("written");
});
