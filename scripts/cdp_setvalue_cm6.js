const targetId = process.argv[2];
const filePath = process.argv[3];

const fs = require('fs');
const content = fs.readFileSync(filePath, 'utf8');

// Build expression using JSON.stringify for safe embedding
// First, encode to bytes then base64, decode using TextDecoder in browser
const b64 = Buffer.from(content, 'utf8').toString('base64');

const ws = new WebSocket(`ws://localhost:9222/devtools/page/${targetId}`);
ws.addEventListener('open', () => {
  // Use atob + TextDecoder to handle multi-byte (Arabic) content
  const expr = "(() => {" +
    "const b64 = '" + b64 + "';" +
    "const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));" +
    "const text = new TextDecoder().decode(bytes);" +
    "cm6.editor.getViews()[0].getModel().setValue(text);" +
    "return text.length;" +
    "})()";
  ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: expr, returnByValue: true}}));
});
ws.addEventListener('message', (event) => {
  console.log(event.data);
  ws.close();
});
ws.addEventListener('error', (e) => console.error('WS error:', e.message));
