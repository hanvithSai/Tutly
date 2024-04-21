import { deleteDoubt, deleteResponse } from "@/actions/doubts";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest,{params}:{
  params: { id: string }
}) {
  const { id } = params;

  try {
    await deleteResponse(id);
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
