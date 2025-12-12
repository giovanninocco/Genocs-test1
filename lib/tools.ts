/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from './state';

export const AVAILABLE_TOOLS: FunctionCall[] = [
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
];
