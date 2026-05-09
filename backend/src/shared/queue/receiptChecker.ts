/**
 * Expo Push Receipt Checker
 *
 * Expo push is a two-step process:
 *   1. Send messages → receive Ticket IDs (done by the queue)
 *   2. After ~15 min → query receipts using Ticket IDs to check actual delivery
 *
 * This module runs as a background CRON (setInterval) that:
 *   - Collects push tickets older than 15 minutes from the DB
 *   - Queries the Expo Receipt API
 *   - Deletes Device records for any token that returned "DeviceNotRegistered"
 *   - Cleans up checked PushTicket records
 */

import { prisma } from '../db/prisma.js';

const RECEIPT_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

interface ExpoReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'MessageTooBig' | 'MessageRateExceeded' | 'InvalidCredentials';
  };
}

let checkInterval: ReturnType<typeof setInterval> | null = null;

export const receiptChecker = {
  /**
   * Start the background CRON job.
   * Call once on server startup.
   */
  start(): void {
    if (checkInterval) return; // already running
    console.log('[ReceiptChecker] Started — checking every 15 minutes');

    // First run after 15 minutes (give Expo time to process)
    checkInterval = setInterval(() => {
      this.checkReceipts().catch((err) =>
        console.error('[ReceiptChecker] Unhandled error:', err),
      );
    }, RECEIPT_CHECK_INTERVAL_MS);
  },

  stop(): void {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  },

  /**
   * Core logic: fetch pending tickets, query Expo, handle errors.
   */
  async checkReceipts(): Promise<void> {
    console.log('[ReceiptChecker] Running receipt check...');

    // Fetch push tickets older than 15 minutes
    const cutoff = new Date(Date.now() - RECEIPT_CHECK_INTERVAL_MS);
    const tickets = await prisma.pushTicket.findMany({
      where: { createdAt: { lte: cutoff } },
      take: 100, // Expo limits receipt queries to 100 per request
    });

    if (tickets.length === 0) {
      console.log('[ReceiptChecker] No pending tickets to check');
      return;
    }

    const ticketIds = tickets.map((t) => t.ticketId);

    let receipts: Record<string, ExpoReceipt> = {};
    try {
      const response = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: ticketIds }),
      });

      if (!response.ok) {
        console.error('[ReceiptChecker] Expo receipt API error:', response.status);
        return;
      }

      const data = await response.json() as { data: Record<string, ExpoReceipt> };
      receipts = data.data ?? {};
    } catch (err) {
      console.error('[ReceiptChecker] Failed to query Expo receipts:', err);
      return;
    }

    // Process each receipt
    const deviceIdsToDelete: string[] = [];
    const ticketIdsToDelete: string[] = tickets.map((t) => t.ticketId);

    for (const [ticketId, receipt] of Object.entries(receipts)) {
      if (receipt.status === 'error') {
        const errorCode = receipt.details?.error;
        console.warn(`[ReceiptChecker] Ticket ${ticketId} error: ${errorCode} — ${receipt.message}`);

        if (errorCode === 'DeviceNotRegistered') {
          // Find the device linked to this ticket and mark it for deletion
          const ticket = tickets.find((t) => t.ticketId === ticketId);
          if (ticket?.deviceId) {
            deviceIdsToDelete.push(ticket.deviceId);
          }
        }
      }
    }

    // Delete stale devices (unregistered tokens)
    if (deviceIdsToDelete.length > 0) {
      await prisma.device.deleteMany({
        where: { id: { in: deviceIdsToDelete } },
      });
      console.log(`[ReceiptChecker] Removed ${deviceIdsToDelete.length} stale device(s)`);
    }

    // Clean up processed tickets
    await prisma.pushTicket.deleteMany({
      where: { ticketId: { in: ticketIdsToDelete } },
    });

    console.log(`[ReceiptChecker] Processed ${tickets.length} ticket(s), removed ${deviceIdsToDelete.length} dead token(s)`);
  },
};
