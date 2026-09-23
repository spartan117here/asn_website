const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_dev_user_dir_' + Date.now();

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:4173/'
]);

chrome.stderr.on('data', d => console.error('CHROME ERR:', d.toString()));

async function waitPort() {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const json = await res.json();
        console.log('CONNECTED TO CHROME CDP:', json.Browser);
        return json;
      }
    } catch (e) {
      // retry
    }
  }
  throw new Error('Timeout connecting to Chrome CDP');
}

waitPort()
  .then(async () => {
    console.log('Success connecting to CDP!');
    chrome.kill();
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    chrome.kill();
    process.exit(1);
  });
