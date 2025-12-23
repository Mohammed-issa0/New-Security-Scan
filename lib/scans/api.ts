import { ScanPayload } from './types';

const SCAN_SUBMIT_MODE = process.env.NEXT_PUBLIC_SCAN_SUBMIT_MODE || 'direct';
const SHARED_HOST_BASE_URL = process.env.NEXT_PUBLIC_SHARED_HOST_BASE_URL || '';

export const checkCredits = async (): Promise<number> => {
  if (SCAN_SUBMIT_MODE !== 'shared') return Infinity;
  
  try {
    const response = await fetch(`${SHARED_HOST_BASE_URL}/api/credits`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.credits ?? 0;
  } catch (error) {
    console.error('Failed to check credits:', error);
    return 0;
  }
};

export const submitScan = async (payload: ScanPayload) => {
  const url = SCAN_SUBMIT_MODE === 'shared' 
    ? `${SHARED_HOST_BASE_URL}/api/scans`
    : '/jobs/enqueue';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to submit scan');
  }

  return response.json();
};

