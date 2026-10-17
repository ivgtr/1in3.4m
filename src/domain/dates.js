// Existing events are authoritative when upgrading quarterly display metadata.
export const decisionMonth=(s,d)=>d.month??s.events.find(e=>e.id===d.eventId)?.month??d.q*3;
export const personJoinedMonth=(s,p)=>p.founding?0:(s.events.find(e=>e.id===p.joinEvent)?.month??p.joinedMonth??p.joined*3);
export const personLeftMonth=(s,p)=>p.leftMonth??s.events.find(e=>e.topic==='people'&&e.kind==='risk'&&e.entities.includes(p.id)&&e.title.includes('別々'))?.month??p.left*3;
export const clientSinceMonth=(s,c)=>c.sinceMonth??s.events.find(e=>e.entities.includes(c.id)&&e.kind==='turning'&&e.topic==='client')?.month??s.events.find(e=>e.id===c.sourceEvent)?.month??c.since*3;
