import { z } from 'zod';

export const scanFormSchema = z.object({
  name: z.string().min(1, 'Scan name is required'),
  targets: z.string().min(1, 'At least one target URL is required'),
  tool: z.enum(['ffuf', 'nmap', 'zap', 'wpscan', 'sqlmap']),
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

