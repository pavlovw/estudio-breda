// Momento en que se compiló el sitio. El modo edición lo consulta para saber
// cuándo ya están publicados los últimos cambios.
export const GET = () => new Response(JSON.stringify({ compilado: Date.now() }), { headers: { 'content-type': 'application/json' } });
