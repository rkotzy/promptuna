export interface ResponseFormat {
  type: 'json_schema' | 'raw_text';
  schemaRef?: string;
}

export interface FallbackTarget {
  provider: string;
  model: string;
}

export interface ModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  json_mode?: boolean;
  top_k?: number;
  candidate_count?: number;
  logit_bias?: Record<string, number>;
}