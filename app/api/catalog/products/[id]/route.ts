import { NextResponse } from "next/server";import { db } from "@/lib/db";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const product=await db.product.findUnique({where:{id:(await params).id}});return product?NextResponse.json(product):NextResponse.json({error:"Not found"},{status:404});}
