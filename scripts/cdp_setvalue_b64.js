const targetId = process.argv[2];
const filePath = process.argv[3];

const fs = require('fs');
const b64 = fs.readFileSync(filePath).toString('base64');

const ws = new WebSocket(`ws://localhost:9222/devtools/page/${targetId}`);
ws.addEventListener('open', () => {
  const expr = "monaco.editor.getEditors()[0].getModel().setValue(atob('" + b64 + "'))";
  ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: expr, returnByValue: true}}));
});
ws.addEventListener('message', (event) => {
  console.log(event.data);
  ws.close();
});
ws.addEventListener('error', (e) => console.error('WS error:', e.message));
