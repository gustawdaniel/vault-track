
try {
    const content = require.resolve('@nuxt/content', { paths: [process.cwd()] });
    console.log('Resolved @nuxt/content:', content);
} catch (e) {
    console.error('Failed to resolve @nuxt/content:', e.message);
}

try {
    const docus = require.resolve('docus', { paths: [process.cwd()] });
    console.log('Resolved docus:', docus);
} catch (e) {
    console.error('Failed to resolve docus:', e.message);
}
