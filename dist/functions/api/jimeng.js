// Retired in the security migration. Never read/write the legacy public KV
// credential slot, and never accept the old hardcoded synchronization key.
export async function onRequest() {
  return new Response(JSON.stringify({error: 'legacyGenerationEndpointDisabled', managed: true, message: 'Please refresh the site to use the protected image service.'}), {
    status: 410,
    headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}
  });
}
