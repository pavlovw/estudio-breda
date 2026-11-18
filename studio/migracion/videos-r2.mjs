// Cambia la dirección de los videos de exposiciones a Cloudflare R2.
//   npx sanity exec migracion/videos-r2.mjs --with-user-token
import { getCliClient } from 'sanity/cli'

const R2 = 'https://pub-41914aad326b413899ad1952014ec88e.r2.dev/exposiciones'
const VIDEOS = {
  'exposicion-1ra': `${R2}/1ra/video-expo-1.mp4`,
  'exposicion-2da': `${R2}/2da/video-expo-2.mp4`,
}

const cliente = getCliClient({ apiVersion: '2025-01-01' })
for (const [id, url] of Object.entries(VIDEOS)) {
  const antes = await cliente.fetch('*[_id == $id][0].videoRuta', { id })
  await cliente.patch(id).set({ videoRuta: url }).commit()
  console.log(`${id}: ${antes} -> ${url}`)
}
