try {
  await import('./routes/message.routes.js');
  console.log('message.routes.js: OK');
} catch (e) {
  console.error('message.routes.js FAILED:', e.message);
}

try {
  await import('./routes/automod.routes.js');
  console.log('automod.routes.js: OK');
} catch (e) {
  console.error('automod.routes.js FAILED:', e.message);
}

try {
  await import('./routes/custom-powers.routes.js');
  console.log('custom-powers.routes.js: OK');
} catch (e) {
  console.error('custom-powers.routes.js FAILED:', e.message);
}

try {
  await import('./routes/moderation.routes.js');
  console.log('moderation.routes.js: OK');
} catch (e) {
  console.error('moderation.routes.js FAILED:', e.message);
}
