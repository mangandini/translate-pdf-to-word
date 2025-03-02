import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '../../lib/db/document.service';
// import { Document } from '@prisma/client';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get filter parameters
    const status = searchParams.get('status');
    const sourceLanguage = searchParams.get('sourceLanguage');
    const targetLanguage = searchParams.get('targetLanguage');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: Prisma.DocumentWhereInput = {};
    if (status) where.status = status;
    if (sourceLanguage) where.sourceLanguage = sourceLanguage;
    if (targetLanguage) where.targetLanguage = targetLanguage;

    // Build orderBy clause
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'date':
        orderBy.createdAt = sortOrder;
        break;
      case 'name':
        orderBy.filename = sortOrder;
        break;
      case 'status':
        orderBy.status = sortOrder;
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const documents = await documentService.getDocuments({
      where,
      orderBy,
      select: {
        id: true,
        filename: true,
        status: true,
        sourceLanguage: true,
        targetLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
} 