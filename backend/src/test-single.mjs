try {
  const mod = await import('./routes/message.routes.js');
  console.log('OK');
} catch (e) {
  console.error('FAILED:', e.message);
  console.error(e.stack);
}
