import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the markdown file
const markdownPath = path.join(__dirname, 'APPLICATION_DOCUMENTATION.md');
const markdown = fs.readFileSync(markdownPath, 'utf8');

// Convert markdown to HTML with Word-compatible formatting
function markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^# (.+)$/gm, '<h1 style="color:#00843D;font-size:24pt;font-weight:bold;margin-top:20pt;margin-bottom:10pt;">$1</h1>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="color:#006633;font-size:18pt;font-weight:bold;margin-top:15pt;margin-bottom:8pt;">$1</h2>');
    html = html.replace(/^### (.+)$/gm, '<h3 style="color:#004422;font-size:14pt;font-weight:bold;margin-top:10pt;margin-bottom:6pt;">$1</h3>');
    html = html.replace(/^#### (.+)$/gm, '<h4 style="color:#003311;font-size:12pt;font-weight:bold;margin-top:8pt;margin-bottom:5pt;">$1</h4>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background:#f5f5f5;padding:10pt;border:1pt solid #ccc;font-family:Courier New;font-size:9pt;margin:10pt 0;"><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:2pt 4pt;font-family:Courier New;font-size:9pt;">$1</code>');

    // Tables
    html = html.replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map(cell => cell.trim());
        if (cells.some(cell => cell.match(/^[-:]+$/))) return ''; // Skip separator lines
        const tds = cells.map(cell => `<td style="border:1pt solid #000;padding:5pt;">${cell}</td>`).join('');
        return `<tr>${tds}</tr>`;
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table style="border-collapse:collapse;width:100%;margin:10pt 0;">$&</table>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr style="border:1pt solid #ccc;margin:15pt 0;">');

    // Lists (unordered)
    html = html.replace(/^\- (.+)$/gm, '<li style="margin:5pt 0 5pt 20pt;">$1</li>');
    html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin:5pt 0;">$&</ul>');

    // Lists (ordered)
    html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin:5pt 0 5pt 20pt;">$1</li>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#0066cc;">$1</a>');

    // Paragraphs (wrap text that's not already in a block element)
    html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p style="margin:8pt 0;line-height:1.4;">$1</p>');

    // Clean up empty paragraphs
    html = html.replace(/<p style="[^"]*"><\/p>/g, '');

    return html;
}

// Create Word-compatible HTML
const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset="utf-8">
<title>MOHCC Zimbabwe Attendance Management System Documentation</title>
<style>
body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #333;
    max-width: 800px;
    margin: 20pt auto;
    padding: 20pt;
}
h1 {
    color: #00843D;
    font-size: 24pt;
    font-weight: bold;
    margin-top: 20pt;
    margin-bottom: 10pt;
    page-break-before: always;
}
h1:first-of-type {
    page-break-before: auto;
}
h2 {
    color: #006633;
    font-size: 18pt;
    font-weight: bold;
    margin-top: 15pt;
    margin-bottom: 8pt;
}
h3 {
    color: #004422;
    font-size: 14pt;
    font-weight: bold;
    margin-top: 10pt;
    margin-bottom: 6pt;
}
h4 {
    color: #003311;
    font-size: 12pt;
    font-weight: bold;
    margin-top: 8pt;
    margin-bottom: 5pt;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin: 10pt 0;
}
td, th {
    border: 1pt solid #000;
    padding: 5pt;
}
th {
    background-color: #f0f0f0;
    font-weight: bold;
}
code {
    background-color: #f5f5f5;
    padding: 2pt 4pt;
    font-family: Courier New, monospace;
    font-size: 9pt;
}
pre {
    background-color: #f5f5f5;
    padding: 10pt;
    border: 1pt solid #ccc;
    font-family: Courier New, monospace;
    font-size: 9pt;
    margin: 10pt 0;
    white-space: pre-wrap;
    word-wrap: break-word;
}
strong {
    font-weight: bold;
}
em {
    font-style: italic;
}
a {
    color: #0066cc;
    text-decoration: underline;
}
hr {
    border: 1pt solid #ccc;
    margin: 15pt 0;
}
ul, ol {
    margin: 5pt 0;
}
li {
    margin: 5pt 0 5pt 20pt;
}
</style>
</head>
<body>
${markdownToHtml(markdown)}
</body>
</html>
`;

// Write the HTML file
const htmlPath = path.join(__dirname, 'APPLICATION_DOCUMENTATION.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');

console.log('HTML file created:', htmlPath);

// Now create a Word document by reading the HTML and saving with .doc extension
const wordPath = path.join(__dirname, 'APPLICATION_DOCUMENTATION.doc');
const wordContent = htmlContent;
fs.writeFileSync(wordPath, wordContent, 'utf8');

console.log('Word document created:', wordPath);
