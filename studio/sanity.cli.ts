import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '4jx0qts1',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // Dirección del panel: https://estudiobreda.sanity.studio
  studioHost: 'estudiobreda',
  deployment: { autoUpdates: true, appId: 'r4axqyjsuttb1tozfk8ek648' },
})
