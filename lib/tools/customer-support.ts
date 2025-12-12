/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from '../state';

export const customerSupportTools: FunctionCall[] = [
  {
    name: 'claim_refund',
    description: 'Starts the refund process for a voucher, collecting necessary details from the user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        voucherId: {
          type: 'STRING',
          description: 'The ID of the voucher to be returned.',
        },
        reason: {
          type: 'STRING',
          description: 'The reason the user is asking for a refund.',
        },
      },
      required: ['voucherId', 'reason'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'speak_to_representative',
    description: 'Escalates the conversation to a human customer support representative.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: {
          type: 'STRING',
          description: 'A brief summary of the user\'s issue for the representative.',
        },
      },
      required: ['reason'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'get_voucher_status',
    description:
      "Gets the status of a voucher using either the voucher ID or the customer's email address. Ask for one of these if not provided.",
    parameters: {
      type: 'OBJECT',
      properties: {
        voucherId: {
          type: 'STRING',
          description: 'The ID of the voucher to check.',
        },
        customerEmail: {
          type: 'STRING',
          description: 'The email of the customer who owns the voucher.',
        },
      },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'insert_daily_report',
    description:
      "Inserts a daily sales report for an ambassador. The report includes the total number of vouchers issued, a breakdown of vouchers issued through partnerships, and any notes on issues encountered.",
    parameters: {
      type: 'OBJECT',
      properties: {
        issuedVouchers: {
          type: 'NUMBER',
          description: 'Total number of vouchers issued today.',
        },
        partnershipVouchers: {
          type: 'ARRAY',
          description: 'A list of vouchers issued in partnership.',
          items: {
            type: 'OBJECT',
            properties: {
              partnerName: {
                type: 'STRING',
                description: 'The name of the partner.',
              },
              voucherCount: {
                type: 'NUMBER',
                description: 'The number of vouchers issued with this partner.',
              },
            },
            required: ['partnerName', 'voucherCount'],
          },
        },
        issuesNote: {
          type: 'STRING',
          description:
            'An optional note about any issues or problems encountered during the day.',
        },
      },
      required: ['issuedVouchers'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];