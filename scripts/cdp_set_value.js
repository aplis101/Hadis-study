const targetId = '2D773C8C671BD279ACF401C0643C2487';
const wsUrl = `ws://localhost:9222/devtools/page/${targetId}`;

const fs = require('fs');
// Read the SQL from a separate file
const content = fs.readFileSync(process.argv[2], 'utf8');

const ws = new WebSocket(wsUrl);
ws.addEventListener('open', () => {
  const expr = `monaco.editor.getEditors()[0].getModel().setValue(${JSON.stringify(content)})`;
  ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: expr, returnByValue: true}}));
});
ws.addEventListener('message', (event) => {
  console.log(event.data);
  ws.close();
});
ws.addEventListener('error', (e) => console.error('WS error:', e.message));
