import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  private extractMessageFromWebhookBody(body: unknown): string {
    if (body == null) return '';
    if (typeof body === 'string') return body.trim();

    if (typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const keys = [
        'message',
        'output',
        'text',
        'result',
        'rewritten',
        'rewrittenText',
        'content',
      ];
      for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (value && typeof value === 'object') {
          const nested = this.extractMessageFromWebhookBody(value);
          if (nested) return nested;
        }
      }
      if (Array.isArray(record) && record.length > 0) {
        return this.extractMessageFromWebhookBody(record[0]);
      }
    }

    return '';
  }

  /** Repli local si le webhook renvoie 200 sans contenu (dev / panne n8n). */
  private fallbackRewrite(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return trimmed;
    const normalized = trimmed.replace(/\s+/g, ' ');
    const capped = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return /[.!?…]$/.test(capped) ? capped : `${capped}.`;
  }

  async rewriteDailyMessage(text: string): Promise<string> {
    const webhookUrl = this.configService.get<string>('n8nAiRewriteWebhookUrl');
    if (!webhookUrl) {
      throw new InternalServerErrorException(
        'Webhook IA non configuré (N8N_AI_REWRITE_WEBHOOK_URL).',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      const rawText = await res.text();
      let body: unknown = null;
      if (rawText.trim()) {
        try {
          body = JSON.parse(rawText) as unknown;
        } catch {
          body = rawText;
        }
      }

      if (!res.ok) {
        const detail =
          (body &&
            typeof body === 'object' &&
            (body as { message?: string }).message) ||
          res.statusText;
        this.logger.warn(`Webhook IA erreur ${res.status}: ${String(detail)}`);
        throw new BadGatewayException(
          'Le service IA est temporairement indisponible.',
        );
      }

      let message = this.extractMessageFromWebhookBody(body);
      if (!message && typeof rawText === 'string' && rawText.trim() && !rawText.trim().startsWith('{')) {
        message = rawText.trim();
      }

      if (!message) {
        this.logger.warn(
          'Webhook IA: réponse vide — repli sur une reformulation locale.',
        );
        message = this.fallbackRewrite(text);
      }

      if (!message) {
        throw new BadGatewayException(
          'Réponse IA invalide (message vide).',
        );
      }

      return message;
    } catch (e: unknown) {
      if (e instanceof BadGatewayException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Erreur appel webhook IA: ${msg}`);
      const fallback = this.fallbackRewrite(text);
      if (fallback) {
        this.logger.warn('Repli local après échec webhook IA.');
        return fallback;
      }
      throw new BadGatewayException('Impossible de générer le message IA.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
