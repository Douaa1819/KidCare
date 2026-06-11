import {
  detectImageMimeFromBuffer,
  isValidCalendarDateYmd,
  validateActivityPhotoUpload,
} from './image-upload.validation';

describe('image-upload.validation', () => {
  describe('isValidCalendarDateYmd', () => {
    it('accepts valid dates', () => {
      expect(isValidCalendarDateYmd('2025-06-09')).toBe(true);
      expect(isValidCalendarDateYmd('2024-02-29')).toBe(true);
    });

    it('rejects invalid calendar dates', () => {
      expect(isValidCalendarDateYmd('2026-02-31')).toBe(false);
      expect(isValidCalendarDateYmd('2026-13-01')).toBe(false);
      expect(isValidCalendarDateYmd('bad')).toBe(false);
    });
  });

  describe('detectImageMimeFromBuffer', () => {
    it('detects PNG', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(detectImageMimeFromBuffer(buf)).toBe('image/png');
    });

    it('detects JPEG', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(detectImageMimeFromBuffer(buf)).toBe('image/jpeg');
    });

    it('rejects non-image', () => {
      expect(detectImageMimeFromBuffer(Buffer.from('<?php'))).toBeNull();
    });
  });

  describe('validateActivityPhotoUpload', () => {
    it('rejects spoofed mime type', () => {
      const file = {
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]),
        mimetype: 'image/jpeg',
        originalname: 'photo.png',
      } as Express.Multer.File;

      expect(() => validateActivityPhotoUpload(file)).toThrow(
        'Le type déclaré ne correspond pas au contenu réel du fichier',
      );
    });

    it('accepts matching PNG upload', () => {
      const file = {
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]),
        mimetype: 'image/png',
        originalname: 'activite.png',
      } as Express.Multer.File;

      expect(validateActivityPhotoUpload(file)).toEqual({ mimeType: 'image/png' });
    });

    it('rejects path traversal in filename', () => {
      const file = {
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]),
        mimetype: 'image/png',
        originalname: '../../../etc/passwd',
      } as Express.Multer.File;

      expect(() => validateActivityPhotoUpload(file)).toThrow(
        'Nom de fichier non autorisé',
      );
    });
  });
});
