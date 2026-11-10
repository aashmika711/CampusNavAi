const localtunnel = require('localtunnel');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 3000, subdomain: 'campusnav-ai-live' });

    console.log(`Persistent Live URL: ${tunnel.url}`);

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
    
    tunnel.on('error', (err) => {
      console.log('Tunnel error:', err);
    });

    // Keep process alive
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err) {
    console.error('Failed to start localtunnel:', err);
  }
})();
