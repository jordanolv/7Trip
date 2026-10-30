import {
  Body,
  Catch,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiErrorCode,
  MAX_DOCUMENT_BYTES,
  createFileDocumentSchema,
  createLinkDocumentSchema,
  updateDocumentSchema,
  type ApiErrorBody,
  type DocumentFileUrl,
  type TripDocument,
} from '@7trip/shared';
import type { Request, Response } from 'express';
import { apiError } from '../common/api-error.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../trips/actor.js';
import { CurrentActor, TripMemberGuard } from '../trips/trip-member.guard.js';
import { DocumentsService, type FileDocumentInput, type LinkDocumentInput, type UpdateDocumentInput, type UploadedDocumentFile } from './documents.service.js';
import { StorageService, contentDisposition } from './storage.service.js';

/** The form fields of an upload come as one JSON text, `meta`, beside the file. */
const metaPipe = new ZodValidationPipe(createFileDocumentSchema);
const parseMeta = (meta: unknown): FileDocumentInput => {
  let value: unknown = {};
  try {
    value = typeof meta === 'string' ? JSON.parse(meta) : {};
  } catch {
    // Left empty: the schema then says what is missing.
  }
  return metaPipe.transform(value);
};

/** Multer stops past the limit with an English message: the apps get the usual body. */
@Catch(PayloadTooLargeException)
class FileTooLargeFilter implements ExceptionFilter {
  catch(_error: PayloadTooLargeException, host: ArgumentsHost) {
    const message = '20 Mo maximum par fichier';
    const body: ApiErrorBody = { code: ApiErrorCode.ValidationFailed, message, fields: { file: message } };
    host.switchToHttp().getResponse<Response>().status(HttpStatus.PAYLOAD_TOO_LARGE).json(body);
  }
}

/** This API's public address, as the caller reached it (behind the trusted proxy). */
const apiBase = (request: Request) => `${request.protocol}://${request.get('host')}`;

/** Open to every member of the trip, guests included; private documents to their owner only. */
@Controller('trips/:tripId/documents')
@UseGuards(TripMemberGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<TripDocument[]> {
    return this.documents.list(actor, tripId);
  }

  /** Multipart: `file`, and `meta` (JSON: title, category, date, eventId, visibility, bookingRef). */
  @Post()
  @UseFilters(FileTooLargeFilter)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 2 } }))
  createFile(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @UploadedFile() file: UploadedDocumentFile | undefined,
    @Body('meta') meta: unknown,
  ): Promise<TripDocument> {
    return this.documents.createFile(actor, tripId, parseMeta(meta), file);
  }

  @Post('links')
  createLink(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(createLinkDocumentSchema)) body: LinkDocumentInput,
  ): Promise<TripDocument> {
    return this.documents.createLink(actor, tripId, body);
  }

  @Get(':documentId')
  get(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('documentId') documentId: string): Promise<TripDocument> {
    return this.documents.get(actor, tripId, documentId);
  }

  @Patch(':documentId')
  update(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('documentId') documentId: string,
    @Body(new ZodValidationPipe(updateDocumentSchema)) body: UpdateDocumentInput,
  ): Promise<TripDocument> {
    return this.documents.update(actor, tripId, documentId, body);
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('documentId') documentId: string): Promise<void> {
    return this.documents.remove(actor, tripId, documentId);
  }

  /** A link to open the file, valid a few minutes. */
  @Get(':documentId/url')
  fileUrl(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('documentId') documentId: string, @Req() request: Request): Promise<DocumentFileUrl> {
    return this.documents.fileUrl(actor, tripId, documentId, apiBase(request));
  }
}

/**
 * Local storage only (development, tests): serves a file behind a link signed by
 * StorageService.signedUrl. In production the links point to the bucket.
 */
@Controller('files')
export class FilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async file(@Query('key') key: unknown, @Query('expires') expires: unknown, @Query('signature') signature: unknown, @Res() response: Response): Promise<void> {
    const notFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Lien expiré ou invalide');
    if (typeof key !== 'string' || typeof expires !== 'string' || typeof signature !== 'string') throw notFound();
    const path = this.storage.verifiedLocalPath(key, Number(expires), signature);
    // Deleted since the link was made: gone too.
    const doc = path ? await this.prisma.document.findUnique({ where: { storageKey: key }, select: { mime: true, fileName: true, title: true } }) : null;
    if (!path || !doc?.mime) throw notFound();
    response.set({
      'Content-Type': doc.mime,
      'Content-Disposition': contentDisposition(doc.fileName ?? doc.title),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    // The folder may be a dot folder (.storage): the path was checked, it is ours.
    response.sendFile(path, { dotfiles: 'allow' }, (error) => {
      if (error && !response.headersSent) response.status(HttpStatus.NOT_FOUND).end();
    });
  }
}
