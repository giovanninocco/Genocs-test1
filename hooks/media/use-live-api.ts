/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GenAILiveClient } from '../../lib/genai-live-client';
import { LiveConnectConfig, Modality, LiveServerToolCall } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import { useLogStore, useSettings } from '@/lib/state';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;

  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;

  volume: number;
};

// Mock API function to simulate fetching voucher status
async function fetchVoucherStatus(args: {
  voucherId?: string;
  customerEmail?: string;
}): Promise<object> {
  console.log('Calling external API for voucher status with:', args);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const { voucherId, customerEmail } = args;

  if (voucherId) {
    if (voucherId.toUpperCase() === 'VOUCHER123') {
      return { status: 'active', discount: '25%', expires: '2024-12-31' };
    }
    if (voucherId.toUpperCase() === 'EXPIRED456') {
      return {
        status: 'expired',
        reason: 'Voucher has passed its expiry date.',
      };
    }
  }

  if (customerEmail) {
    const email = customerEmail.toLowerCase();
    if (email === 'active@example.com') {
      return {
        status: 'active',
        discount: '10% loyalty voucher',
        expires: '2025-01-31',
      };
    }
    if (email === 'expired@example.com') {
      return {
        status: 'expired',
        reason: 'Voucher was a one-time use and has been redeemed.',
      };
    }
  }

  return {
    status: 'not_found',
    message: 'No voucher could be found with the provided details.',
  };
}

// Mock API function to simulate submitting a daily report
async function submitDailyReport(args: {
  issuedVouchers: number;
  partnershipVouchers?: { partnerName: string; voucherCount: number }[];
  issuesNote?: string;
}): Promise<object> {
  console.log('Submitting daily report to external API with:', args);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  if (typeof args.issuedVouchers !== 'number' || args.issuedVouchers < 0) {
    return {
      status: 'error',
      message: 'Invalid number of issued vouchers.',
    };
  }

  // Generate a mock report ID
  const reportId = `report_${new Date().getTime()}`;

  return {
    status: 'success',
    message: `Report successfully submitted with ID: ${reportId}.`,
    reportId: reportId,
    submittedData: args,
  };
}

// FIX: API key is handled directly by the GenAI client.
export function useLiveApi(): UseLiveApiResults {
  const { model } = useSettings();
  // FIX: API key is handled directly by the GenAI client.
  const client = useMemo(() => new GenAILiveClient(model), [model]);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [volume, setVolume] = useState(0);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConnectConfig>({});

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: 'audio-out' }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>('vumeter-out', VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          })
          .catch(err => {
            console.error('Error adding worklet:', err);
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };

    // Bind event listeners
    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('interrupted', stopAudioStreamer);
    client.on('audio', onAudio);

    const onToolCall = async (toolCall: LiveServerToolCall) => {
      const functionResponses: any[] = [];

      // The model can send multiple function calls in a single message.
      // We'll process them concurrently.
      await Promise.all(
        toolCall.functionCalls.map(async fc => {
          // Log the function call trigger
          const triggerMessage = `Triggering function call: **${
            fc.name
          }**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``;
          useLogStore.getState().addTurn({
            role: 'system',
            text: triggerMessage,
            isFinal: true,
          });

          let functionResult: object;

          // Handle specific function calls
          if (fc.name === 'get_voucher_status') {
            try {
              // Call the external API
              functionResult = await fetchVoucherStatus(fc.args);
            } catch (error) {
              console.error(
                'API call for get_voucher_status failed:',
                error,
              );
              functionResult = {
                error: 'An error occurred while fetching the voucher status.',
              };
            }
          } else if (fc.name === 'insert_daily_report') {
            try {
              // Call the submission API
              // FIX: Cast fc.args to the expected type for submitDailyReport to resolve TypeScript error.
              functionResult = await submitDailyReport(
                fc.args as {
                  issuedVouchers: number;
                  partnershipVouchers?: {
                    partnerName: string;
                    voucherCount: number;
                  }[];
                  issuesNote?: string;
                },
              );
            } catch (error) {
              console.error(
                'API call for insert_daily_report failed:',
                error,
              );
              functionResult = {
                error: 'An error occurred while submitting the daily report.',
              };
            }
          } else {
            // For any other function calls, return a simple 'ok' response.
            // This maintains the previous behavior for other tools.
            console.warn(
              `Unhandled function call: ${fc.name}. Returning default 'ok' response.`,
            );
            functionResult = { result: 'ok' };
          }

          // Prepare the response for the model. The result from the API
          // should be stringified to be sent back.
          functionResponses.push({
            id: fc.id,
            name: fc.name,
            response: { result: JSON.stringify(functionResult) },
          });
        }),
      );

      // Log the function call response
      if (functionResponses.length > 0) {
        // We need to be careful here because the response.result is a string.
        // For pretty logging, we should parse it back to an object.
        const parsedResponsesForLogging = functionResponses.map(fr => {
          try {
            return {
              ...fr,
              response: { result: JSON.parse(fr.response.result) },
            };
          } catch (e) {
            return fr; // Keep as is if parsing fails
          }
        });

        const responseMessage = `Function call response:\n\`\`\`json\n${JSON.stringify(
          parsedResponsesForLogging,
          null,
          2,
        )}\n\`\`\``;
        useLogStore.getState().addTurn({
          role: 'system',
          text: responseMessage,
          isFinal: true,
        });
      }

      client.sendToolResponse({ functionResponses: functionResponses });
    };

    client.on('toolcall', onToolCall);

    return () => {
      // Clean up event listeners
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('interrupted', stopAudioStreamer);
      client.off('audio', onAudio);
      client.off('toolcall', onToolCall);
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error('config has not been set');
    }
    client.disconnect();
    await client.connect(config);
  }, [client, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connect,
    connected,
    disconnect,
    volume,
  };
}