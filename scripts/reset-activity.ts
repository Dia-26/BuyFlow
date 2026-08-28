import { db } from "../lib/db";
async function main(){const [audits,orders,webhooks]=await db.$transaction([db.auditLog.deleteMany(),db.order.deleteMany(),db.webhookEvent.deleteMany()]);console.log(JSON.stringify({auditEventsRemoved:audits.count,ordersRemoved:orders.count,webhookEventsRemoved:webhooks.count}));}main().finally(()=>db.$disconnect());
