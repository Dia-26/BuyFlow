import { db } from "./db";
export async function audit(sessionId:string,eventType:string,description:string,success=true,transactionId?:string,metadata:Record<string,unknown>={}) { return db.auditLog.create({data:{sessionId,eventType,description,success,transactionId,metadata:JSON.stringify(metadata)}}); }
