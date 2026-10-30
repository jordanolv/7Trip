import { describe, expect, it } from 'vitest';

import { createLinkDocumentSchema, createFileDocumentSchema, formatFileSize, sniffDocumentMime } from './documents.js';

describe('document schemas', () => {
  it('is private and in "Autre" by default', () => {
    expect(createFileDocumentSchema.parse({ title: ' Billets ' })).toMatchObject({ title: 'Billets', visibility: 'PRIVATE', category: 'OTHER' });
  });

  it('needs a link for a link', () => {
    expect(createLinkDocumentSchema.parse({ title: 'Sixt', url: 'sixt.fr/resa' }).url).toBe('https://sixt.fr/resa');
    expect(createLinkDocumentSchema.safeParse({ title: 'Sixt' }).success).toBe(false);
    expect(createLinkDocumentSchema.safeParse({ title: 'Sixt', url: 'javascript:alert(1)' }).success).toBe(false);
  });
});

describe('sniffDocumentMime', () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);
  it('reads PDF, JPEG and PNG from their first bytes', () => {
    expect(sniffDocumentMime(new TextEncoder().encode('%PDF-1.7\n'))).toBe('application/pdf');
    expect(sniffDocumentMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffDocumentMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
  });

  it('refuses anything else, an HTML page named .pdf included', () => {
    expect(sniffDocumentMime(new TextEncoder().encode('<html><script>'))).toBeNull();
    expect(sniffDocumentMime(new Uint8Array())).toBeNull();
  });
});

describe('formatFileSize', () => {
  it('writes Ko then Mo', () => {
    expect(formatFileSize(820 * 1024)).toBe('820 Ko');
    expect(formatFileSize(300)).toBe('1 Ko');
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2,4 Mo');
    expect(formatFileSize(20 * 1024 * 1024)).toBe('20 Mo');
  });
});
