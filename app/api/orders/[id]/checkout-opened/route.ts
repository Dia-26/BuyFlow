import { NextRequest,NextResponse } from "next/server";import { checkoutOpened } from "@/lib/orders";
export async function POST(r:NextRequest,{params}:{params:Promise<{id:string}>}){try{return NextResponse.json(await checkoutOpened((await params).id,(await r.json()).sessionId||"demo-session"));}catch(e){return NextResponse.json({error:(e as Error).message},{status:400})}}
