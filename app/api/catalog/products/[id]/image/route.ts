import { NextResponse } from "next/server";
import { productImage } from "@/lib/images";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const image=await productImage((await params).id);return NextResponse.json({imageUrl:image.imageUrl,source:image.source});}catch(error){return NextResponse.json({error:(error as Error).message},{status:503});}}
