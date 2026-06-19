import { z } from 'zod';
import type { ScanProfile } from '@/lib/api/types';

const creditBudgetField = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 1 : Number(value)),
  z.number().int().min(1, 'Credit budget must be at least 1').max(4, 'Credit budget cannot exceed 4')
);

export const profileScanFormSchema = z.object({
  name: z.string().min(1, 'Scan name is required'),
  targetId: z.string().optional(),
  targets: z.string().min(1, 'At least one target URL is required'),
  profile: z.enum(['recon', 'quick', 'standard', 'deep'] as const),
  scopeSigned: z.boolean(),
  creditBudget: creditBudgetField,
  notes: z.string().optional(),
});

export type ProfileScanFormSchemaType = z.infer<typeof profileScanFormSchema>;

export const scanFormSchema = z.object({
  name: z.string().min(1, 'Scan name is required'),
  targetId: z.string().optional(),
  targets: z.string().min(1, 'At least one target URL is required'),
  tool: z.enum(['ffuf', 'nmap', 'zap', 'wpscan', 'sqlmap', 'xss', 'ssl']),
  tool_depth: z.enum(['light', 'deep', 'aggressive']).default('light'),
  scopeSigned: z.boolean(),
  creditBudget: creditBudgetField,
  timeoutMinutes: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().int().min(1, 'Timeout must be at least 1 minute').max(43200, 'Timeout cannot exceed 43200 minutes').optional()
  ),
  notes: z.string().optional(),
  target_config: z.object({
    user_agent: z.string().optional(),
    headers: z.array(
      z.object({
        name: z.string().min(1, 'Header name is required'),
        value: z.string().min(1, 'Header value is required'),
      })
    ),
    authentication: z.object({
      token: z.string().optional(),
      cookies: z.array(
        z.object({
          name: z.string().min(1, 'Cookie name is required'),
          value: z.string().min(1, 'Cookie value is required'),
        })
      ),
    }),
  }),
  zap_config: z.object({
    'scan-type': z.enum(['baseline', 'full', 'api']),
    ajax: z.boolean(),
  }).optional(),
  ffuf_config: z.object({
    wordlist: z.string().min(1, 'Wordlist is required'),
    recursion: z.boolean(),
    mc: z.string().optional(),
    fc: z.string().optional(),
  }).optional(),
  extra_args: z.string().optional(),
  has_captcha: z.boolean().default(false),
});

export type ScanFormSchemaType = z.infer<typeof scanFormSchema>;

export const DEFAULT_PROFILES: Array<{
  name: ScanProfile;
  display: string;
  defaultCredits: number;
  description: string;
}> = [
  { name: 'recon', display: 'Recon', defaultCredits: 1, description: 'Light footprint discovery' },
  { name: 'quick', display: 'Quick', defaultCredits: 1, description: 'Fast baseline security check' },
  { name: 'standard', display: 'Standard', defaultCredits: 2, description: 'Balanced coverage for most apps' },
  { name: 'deep', display: 'Deep', defaultCredits: 3, description: 'Maximum automated coverage' },
];
