import { prisma } from './src/shared/db/prisma.js';
prisma.gameSession.findMany().then(r => console.log('Game sessions:', r.length)).catch(e => console.error(e));
prisma.spacedRetrievalItem.findMany().then(r => console.log('SR Items:', r.length)).catch(e => console.error(e));
prisma.checklistRun.findMany().then(r => console.log('Checklist runs:', r.length)).catch(e => console.error(e));
